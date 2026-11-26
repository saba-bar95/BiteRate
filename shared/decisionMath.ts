import type { City, LocalBaselinePrices } from "./types.ts";
import { convertAmount } from "./pulseMath.ts";

export type NeighborhoodTier = "budget" | "mid" | "premium";
export type ShortlistRankMode = "pp" | "wage" | "dish";

export type CityPriceOverrides = {
  dishPrice?: number;
  burgerMeal?: number;
  cappuccino?: number;
  transitTicket?: number;
  oneBedRentCenter?: number;
  avgMonthlyNetSalary?: number;
};

export const TIER_MULTIPLIERS: Record<NeighborhoodTier, number> = {
  budget: 0.75,
  mid: 1,
  premium: 1.35,
};

function finite(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function safePos(n: number, fallback = 0): number {
  const v = finite(n, fallback);
  return v > 0 ? v : fallback;
}

export function normalizeTier(tier: unknown): NeighborhoodTier {
  if (tier === "budget" || tier === "premium") return tier;
  return "mid";
}

export function neighborhoodTier(
  prices: LocalBaselinePrices,
  tier: NeighborhoodTier | string,
): LocalBaselinePrices {
  const t = normalizeTier(tier);
  const m = TIER_MULTIPLIERS[t];
  return {
    burgerMeal: safePos(prices.burgerMeal) * m,
    cappuccino: safePos(prices.cappuccino) * m,
    transitTicket: safePos(prices.transitTicket) * m,
    oneBedRentCenter: safePos(prices.oneBedRentCenter) * m,
    avgMonthlyNetSalary: safePos(prices.avgMonthlyNetSalary),
  };
}

export function applyPriceOverrides(
  city: City,
  overrides?: CityPriceOverrides | null,
  tier: NeighborhoodTier | string = "mid",
): City {
  const base = neighborhoodTier(city.localBaselinePrices, tier);
  const o = overrides ?? {};
  const dishPrice = safePos(
    o.dishPrice ?? city.signatureDish.localPrice,
    city.signatureDish.localPrice,
  );
  return {
    ...city,
    signatureDish: {
      ...city.signatureDish,
      localPrice: dishPrice > 0 ? dishPrice : city.signatureDish.localPrice,
    },
    localBaselinePrices: {
      burgerMeal: safePos(o.burgerMeal ?? base.burgerMeal, base.burgerMeal),
      cappuccino: safePos(o.cappuccino ?? base.cappuccino, base.cappuccino),
      transitTicket: safePos(
        o.transitTicket ?? base.transitTicket,
        base.transitTicket,
      ),
      oneBedRentCenter: safePos(
        o.oneBedRentCenter ?? base.oneBedRentCenter,
        base.oneBedRentCenter,
      ),
      avgMonthlyNetSalary: safePos(
        o.avgMonthlyNetSalary ?? base.avgMonthlyNetSalary,
        base.avgMonthlyNetSalary,
      ),
    },
  };
}

export type ShouldGoFactor = {
  id: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type ShouldGoResult = {
  score: number;
  verdict: "go" | "lean-go" | "maybe" | "wait";
  headline: string;
  factors: ShouldGoFactor[];
};

export function weatherComfortFromTempC(tempC: number | null | undefined): number {
  const t = finite(tempC, NaN);
  if (!Number.isFinite(t)) return 55;
  // Comfort peaks around 18–24°C
  const dist = Math.abs(t - 21);
  return clamp(100 - dist * 4, 10, 100);
}

export function shouldGoScore(input: {
  ppIndex?: number | null;
  fxChange30dPct?: number | null;
  weatherComfort?: number | null;
  tripDailyUsd?: number | null;
}): ShouldGoResult {
  const pp = clamp(finite(input.ppIndex, 50), 0, 200);
  const fx = finite(input.fxChange30dPct, 0);
  const weather = clamp(finite(input.weatherComfort, 55), 0, 100);
  const daily = Math.max(0, finite(input.tripDailyUsd, 80));

  const ppScore = clamp((pp / 100) * 70 + 15, 0, 100);
  // Negative FX change = destination currency cheaper for visitor → good
  const fxScore = clamp(50 - fx * 4, 0, 100);
  const costScore = clamp(100 - daily * 0.55, 5, 100);

  const factors: ShouldGoFactor[] = [
    {
      id: "pp",
      label: "Purchasing power",
      score: Math.round(ppScore),
      weight: 0.35,
      detail: `PP index ${Math.round(pp)} vs a 100 baseline.`,
    },
    {
      id: "fx",
      label: "FX tailwind",
      score: Math.round(fxScore),
      weight: 0.25,
      detail:
        fx === 0
          ? "No 30-day FX move on file."
          : `${fx > 0 ? "+" : ""}${fx.toFixed(1)}% over 30 days (negative helps visitors).`,
    },
    {
      id: "weather",
      label: "Weather comfort",
      score: Math.round(weather),
      weight: 0.2,
      detail: `Comfort score ${Math.round(weather)}/100 from current conditions.`,
    },
    {
      id: "cost",
      label: "Daily trip cost",
      score: Math.round(costScore),
      weight: 0.2,
      detail: `~$${Math.round(daily)}/day estimated all-in.`,
    },
  ];

  const score = clamp(
    Math.round(
      factors.reduce((sum, f) => sum + f.score * f.weight, 0),
    ),
    0,
    100,
  );

  let verdict: ShouldGoResult["verdict"] = "maybe";
  let headline = "Mixed signals — timing is flexible.";
  if (score >= 75) {
    verdict = "go";
    headline = "Strong window — purchasing power and conditions line up.";
  } else if (score >= 60) {
    verdict = "lean-go";
    headline = "Lean go — a few factors look favorable.";
  } else if (score < 40) {
    verdict = "wait";
    headline = "Consider waiting — cost or FX looks less friendly.";
  }

  return { score, verdict, headline, factors };
}

export type RelocateVsVisitResult = {
  visitTotalUsd: number;
  relocateTotalUsd: number;
  visitDailyUsd: number;
  monthlyLocalUsd: number;
  daysVisit: number;
  monthsStay: number;
  breakEvenDays: number | null;
  cheaper: "visit" | "relocate" | "similar";
  narrative: string;
};

export function relocateVsVisit(input: {
  monthlyLocalUsd?: number | null;
  tripDailyUsd?: number | null;
  daysVisit?: number | null;
  monthsStay?: number | null;
}): RelocateVsVisitResult {
  const monthly = Math.max(0, finite(input.monthlyLocalUsd, 0));
  const daily = Math.max(0, finite(input.tripDailyUsd, 0));
  const daysVisit = clamp(Math.round(finite(input.daysVisit, 7)), 1, 365);
  const monthsStay = clamp(finite(input.monthsStay, 1), 0.25, 36);

  const visitTotalUsd = daily * daysVisit;
  const relocateTotalUsd = monthly * monthsStay;
  const breakEvenDays =
    daily > 0 ? Math.round((monthly * monthsStay) / daily) : null;

  let cheaper: RelocateVsVisitResult["cheaper"] = "similar";
  const delta = relocateTotalUsd - visitTotalUsd;
  if (Math.abs(delta) < Math.max(50, visitTotalUsd * 0.05)) cheaper = "similar";
  else if (delta > 0) cheaper = "visit";
  else cheaper = "relocate";

  const narrative =
    cheaper === "visit"
      ? `A ${daysVisit}-day visit (~$${Math.round(visitTotalUsd)}) undercuts ${monthsStay} mo living (~$${Math.round(relocateTotalUsd)}).`
      : cheaper === "relocate"
        ? `Staying ${monthsStay} mo (~$${Math.round(relocateTotalUsd)}) beats a ${daysVisit}-day visit (~$${Math.round(visitTotalUsd)}) on this budget model.`
        : `Visit and relocate land in a similar band for these inputs.`;

  return {
    visitTotalUsd,
    relocateTotalUsd,
    visitDailyUsd: daily,
    monthlyLocalUsd: monthly,
    daysVisit,
    monthsStay,
    breakEvenDays,
    cheaper,
    narrative,
  };
}

export type RankedCity = {
  city: City;
  score: number;
  detail: string;
};

export function rankShortlist(
  cities: City[],
  mode: ShortlistRankMode | string,
  fxRates: Record<string, number> = {},
): RankedCity[] {
  const list = Array.isArray(cities) ? cities.filter(Boolean) : [];
  const m: ShortlistRankMode =
    mode === "wage" || mode === "dish" ? mode : "pp";

  const scored = list.map((city) => {
    const rentUsd = convertAmount(
      safePos(city.localBaselinePrices.oneBedRentCenter),
      city.currencyCode,
      "USD",
      fxRates,
    );
    const salaryUsd = convertAmount(
      safePos(city.localBaselinePrices.avgMonthlyNetSalary),
      city.currencyCode,
      "USD",
      fxRates,
    );
    const dishUsd = convertAmount(
      safePos(city.signatureDish.localPrice, 1),
      city.currencyCode,
      "USD",
      fxRates,
    );

    if (m === "wage") {
      const stretch = rentUsd > 0 ? salaryUsd / rentUsd : 0;
      return {
        city,
        score: stretch,
        detail: `Wage covers rent ${stretch.toFixed(2)}×`,
      };
    }
    if (m === "dish") {
      const portions = dishUsd > 0 ? 100 / dishUsd : 0;
      return {
        city,
        score: portions,
        detail: `~$100 ≈ ${portions.toFixed(1)} ${city.signatureDish.unitLabel}s`,
      };
    }
    // pp: salary relative to rent + dish value
    const pp =
      (salaryUsd > 0 ? salaryUsd / Math.max(rentUsd, 1) : 0) * 40 +
      (dishUsd > 0 ? 20 / dishUsd : 0) * 10;
    return {
      city,
      score: pp,
      detail: `PP blend ${pp.toFixed(1)}`,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

function climateBand(lat: number): number {
  const a = Math.abs(finite(lat, 0));
  if (a < 15) return 0;
  if (a < 30) return 1;
  if (a < 45) return 2;
  if (a < 60) return 3;
  return 4;
}

export function similarCities(
  seed: City | null | undefined,
  catalog: City[],
  n = 6,
): City[] {
  if (!seed || !Array.isArray(catalog)) return [];
  const limit = clamp(Math.round(finite(n, 6)), 1, 20);
  const seedBand = climateBand(seed.lat);
  const seedDishUsdApprox = safePos(seed.signatureDish.localPrice, 1);

  const scored = catalog
    .filter((c) => c && c.slug !== seed.slug)
    .map((c) => {
      let score = 0;
      if (c.currencyCode === seed.currencyCode) score += 3;
      if (c.country === seed.country) score += 2;
      if (c.iso2 === seed.iso2) score += 1;
      score += 2 - Math.min(2, Math.abs(climateBand(c.lat) - seedBand));
      const dishDelta = Math.abs(
        safePos(c.signatureDish.localPrice, 1) - seedDishUsdApprox,
      );
      score += clamp(2 - dishDelta / Math.max(seedDishUsdApprox, 1), 0, 2);
      const calDelta = Math.abs(
        finite(c.signatureDish.caloriesApprox) -
          finite(seed.signatureDish.caloriesApprox),
      );
      score += clamp(1 - calDelta / 800, 0, 1);
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.c);
}

export type MonthHint = {
  month: number;
  label: string;
  comfort: number;
  fxFriendly: number;
  note: string;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function seasonalityHints(
  lat: number,
  fxHistory: Array<{ date: string; rate: number }> = [],
): {
  months: MonthHint[];
  bestMonths: number[];
  fxNote: string;
} {
  const absLat = Math.abs(finite(lat, 40));
  const southern = finite(lat, 0) < 0;

  const rates = (Array.isArray(fxHistory) ? fxHistory : [])
    .map((p) => finite(p.rate, NaN))
    .filter((r) => Number.isFinite(r) && r > 0);
  const avgRate =
    rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const latest = rates.length ? rates[rates.length - 1]! : null;
  const fxFriendlyBoost =
    avgRate && latest ? clamp(50 + ((latest - avgRate) / avgRate) * 200, 20, 90) : 50;

  const months: MonthHint[] = MONTH_LABELS.map((label, i) => {
    const month = i + 1;
    // Shift seasons for southern hemisphere
    const seasonMonth = southern ? ((month + 5) % 12) + 1 : month;
    // Temperate comfort: spring/fall high; tropics flatter
    let comfort = 55;
    if (absLat < 20) {
      comfort = seasonMonth >= 5 && seasonMonth <= 10 ? 45 : 70;
    } else if (absLat < 35) {
      comfort = [3, 4, 5, 10, 11].includes(seasonMonth)
        ? 80
        : seasonMonth >= 6 && seasonMonth <= 8
          ? 55
          : 60;
    } else {
      comfort = [5, 6, 7, 8, 9].includes(seasonMonth)
        ? 78
        : [3, 4, 10].includes(seasonMonth)
          ? 70
          : 40;
    }
    const fxFriendly = Math.round(fxFriendlyBoost);
    const blended = Math.round(comfort * 0.65 + fxFriendly * 0.35);
    return {
      month,
      label,
      comfort: Math.round(comfort),
      fxFriendly,
      note:
        blended >= 70
          ? "Favorable window"
          : blended >= 50
            ? "Mixed"
            : "Less ideal",
    };
  });

  const bestMonths = [...months]
    .sort(
      (a, b) =>
        b.comfort * 0.65 +
        b.fxFriendly * 0.35 -
        (a.comfort * 0.65 + a.fxFriendly * 0.35),
    )
    .slice(0, 3)
    .map((m) => m.month);

  return {
    months,
    bestMonths,
    fxNote:
      avgRate && latest
        ? `FX vs recent average: ${(((latest - avgRate) / avgRate) * 100).toFixed(1)}%.`
        : "FX history unavailable — seasonality uses climate heuristics only.",
  };
}

export function explainDishMetric(input: {
  dishName: string;
  unitLabel: string;
  localPrice: number;
  budget: number;
  budgetInLocal: number;
  homeCurrency: string;
  localCurrency: string;
  portions: number;
  overridden?: boolean;
}): string {
  const price = safePos(input.localPrice);
  const portions = finite(input.portions, price > 0 ? input.budgetInLocal / price : 0);
  const src = input.overridden ? "your override" : "curated seed price";
  return `${input.budget} ${input.homeCurrency} → ~${finite(input.budgetInLocal).toFixed(2)} ${input.localCurrency} at live FX, ÷ ${price} ${input.localCurrency}/${input.unitLabel} (${src}) ≈ ${portions.toFixed(1)} ${input.dishName}.`;
}

export function explainBasketItem(input: {
  label: string;
  fromLocal: number;
  toLocal: number;
  homeCurrency: string;
  deltaPct: number;
}): string {
  return `${input.label}: ${finite(input.fromLocal).toFixed(2)} vs ${finite(input.toLocal).toFixed(2)} in ${input.homeCurrency} terms (${finite(input.deltaPct) >= 0 ? "+" : ""}${finite(input.deltaPct).toFixed(1)}%). Seed baselines × FX.`;
}

export type FreshnessBadge = {
  id: string;
  label: string;
  tone: "ok" | "warn" | "muted";
  detail: string;
};

export function freshnessMeta(input: {
  fxAsOf?: string | null;
  colSource?: "seed" | "numbeo" | string | null;
  seedNote?: string | null;
  fxStatus?: string | null;
}): FreshnessBadge[] {
  const badges: FreshnessBadge[] = [];
  if (input.fxAsOf) {
    const t = Date.parse(input.fxAsOf);
    const ageH = Number.isFinite(t)
      ? (Date.now() - t) / 3_600_000
      : Number.POSITIVE_INFINITY;
    badges.push({
      id: "fx",
      label: Number.isFinite(ageH) && ageH < 48 ? "FX fresh" : "FX dated",
      tone:
        input.fxStatus === "unavailable"
          ? "warn"
          : ageH < 48
            ? "ok"
            : "warn",
      detail: `FX as of ${input.fxAsOf}`,
    });
  } else {
    badges.push({
      id: "fx",
      label: "FX offline",
      tone: "warn",
      detail: "No FX timestamp — using fallback rates if any.",
    });
  }

  const col = input.colSource || "seed";
  badges.push({
    id: "col",
    label: col === "numbeo" ? "Live CoL" : "Seed prices",
    tone: col === "numbeo" ? "ok" : "muted",
    detail:
      input.seedNote ||
      (col === "numbeo"
        ? "Numbeo enrichment available."
        : "Baselines are curated seed data."),
  });

  return badges;
}

export const COMPARE_PRESETS = [
  {
    id: "weekend-100",
    label: "$100 weekend",
    description: "Flat $100 in a foodie destination",
    from: "new-york",
    to: "tbilisi",
    budget: 100,
    mode: "flat" as const,
  },
  {
    id: "remote-stretch",
    label: "Remote stretch",
    description: "Hourly wage stretch abroad",
    from: "san-francisco",
    to: "lisbon",
    budget: 45,
    mode: "hourly" as const,
  },
  {
    id: "foodie-crawl",
    label: "Foodie crawl",
    description: "Tokyo ramen vs Mexico City tacos energy",
    from: "tokyo",
    to: "mexico-city",
    budget: 80,
    mode: "flat" as const,
  },
  {
    id: "caucasus",
    label: "Caucasus hop",
    description: "Tbilisi vs Yerevan purchasing power",
    from: "tbilisi",
    to: "yerevan",
    budget: 100,
    mode: "flat" as const,
  },
] as const;

export function estimateTripDailyUsd(input: {
  rentMonthlyLocal: number;
  burgerLocal: number;
  transitLocal: number;
  dishLocal: number;
  currency: string;
  fxRates: Record<string, number>;
}): number {
  const lodging =
    convertAmount(
      safePos(input.rentMonthlyLocal) / 30,
      input.currency,
      "USD",
      input.fxRates,
    ) || 0;
  const meals =
    convertAmount(
      safePos(input.burgerLocal) * 2,
      input.currency,
      "USD",
      input.fxRates,
    ) || 0;
  const transit =
    convertAmount(
      safePos(input.transitLocal) * 2,
      input.currency,
      "USD",
      input.fxRates,
    ) || 0;
  const dish =
    convertAmount(
      safePos(input.dishLocal),
      input.currency,
      "USD",
      input.fxRates,
    ) || 0;
  return Math.max(0, lodging + meals + transit + dish);
}

export function estimateMonthlyLocalUsd(input: {
  rentMonthlyLocal: number;
  salaryLocal?: number;
  burgerLocal: number;
  currency: string;
  fxRates: Record<string, number>;
}): number {
  const rent = convertAmount(
    safePos(input.rentMonthlyLocal),
    input.currency,
    "USD",
    input.fxRates,
  );
  const food = convertAmount(
    safePos(input.burgerLocal) * 60,
    input.currency,
    "USD",
    input.fxRates,
  );
  return Math.max(0, rent + food);
}
