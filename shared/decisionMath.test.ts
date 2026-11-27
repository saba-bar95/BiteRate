import { describe, expect, it } from "vitest";
import type { City } from "./types.ts";
import {
  applyPriceOverrides,
  explainBasketItem,
  explainDishMetric,
  freshnessMeta,
  neighborhoodTier,
  normalizeTier,
  rankShortlist,
  relocateVsVisit,
  seasonalityHints,
  shouldGoScore,
  similarCities,
  weatherComfortFromTempC,
  estimateTripDailyUsd,
  COMPARE_PRESETS,
} from "./decisionMath.ts";

const sample = (over: Partial<City> = {}): City => ({
  slug: "tbilisi",
  name: "Tbilisi",
  country: "Georgia",
  iso2: "GE",
  iso3: "GEO",
  currencyCode: "GEL",
  lat: 41.7,
  lon: 44.8,
  timezone: "Asia/Tbilisi",
  signatureDish: {
    name: "Khinkali",
    wikiSlug: "Khinkali",
    unitLabel: "plate",
    localPrice: 18,
    caloriesApprox: 900,
  },
  localBaselinePrices: {
    burgerMeal: 28,
    cappuccino: 7,
    transitTicket: 1,
    oneBedRentCenter: 1200,
    avgMonthlyNetSalary: 1800,
  },
  ...over,
});

describe("shouldGoScore", () => {
  it("clamps score 0–100 and returns factors", () => {
    const r = shouldGoScore({
      ppIndex: 999,
      fxChange30dPct: -50,
      weatherComfort: 200,
      tripDailyUsd: -10,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.factors).toHaveLength(4);
    expect(r.verdict).toBeTruthy();
  });

  it("handles NaN / missing inputs without throwing", () => {
    const r = shouldGoScore({
      ppIndex: Number.NaN,
      fxChange30dPct: undefined,
      weatherComfort: null,
      tripDailyUsd: Number.POSITIVE_INFINITY,
    });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("leans wait on weak inputs", () => {
    const r = shouldGoScore({
      ppIndex: 10,
      fxChange30dPct: 20,
      weatherComfort: 10,
      tripDailyUsd: 400,
    });
    expect(r.score).toBeLessThan(50);
  });

  it("scores destination vs home purchasing power", () => {
    const absolute = shouldGoScore({
      ppIndex: 80,
      fxChange30dPct: 0,
      weatherComfort: 70,
      tripDailyUsd: 80,
    });
    const relativeWeak = shouldGoScore({
      ppIndex: 80,
      homePpIndex: 120,
      fxChange30dPct: 0,
      weatherComfort: 70,
      tripDailyUsd: 80,
    });
    expect(relativeWeak.score).toBeLessThan(absolute.score);
    expect(relativeWeak.factors.find((f) => f.id === "pp")?.detail).toMatch(
      /vs home/,
    );
  });

  it("penalizes budgets that don't cover the trip", () => {
    const covered = shouldGoScore({
      ppIndex: 80,
      fxChange30dPct: 0,
      weatherComfort: 70,
      tripDailyUsd: 100,
      budgetUsd: 1000,
      visitDays: 7,
    });
    const short = shouldGoScore({
      ppIndex: 80,
      fxChange30dPct: 0,
      weatherComfort: 70,
      tripDailyUsd: 100,
      budgetUsd: 200,
      visitDays: 7,
    });
    expect(short.score).toBeLessThan(covered.score);
    expect(short.factors.find((f) => f.id === "cost")?.detail).toMatch(
      /budget covers/,
    );
  });
});

describe("relocateVsVisit", () => {
  it("computes totals and cheaper side", () => {
    const r = relocateVsVisit({
      monthlyLocalUsd: 1500,
      tripDailyUsd: 120,
      daysVisit: 10,
      monthsStay: 1,
    });
    expect(r.visitTotalUsd).toBe(1200);
    expect(r.relocateTotalUsd).toBe(1500);
    expect(r.cheaper).toBe("visit");
    expect(r.breakEvenDays).toBe(13);
  });

  it("guards zero daily and bad ranges", () => {
    const r = relocateVsVisit({
      monthlyLocalUsd: -5,
      tripDailyUsd: 0,
      daysVisit: 0,
      monthsStay: 100,
    });
    expect(r.daysVisit).toBe(1);
    expect(r.monthsStay).toBeLessThanOrEqual(36);
    expect(r.breakEvenDays).toBeNull();
    expect(r.visitTotalUsd).toBe(0);
  });
});

describe("neighborhoodTier / overrides", () => {
  it("normalizes unknown tier to mid", () => {
    expect(normalizeTier("nope")).toBe("mid");
    expect(normalizeTier("budget")).toBe("budget");
  });

  it("scales prices by tier", () => {
    const mid = neighborhoodTier(sample().localBaselinePrices, "mid");
    const budget = neighborhoodTier(sample().localBaselinePrices, "budget");
    expect(budget.burgerMeal).toBeCloseTo(mid.burgerMeal * 0.75);
    expect(budget.avgMonthlyNetSalary).toBe(mid.avgMonthlyNetSalary);
  });

  it("applies overrides after tier", () => {
    const city = applyPriceOverrides(
      sample(),
      { dishPrice: 22, burgerMeal: 30 },
      "premium",
    );
    expect(city.signatureDish.localPrice).toBe(22);
    expect(city.localBaselinePrices.burgerMeal).toBe(30);
  });

  it("ignores non-positive override prices", () => {
    const city = applyPriceOverrides(sample(), {
      dishPrice: -1,
      burgerMeal: 0,
    });
    expect(city.signatureDish.localPrice).toBe(18);
  });
});

describe("rankShortlist / similarCities", () => {
  const rates = { GEL: 2.7, JPY: 150, MXN: 17 };

  it("ranks empty list safely", () => {
    expect(rankShortlist([], "pp", rates)).toEqual([]);
  });

  it("ranks by dish mode", () => {
    const a = sample({ slug: "a" });
    const b = sample({
      slug: "b",
      currencyCode: "JPY",
      signatureDish: {
        ...sample().signatureDish,
        localPrice: 900,
      },
    });
    const ranked = rankShortlist([a, b], "dish", rates);
    expect(ranked[0]?.city.slug).toBeTruthy();
    expect(ranked).toHaveLength(2);
  });

  it("finds similar cities excluding seed", () => {
    const seed = sample();
    const catalog = [
      seed,
      sample({ slug: "batumi", name: "Batumi", lat: 41.6 }),
      sample({
        slug: "tokyo",
        name: "Tokyo",
        country: "Japan",
        iso2: "JP",
        currencyCode: "JPY",
        lat: 35,
      }),
    ];
    const sim = similarCities(seed, catalog, 2);
    expect(sim.every((c) => c.slug !== "tbilisi")).toBe(true);
    expect(sim.length).toBeLessThanOrEqual(2);
  });

  it("handles null seed", () => {
    expect(similarCities(null, [sample()], 6)).toEqual([]);
  });
});

describe("seasonalityHints", () => {
  it("returns 12 months and bestMonths", () => {
    const s = seasonalityHints(41.7, [
      { date: "2024-01-01", rate: 2.6 },
      { date: "2024-02-01", rate: 2.8 },
    ]);
    expect(s.months).toHaveLength(12);
    expect(s.bestMonths).toHaveLength(3);
    expect(s.fxNote).toContain("FX");
  });

  it("works without fx history", () => {
    const s = seasonalityHints(-33, []);
    expect(s.months[0]?.comfort).toBeGreaterThan(0);
    expect(s.fxNote).toMatch(/unavailable|heuristics/i);
  });
});

describe("explain + freshness", () => {
  it("builds dish explanation", () => {
    const text = explainDishMetric({
      dishName: "Khinkali",
      unitLabel: "plate",
      localPrice: 18,
      budget: 100,
      budgetInLocal: 270,
      homeCurrency: "USD",
      localCurrency: "GEL",
      portions: 15,
      overridden: true,
    });
    expect(text).toContain("override");
    expect(text).toContain("Khinkali");
  });

  it("builds basket explanation", () => {
    expect(
      explainBasketItem({
        label: "Burger",
        fromLocal: 10,
        toLocal: 12,
        homeCurrency: "USD",
        deltaPct: 20,
      }),
    ).toContain("Burger");
  });

  it("freshness badges never throw", () => {
    expect(freshnessMeta({}).length).toBeGreaterThan(0);
    expect(
      freshnessMeta({
        fxAsOf: new Date().toISOString(),
        colSource: "numbeo",
        fxStatus: "ok",
      }).some((b) => b.id === "fx"),
    ).toBe(true);
  });

  it("flags offline estimate and degraded FX", () => {
    const offline = freshnessMeta({ degraded: true });
    expect(offline.some((b) => b.id === "mode" && b.tone === "warn")).toBe(
      true,
    );
    const fxBad = freshnessMeta({
      fxAsOf: new Date().toISOString(),
      fxStatus: "degraded",
    });
    const fxBadge = fxBad.find((b) => b.id === "fx");
    expect(fxBadge?.label).toBe("FX degraded");
    expect(fxBadge?.tone).toBe("warn");
  });
});

describe("helpers", () => {
  it("weather comfort is finite", () => {
    expect(weatherComfortFromTempC(null)).toBeGreaterThan(0);
    expect(weatherComfortFromTempC(21)).toBeGreaterThan(
      weatherComfortFromTempC(40),
    );
  });

  it("estimateTripDailyUsd is non-negative", () => {
    const d = estimateTripDailyUsd({
      rentMonthlyLocal: 1200,
      burgerLocal: 28,
      transitLocal: 1,
      dishLocal: 18,
      currency: "GEL",
      fxRates: { GEL: 2.7 },
    });
    expect(d).toBeGreaterThan(0);
  });

  it("presets are well-formed", () => {
    expect(COMPARE_PRESETS.length).toBeGreaterThan(2);
    for (const p of COMPARE_PRESETS) {
      expect(p.from).toBeTruthy();
      expect(p.to).toBeTruthy();
      expect(p.budget).toBeGreaterThan(0);
    }
  });
});
