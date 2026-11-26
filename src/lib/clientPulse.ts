import {
  buildBasket,
  buildDishPower,
  convertAmount,
  localTimeFor,
  purchasingPowerScore,
} from "@shared/pulseMath";
import type {
  CitiesListResponse,
  City,
  CityPulse,
  CountryMeta,
  FxQuote,
  MacroContext,
  PulseResponse,
  PurchasingPowerScore,
  SourcesStatus,
  WeatherSnapshot,
  WikiDishSummary,
} from "@shared/types";

async function citiesModule() {
  return import("@shared/cities");
}
async function getCity(slug: string) {
  const m = await citiesModule();
  return m.getCity(slug);
}
async function listCities() {
  const m = await citiesModule();
  return m.listCities();
}
async function cityStats() {
  const m = await citiesModule();
  return m.cityStats();
}

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  61: "Slight rain",
  63: "Rain",
  71: "Slight snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function getUsdRates(): Promise<{
  rates: Record<string, number>;
  status: SourcesStatus["fx"];
}> {
  try {
    const raw = await fetchJson<{
      date?: string;
      usd?: Record<string, number>;
    }>(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    );
    const rates: Record<string, number> = { USD: 1 };
    for (const [k, v] of Object.entries(raw.usd ?? {})) {
      rates[k.toUpperCase()] = Number(v);
    }
    return { rates, status: "ok" };
  } catch {
    return { rates: { USD: 1 }, status: "unavailable" };
  }
}

async function getFx(
  from: string,
  to: string,
): Promise<{
  quote: FxQuote | null;
  status: SourcesStatus["fx"];
}> {
  const base = from.toUpperCase();
  const quote = to.toUpperCase();
  if (base === quote) {
    return {
      quote: {
        from: base,
        to: quote,
        rate: 1,
        inverse: 1,
        asOf: new Date().toISOString().slice(0, 10),
        provider: "fawaz",
        history30d: [],
        change30dPct: 0,
      },
      status: "ok",
    };
  }

  try {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - 30);
    const startIso = start.toISOString().slice(0, 10);
    try {
      const latest = await fetchJson<{
        date: string;
        rates: Record<string, number>;
      }>(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`);
      const series = await fetchJson<{
        rates: Record<string, Record<string, number>>;
      }>(
        `https://api.frankfurter.dev/v1/${startIso}..?base=${base}&symbols=${quote}`,
      );
      const rate = latest.rates[quote];
      if (!rate) throw new Error("missing frankfurter rate");
      const history30d = Object.entries(series.rates)
        .map(([date, rates]) => ({ date, rate: rates[quote] }))
        .filter((p) => typeof p.rate === "number")
        .sort((a, b) => a.date.localeCompare(b.date));
      const first = history30d[0]?.rate;
      return {
        quote: {
          from: base,
          to: quote,
          rate,
          inverse: 1 / rate,
          asOf: latest.date,
          provider: "frankfurter",
          history30d,
          change30dPct:
            first && first !== 0 ? ((rate - first) / first) * 100 : null,
        },
        status: "ok",
      };
    } catch {
      const { rates } = await getUsdRates();
      const usdFrom = base === "USD" ? 1 : rates[base];
      const usdTo = quote === "USD" ? 1 : rates[quote];
      if (!usdFrom || !usdTo) throw new Error("missing fawaz rate");
      const rate = usdTo / usdFrom;
      return {
        quote: {
          from: base,
          to: quote,
          rate,
          inverse: 1 / rate,
          asOf: new Date().toISOString().slice(0, 10),
          provider: "fawaz",
          history30d: [{ date: new Date().toISOString().slice(0, 10), rate }],
          change30dPct: null,
        },
        status: "ok",
      };
    }
  } catch {
    return { quote: null, status: "unavailable" };
  }
}

async function getWeather(
  lat: number,
  lon: number,
): Promise<{
  weather: WeatherSnapshot | null;
  status: SourcesStatus["weather"];
}> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh`;
    const json = await fetchJson<{
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    }>(url);
    const code = json.current?.weather_code ?? 0;
    return {
      weather: {
        temperatureC: json.current?.temperature_2m ?? 0,
        weatherCode: code,
        windSpeedKmh: json.current?.wind_speed_10m ?? 0,
        description: WMO[code] ?? "Unknown",
      },
      status: "ok",
    };
  } catch {
    return { weather: null, status: "unavailable" };
  }
}

async function getWiki(slug: string): Promise<{
  wiki: WikiDishSummary | null;
  status: SourcesStatus["wikipedia"];
}> {
  try {
    const json = await fetchJson<{
      title?: string;
      extract?: string;
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    }>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
    );
    const extract = (json.extract ?? "")
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(" ");
    return {
      wiki: {
        title: json.title ?? slug,
        extract,
        thumbnailUrl: json.thumbnail?.source ?? null,
        pageUrl: json.content_urls?.desktop?.page ?? null,
      },
      status: "ok",
    };
  } catch {
    return {
      wiki: {
        title: slug.replace(/_/g, " "),
        extract: "Cultural dish details temporarily unavailable.",
        thumbnailUrl: null,
        pageUrl: null,
      },
      status: "unavailable",
    };
  }
}

async function getCountry(iso2: string): Promise<{
  country: CountryMeta | null;
  status: SourcesStatus["countries"];
}> {
  const code = iso2.toUpperCase();
  const flagPng = `https://flagcdn.com/w320/${code.toLowerCase()}.png`;
  const flagEmoji = String.fromCodePoint(
    ...[...code].map((c) => 127397 + c.charCodeAt(0)),
  );
  try {
    const json = await fetchJson<{
      name?: string;
      flag?: string;
      flags?: { png?: string };
      population?: number;
      languages?: Array<{ name?: string }>;
      capital?: string;
    }>(`https://www.apicountries.com/countries/alpha/${code}`);
    return {
      country: {
        name: json.name ?? code,
        flagEmoji: json.flag ?? flagEmoji,
        flagPng: json.flags?.png ?? flagPng,
        population: json.population ?? null,
        languages: (json.languages ?? [])
          .map((l) => l.name)
          .filter((n): n is string => !!n),
        currencyName: null,
        currencySymbol: null,
        capital: json.capital ?? null,
      },
      status: "ok",
    };
  } catch {
    return {
      country: {
        name: code,
        flagEmoji,
        flagPng,
        population: null,
        languages: [],
        currencyName: null,
        currencySymbol: null,
        capital: null,
      },
      status: "degraded",
    };
  }
}

async function getMacro(
  iso3: string,
): Promise<{ macro: MacroContext | null; status: SourcesStatus["worldBank"] }> {
  try {
    const json = await fetchJson<
      [
        unknown,
        Array<{ value: number | null; date: string } | null> | undefined,
      ]
    >(
      `https://api.worldbank.org/v2/country/${iso3}/indicator/NY.GDP.PCAP.CD?format=json&per_page=10&mrnev=1`,
    );
    const rows = (json[1] ?? []).filter(
      (r): r is { value: number | null; date: string } =>
        !!r && r.value != null,
    );
    const latest = rows[0];
    return {
      macro: {
        gdpPerCapitaUsd: latest?.value ?? null,
        year: latest ? Number(latest.date) : null,
        inflationHint: null,
      },
      status: "ok",
    };
  } catch {
    return { macro: null, status: "unavailable" };
  }
}

async function cityPulse(city: City): Promise<{
  pulse: CityPulse;
  weather: SourcesStatus["weather"];
  countries: SourcesStatus["countries"];
  worldBank: SourcesStatus["worldBank"];
}> {
  const [weather, country, macro] = await Promise.all([
    getWeather(city.lat, city.lon),
    getCountry(city.iso2),
    getMacro(city.iso3),
  ]);
  return {
    pulse: {
      city,
      localTime: localTimeFor(city.timezone),
      weather: weather.weather,
      country: country.country,
      macro: macro.macro,
    },
    weather: weather.status,
    countries: country.status,
    worldBank: macro.status,
  };
}

function worse(
  a: SourcesStatus[keyof SourcesStatus],
  b: SourcesStatus[keyof SourcesStatus],
): SourcesStatus[keyof SourcesStatus] {
  const rank = { unavailable: 0, degraded: 1, cached: 2, ok: 3 } as const;
  return rank[a] <= rank[b] ? a : b;
}

export async function buildClientPulse(params: {
  from: string;
  to: string;
  budget: number;
  mode: "flat" | "hourly";
  wage?: number | null;
}): Promise<PulseResponse> {
  const fromCity = await getCity(params.from);
  const toCity = await getCity(params.to);
  if (!fromCity || !toCity) throw new Error("Unknown city slug");

  const budget =
    params.mode === "hourly" && params.wage != null
      ? params.wage
      : params.budget;

  const [fromPulse, toPulse, fxRes, usdMap, toWiki, fromWiki] =
    await Promise.all([
      cityPulse(fromCity),
      cityPulse(toCity),
      getFx(fromCity.currencyCode, toCity.currencyCode),
      getUsdRates(),
      getWiki(toCity.signatureDish.wikiSlug),
      getWiki(fromCity.signatureDish.wikiSlug),
    ]);

  const rates = usdMap.rates;
  const budgetInTarget = convertAmount(
    budget,
    fromCity.currencyCode,
    toCity.currencyCode,
    rates,
  );
  const dish = buildDishPower(toCity, budgetInTarget, toWiki.wiki);
  const homeDish = buildDishPower(fromCity, budget, fromWiki.wiki);
  const items = buildBasket(fromCity, toCity, fromCity.currencyCode, rates);
  const homeMeal = items.find((b) => b.key === "burgerMeal");
  const purchasingPowerScore =
    homeMeal && homeMeal.toInHomeCurrency > 0
      ? Math.round(
          (homeMeal.fromInHomeCurrency / homeMeal.toInHomeCurrency) * 100,
        )
      : 100;

  const bankFeePct = 0.03;
  const multiPct = 0.005;

  return {
    from: fromPulse.pulse,
    to: toPulse.pulse,
    budget,
    budgetMode: params.mode,
    hourlyWage: params.mode === "hourly" ? budget : null,
    fx: fxRes.quote,
    basket: items,
    dish,
    homeDish,
    purchasingPowerScore,
    affiliate: {
      bankFeePct,
      estimatedBankFee: budget * bankFeePct,
      estimatedMultiCurrencyFee: budget * multiPct,
      savings: budget * (bankFeePct - multiPct),
      savingsPct: (bankFeePct - multiPct) * 100,
    },
    sourcesStatus: {
      fx: worse(fxRes.status, usdMap.status),
      weather: worse(fromPulse.weather, toPulse.weather),
      wikipedia: worse(toWiki.status, fromWiki.status),
      countries: worse(fromPulse.countries, toPulse.countries),
      worldBank: worse(fromPulse.worldBank, toPulse.worldBank),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function buildClientCities(): Promise<CitiesListResponse> {
  const cities = await listCities();
  const { rates, status } = await getUsdRates();
  const leaderboard: PurchasingPowerScore[] = cities
    .map((city) => ({
      slug: city.slug,
      name: city.name,
      country: city.country,
      currencyCode: city.currencyCode,
      score: purchasingPowerScore(city, rates),
      fxGain30d: null,
      dishValueUsd: convertAmount(
        city.signatureDish.localPrice,
        city.currencyCode,
        "USD",
        rates,
      ),
      salaryUsd: convertAmount(
        city.localBaselinePrices.avgMonthlyNetSalary,
        city.currencyCode,
        "USD",
        rates,
      ),
      rentUsd: convertAmount(
        city.localBaselinePrices.oneBedRentCenter,
        city.currencyCode,
        "USD",
        rates,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const stats = await cityStats();
  return {
    cities,
    leaderboard,
    stats: { ...stats, matchedCount: cities.length },
    sourcesStatus: { fx: status },
    generatedAt: new Date().toISOString(),
  };
}
