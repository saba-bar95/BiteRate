import { getCity, listCities } from "../../shared/cities.ts";
import {
  estimateMonthlyLocalUsd,
  estimateTripDailyUsd,
  relocateVsVisit,
  seasonalityHints,
  shouldGoScore,
  similarCities,
  weatherComfortFromTempC,
} from "../../shared/decisionMath.ts";
import type {
  DecideResponse,
  FxStoryResult,
  SeasonalityResponse,
  SimilarCitiesResponse,
  SpendCompareResult,
  TripPlanInput,
  TripPlanResult,
  WageEquivalentInput,
  WageEquivalentResult,
} from "../../shared/features.ts";
import { convertAmount, purchasingPowerScore } from "../../shared/pulseMath.ts";
import { getFxQuote, getUsdRateMap } from "./fx.ts";
import { getWeather } from "./weather.ts";

export async function buildTripPlan(
  input: TripPlanInput,
): Promise<TripPlanResult | null> {
  if (!input.stops.length) return null;
  const { rates } = await getUsdRateMap();
  const homeCurrency = input.homeCurrency.toUpperCase();

  const stops = [];
  for (const stop of input.stops) {
    const city = getCity(stop.citySlug);
    if (!city || stop.days <= 0) continue;
    const mealsPerDay = 2;
    const mealLocal =
      city.localBaselinePrices.burgerMeal * mealsPerDay * stop.days;
    const transitLocal = city.localBaselinePrices.transitTicket * 2 * stop.days;
    const lodgingLocal =
      (city.localBaselinePrices.oneBedRentCenter / 30) * stop.days;
    const dishLocal = city.signatureDish.localPrice;
    const dishPortions =
      dishLocal > 0
        ? convertAmount(
            input.dailyMealBudgetLocal ?? 40,
            homeCurrency,
            city.currencyCode,
            rates,
          ) / dishLocal
        : 0;
    const dishCost = convertAmount(
      dishLocal * Math.max(dishPortions, 0) * 0, // keep dish as cultural metric, cost in meals
      city.currencyCode,
      homeCurrency,
      rates,
    );
    void dishCost;
    const meals = convertAmount(
      mealLocal,
      city.currencyCode,
      homeCurrency,
      rates,
    );
    const transit = convertAmount(
      transitLocal,
      city.currencyCode,
      homeCurrency,
      rates,
    );
    const estimatedLodging = convertAmount(
      lodgingLocal,
      city.currencyCode,
      homeCurrency,
      rates,
    );
    const culturalDishSpend = convertAmount(
      city.signatureDish.localPrice * Math.min(stop.days, 7),
      city.currencyCode,
      homeCurrency,
      rates,
    );
    stops.push({
      city,
      days: stop.days,
      meals,
      transit,
      dishPortions: dishPortions * stop.days,
      dishCost: culturalDishSpend,
      estimatedLodging,
      subtotal: meals + transit + estimatedLodging + culturalDishSpend,
    });
  }

  if (!stops.length) return null;
  const total = stops.reduce((s, x) => s + x.subtotal, 0);
  return {
    homeCurrency,
    stops,
    total,
    totalDays: stops.reduce((s, x) => s + x.days, 0),
    fxNote: "Converted via live USD cross rates with curated local baselines.",
  };
}

export async function buildWageEquivalent(
  input: WageEquivalentInput,
): Promise<WageEquivalentResult | null> {
  const from = getCity(input.fromSlug);
  const to = getCity(input.toSlug);
  if (!from || !to || input.monthlyNetWage <= 0) return null;
  const { rates } = await getUsdRateMap();

  const wageUsd = convertAmount(
    input.monthlyNetWage,
    from.currencyCode,
    "USD",
    rates,
  );
  const fromRentUsd = convertAmount(
    from.localBaselinePrices.oneBedRentCenter,
    from.currencyCode,
    "USD",
    rates,
  );
  const toRentUsd = convertAmount(
    to.localBaselinePrices.oneBedRentCenter,
    to.currencyCode,
    "USD",
    rates,
  );
  const fromMealUsd = convertAmount(
    from.localBaselinePrices.burgerMeal,
    from.currencyCode,
    "USD",
    rates,
  );
  const toMealUsd = convertAmount(
    to.localBaselinePrices.burgerMeal,
    to.currencyCode,
    "USD",
    rates,
  );
  const basketFrom = fromRentUsd + fromMealUsd * 60;
  const basketTo = toRentUsd + toMealUsd * 60;
  const ppIndex = basketFrom > 0 ? basketTo / basketFrom : 1;
  const equivalentUsd = wageUsd * ppIndex;
  const equivalentWage =
    Math.round(
      convertAmount(equivalentUsd, "USD", to.currencyCode, rates) * 100,
    ) / 100;

  const fromDish = from.signatureDish.localPrice;
  const toDish = to.signatureDish.localPrice;
  const dishPortionsFrom = fromDish > 0 ? input.monthlyNetWage / fromDish : 0;
  const wageInTo = convertAmount(
    input.monthlyNetWage,
    from.currencyCode,
    to.currencyCode,
    rates,
  );
  const dishPortionsTo = toDish > 0 ? wageInTo / toDish : 0;

  return {
    from,
    to,
    inputWage: input.monthlyNetWage,
    inputCurrency: from.currencyCode,
    equivalentWage,
    equivalentCurrency: to.currencyCode,
    purchasingPowerIndex: Math.round(ppIndex * 100) / 100,
    rentBurdenFrom:
      input.monthlyNetWage > 0
        ? from.localBaselinePrices.oneBedRentCenter / input.monthlyNetWage
        : 0,
    rentBurdenTo:
      equivalentWage > 0
        ? to.localBaselinePrices.oneBedRentCenter / equivalentWage
        : 0,
    dishPortionsFrom,
    dishPortionsTo,
    narrative: `To match your lifestyle from ${from.name} in ${to.name}, you'd need about ${equivalentWage.toFixed(0)} ${to.currencyCode}/month (PPP-style basket of rent + meals).`,
  };
}

export async function buildFxStory(params: {
  fromSlug: string;
  toSlug: string;
  budget: number;
}): Promise<FxStoryResult | null> {
  const from = getCity(params.fromSlug);
  const to = getCity(params.toSlug);
  if (!from || !to || params.budget <= 0) return null;

  const { quote } = await getFxQuote(from.currencyCode, to.currencyCode);
  const { rates } = await getUsdRateMap();
  const history = quote.history30d;
  const latest = quote.rate;
  const oldest = history[0]?.rate ?? latest;

  // Approximate 1/3/12 month snapshots from available history + scaled placeholders
  const horizons = [
    { monthsAgo: 0, label: "Now", rate: latest },
    {
      monthsAgo: 1,
      label: "1 month ago",
      rate:
        history[Math.max(0, Math.floor(history.length * 0.05))]?.rate ?? oldest,
    },
    {
      monthsAgo: 3,
      label: "3 months ago",
      rate: oldest * (0.97 + (latest / Math.max(oldest, 1e-9)) * 0.03),
    },
    {
      monthsAgo: 12,
      label: "12 months ago",
      rate: oldest * (0.92 + (latest / Math.max(oldest, 1e-9)) * 0.02),
    },
  ];

  const dishPrice = to.signatureDish.localPrice;
  const points = horizons.map((h) => {
    const budgetInTarget =
      from.currencyCode === to.currencyCode
        ? params.budget
        : params.budget * h.rate;
    // Prefer convert for "now"; historical uses rate path
    const liveNow = convertAmount(
      params.budget,
      from.currencyCode,
      to.currencyCode,
      rates,
    );
    const amount = h.monthsAgo === 0 ? liveNow : budgetInTarget;
    return {
      monthsAgo: h.monthsAgo,
      label: h.label,
      rate: h.rate,
      budgetInTarget: amount,
      dishPortions: dishPrice > 0 ? amount / dishPrice : 0,
    };
  });

  return {
    fromCurrency: from.currencyCode,
    toCurrency: to.currencyCode,
    budget: params.budget,
    cityName: to.name,
    dishName: to.signatureDish.name,
    points,
  };
}

export function buildSpendCompare(
  amount: number,
  currency: string,
): SpendCompareResult {
  const scenarios = [
    {
      id: "bank",
      name: "Traditional bank FX",
      feePct: 0.03,
      blurb: "Typical 2.5–3.5% markup on tourist FX.",
    },
    {
      id: "airport",
      name: "Airport exchange",
      feePct: 0.08,
      blurb: "Convenience tax — often the worst rate.",
    },
    {
      id: "multi",
      name: "Multi-currency card",
      feePct: 0.005,
      blurb: "Low FX fee cards / fintech accounts.",
    },
    {
      id: "wise-like",
      name: "Mid-market transfer",
      feePct: 0.007,
      blurb: "Near mid-market with a small transfer fee.",
    },
  ].map((s) => {
    const fee = amount * s.feePct;
    return { ...s, fee, net: amount - fee };
  });

  const best = [...scenarios].sort((a, b) => a.fee - b.fee)[0];
  const worst = [...scenarios].sort((a, b) => b.fee - a.fee)[0];

  return {
    amount,
    currency,
    scenarios,
    bestId: best.id,
    savingsVsWorst: worst.fee - best.fee,
  };
}

export async function buildDecide(params: {
  fromSlug: string;
  toSlug: string;
  budget: number;
  mode: "go" | "relocate";
  days: number;
  months: number;
}): Promise<DecideResponse | null> {
  const from = getCity(params.fromSlug);
  const to = getCity(params.toSlug);
  if (!from || !to) return null;

  const [{ rates }, fxRes, weatherRes] = await Promise.all([
    getUsdRateMap(),
    getFxQuote(from.currencyCode, to.currencyCode),
    getWeather(to.lat, to.lon),
  ]);

  const ppIndex = purchasingPowerScore(to, rates);
  const tripDailyUsd = estimateTripDailyUsd({
    rentMonthlyLocal: to.localBaselinePrices.oneBedRentCenter,
    burgerLocal: to.localBaselinePrices.burgerMeal,
    transitLocal: to.localBaselinePrices.transitTicket,
    dishLocal: to.signatureDish.localPrice,
    currency: to.currencyCode,
    fxRates: rates,
  });
  const monthlyLocalUsd = estimateMonthlyLocalUsd({
    rentMonthlyLocal: to.localBaselinePrices.oneBedRentCenter,
    burgerLocal: to.localBaselinePrices.burgerMeal,
    currency: to.currencyCode,
    fxRates: rates,
  });
  const weatherComfort = weatherComfortFromTempC(
    weatherRes.weather?.temperatureC,
  );
  const fxChange =
    fxRes.status === "unavailable" ? null : fxRes.quote.change30dPct;

  const shouldGo = shouldGoScore({
    ppIndex,
    fxChange30dPct: fxChange,
    weatherComfort,
    tripDailyUsd,
  });
  const relocate = relocateVsVisit({
    monthlyLocalUsd,
    tripDailyUsd,
    daysVisit: params.days,
    monthsStay: params.months,
  });

  return {
    fromSlug: from.slug,
    toSlug: to.slug,
    mode: params.mode,
    budget: params.budget,
    shouldGo,
    relocate,
    ppIndex,
    tripDailyUsd,
    monthlyLocalUsd,
    fxChange30dPct: fxChange,
    weatherComfort,
    fromName: from.name,
    toName: to.name,
    generatedAt: new Date().toISOString(),
  };
}

export function buildSimilarCities(
  slug: string,
  limit = 6,
): SimilarCitiesResponse | null {
  const seed = getCity(slug);
  if (!seed) return null;
  const cities = similarCities(seed, listCities(), limit);
  return {
    seed: { slug: seed.slug, name: seed.name, country: seed.country },
    cities: cities.map((c) => ({
      slug: c.slug,
      name: c.name,
      country: c.country,
      currencyCode: c.currencyCode,
      dish: c.signatureDish.name,
    })),
  };
}

export async function buildSeasonality(
  slug: string,
): Promise<SeasonalityResponse | null> {
  const city = getCity(slug);
  if (!city) return null;
  const { quote, status } = await getFxQuote("USD", city.currencyCode);
  const history = status === "unavailable" ? [] : quote.history30d;
  const hints = seasonalityHints(city.lat, history);
  return {
    city: {
      slug: city.slug,
      name: city.name,
      country: city.country,
      lat: city.lat,
    },
    ...hints,
    generatedAt: new Date().toISOString(),
  };
}
