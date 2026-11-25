import { cityStats, filterCities, getCity, listCities } from '../../shared/cities.ts'
import type {
  BasketItem,
  CitiesListResponse,
  City,
  CityPulse,
  DishPurchasingPower,
  PulseResponse,
  PurchasingPowerScore,
  SourcesStatus,
} from '../../shared/types.ts'
import { getCountryMeta } from './countries.ts'
import { convertAmount, getFxQuote, getUsdRateMap } from './fx.ts'
import { getWeather } from './weather.ts'
import { getDishSummary } from './wiki.ts'
import { getMacroContext } from './worldbank.ts'

function localTimeFor(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(11, 16)
  }
}

function buildDishPower(
  city: City,
  budgetInLocal: number,
  wiki: DishPurchasingPower['wiki'],
): DishPurchasingPower {
  const price = city.signatureDish.localPrice
  const portions = price > 0 ? budgetInLocal / price : 0
  const wagePortions =
    price > 0 ? city.localBaselinePrices.avgMonthlyNetSalary / price : 0
  return {
    dishName: city.signatureDish.name,
    unitLabel: city.signatureDish.unitLabel,
    localPrice: price,
    visitorPortions: portions,
    visitorUnitsApprox: Math.round(portions * 10) / 10,
    localWagePortions: wagePortions,
    caloriesPerBudget: portions * city.signatureDish.caloriesApprox,
    wiki,
  }
}

function buildBasket(
  from: City,
  to: City,
  homeCurrency: string,
  usdRates: Record<string, number>,
): BasketItem[] {
  const keys: Array<{
    key: keyof City['localBaselinePrices']
    label: string
  }> = [
    { key: 'burgerMeal', label: 'Casual Meal / Burger' },
    { key: 'cappuccino', label: 'Cappuccino' },
    { key: 'transitTicket', label: '1-Way Transit' },
    { key: 'oneBedRentCenter', label: '1BR City-Center Rent' },
    { key: 'avgMonthlyNetSalary', label: 'Median Net Monthly Wage' },
  ]

  return keys.map(({ key, label }) => {
    const fromLocal = from.localBaselinePrices[key]
    const toLocal = to.localBaselinePrices[key]
    const fromInHome = convertAmount(
      fromLocal,
      from.currencyCode,
      homeCurrency,
      usdRates,
    )
    const toInHome = convertAmount(
      toLocal,
      to.currencyCode,
      homeCurrency,
      usdRates,
    )
    // Home vs target: negative = home cheaper (or lower wage), positive = home dearer
    const deltaPct =
      fromInHome === 0 ? 0 : ((fromInHome - toInHome) / fromInHome) * 100
    return {
      key,
      label,
      fromLocal,
      toLocal,
      fromInHomeCurrency: fromInHome,
      toInHomeCurrency: toInHome,
      deltaPct,
    }
  })
}

function purchasingPowerScore(
  city: City,
  usdRates: Record<string, number>,
): number {
  const salaryUsd = convertAmount(
    city.localBaselinePrices.avgMonthlyNetSalary,
    city.currencyCode,
    'USD',
    usdRates,
  )
  const rentUsd = convertAmount(
    city.localBaselinePrices.oneBedRentCenter,
    city.currencyCode,
    'USD',
    usdRates,
  )
  const mealUsd = convertAmount(
    city.localBaselinePrices.burgerMeal,
    city.currencyCode,
    'USD',
    usdRates,
  )
  const dishUsd = convertAmount(
    city.signatureDish.localPrice,
    city.currencyCode,
    'USD',
    usdRates,
  )
  // Higher salary / lower living costs = better score
  const disposable = Math.max(salaryUsd - rentUsd, 1)
  const affordability = disposable / Math.max(mealUsd + dishUsd, 1)
  return Math.round(Math.min(100, Math.max(0, Math.log10(affordability + 1) * 40 + 20)))
}

async function buildCityPulse(city: City): Promise<{
  pulse: CityPulse
  statuses: Partial<SourcesStatus>
}> {
  const [weatherRes, countryRes, macroRes] = await Promise.all([
    getWeather(city.lat, city.lon),
    getCountryMeta(city.iso2),
    getMacroContext(city.iso3),
  ])

  return {
    pulse: {
      city,
      localTime: localTimeFor(city.timezone),
      weather: weatherRes.weather,
      country: countryRes.country,
      macro: macroRes.macro,
    },
    statuses: {
      weather: weatherRes.status,
      countries: countryRes.status,
      worldBank: macroRes.status,
    },
  }
}

function mergeStatus(
  a: SourceStatusLike,
  b: SourceStatusLike,
): SourceStatusLike {
  const rank = { unavailable: 0, degraded: 1, cached: 2, ok: 3 } as const
  if (rank[a] <= rank[b]) return a
  return b
}

type SourceStatusLike = SourcesStatus[keyof SourcesStatus]

export async function buildPulse(
  fromSlug: string,
  toSlug: string,
  budget = 100,
  budgetMode: 'flat' | 'hourly' = 'flat',
  hourlyWage: number | null = null,
): Promise<PulseResponse | null> {
  const fromCity = getCity(fromSlug)
  const toCity = getCity(toSlug)
  if (!fromCity || !toCity) return null

  const effectiveBudget =
    budgetMode === 'hourly' && hourlyWage != null ? hourlyWage : budget

  const [fromPulse, toPulse, fxRes, usdMapRes, toWiki, fromWiki] =
    await Promise.all([
      buildCityPulse(fromCity),
      buildCityPulse(toCity),
      getFxQuote(fromCity.currencyCode, toCity.currencyCode),
      getUsdRateMap(),
      getDishSummary(toCity.signatureDish.wikiSlug),
      getDishSummary(fromCity.signatureDish.wikiSlug),
    ])

  const usdRates = usdMapRes.rates
  const budgetInHome = effectiveBudget
  const budgetInTarget = convertAmount(
    budgetInHome,
    fromCity.currencyCode,
    toCity.currencyCode,
    usdRates,
  )
  const budgetInFromLocal = convertAmount(
    budgetInHome,
    fromCity.currencyCode,
    fromCity.currencyCode,
    usdRates,
  )

  const dish = buildDishPower(toCity, budgetInTarget, toWiki.wiki)
  const homeDish = buildDishPower(fromCity, budgetInFromLocal, fromWiki.wiki)
  const basket = buildBasket(fromCity, toCity, fromCity.currencyCode, usdRates)

  const bankFeePct = 0.03
  const multiPct = 0.005
  const estimatedBankFee = budgetInHome * bankFeePct
  const estimatedMultiCurrencyFee = budgetInHome * multiPct
  const savings = estimatedBankFee - estimatedMultiCurrencyFee

  const sourcesStatus: SourcesStatus = {
    fx: mergeStatus(fxRes.status, usdMapRes.status),
    weather: mergeStatus(
      fromPulse.statuses.weather ?? 'unavailable',
      toPulse.statuses.weather ?? 'unavailable',
    ),
    wikipedia: mergeStatus(toWiki.status, fromWiki.status),
    countries: mergeStatus(
      fromPulse.statuses.countries ?? 'unavailable',
      toPulse.statuses.countries ?? 'unavailable',
    ),
    worldBank: mergeStatus(
      fromPulse.statuses.worldBank ?? 'unavailable',
      toPulse.statuses.worldBank ?? 'unavailable',
    ),
  }

  // Relative score: how much further your money goes in target vs home (meals)
  const homeMeal = basket.find((b) => b.key === 'burgerMeal')
  const purchasingPowerScore =
    homeMeal && homeMeal.toInHomeCurrency > 0
      ? Math.round((homeMeal.fromInHomeCurrency / homeMeal.toInHomeCurrency) * 100)
      : 100

  return {
    from: fromPulse.pulse,
    to: toPulse.pulse,
    budget: budgetInHome,
    budgetMode,
    hourlyWage,
    fx: fxRes.status === 'unavailable' ? null : fxRes.quote,
    basket,
    dish,
    homeDish,
    purchasingPowerScore,
    affiliate: {
      bankFeePct,
      estimatedBankFee,
      estimatedMultiCurrencyFee,
      savings,
      savingsPct: budgetInHome > 0 ? (savings / budgetInHome) * 100 : 0,
    },
    sourcesStatus,
    generatedAt: new Date().toISOString(),
  }
}

export async function buildCitiesList(filters: {
  q?: string
  country?: string
  currency?: string
  iso2?: string
} = {}): Promise<CitiesListResponse> {
  const allCities = listCities()
  const cities = filterCities(filters)
  const { rates, status } = await getUsdRateMap()

  // FX 30d change only for currencies present in the matched set (cached)
  const uniqueCurrencies = [...new Set(cities.map((c) => c.currencyCode))]
  const fxSettled = await Promise.allSettled(
    uniqueCurrencies.map(async (code) => {
      if (code === 'USD') return { code, change: 0 }
      const { quote, status: fxStatus } = await getFxQuote('USD', code)
      return {
        code,
        change: fxStatus === 'unavailable' ? null : quote.change30dPct,
      }
    }),
  )
  const fxGainByCurrency = new Map<string, number | null>()
  for (const result of fxSettled) {
    if (result.status === 'fulfilled') {
      fxGainByCurrency.set(result.value.code, result.value.change)
    }
  }

  const leaderboard: PurchasingPowerScore[] = cities
    .map((city) => {
      const salaryUsd = convertAmount(
        city.localBaselinePrices.avgMonthlyNetSalary,
        city.currencyCode,
        'USD',
        rates,
      )
      const rentUsd = convertAmount(
        city.localBaselinePrices.oneBedRentCenter,
        city.currencyCode,
        'USD',
        rates,
      )
      const dishValueUsd = convertAmount(
        city.signatureDish.localPrice,
        city.currencyCode,
        'USD',
        rates,
      )
      return {
        slug: city.slug,
        name: city.name,
        country: city.country,
        currencyCode: city.currencyCode,
        score: purchasingPowerScore(city, rates),
        fxGain30d: fxGainByCurrency.get(city.currencyCode) ?? null,
        dishValueUsd,
        salaryUsd,
        rentUsd,
      }
    })
    .sort((a, b) => b.score - a.score)

  const stats = cityStats()

  return {
    cities,
    leaderboard,
    stats: {
      ...stats,
      matchedCount: cities.length,
      // keep global totals from full seed even when filtered
      cityCount: allCities.length,
    },
    sourcesStatus: { fx: status },
    generatedAt: new Date().toISOString(),
  }
}
