import {
  estimateMonthlyLocalUsd,
  estimateTripDailyUsd,
  relocateVsVisit,
  seasonalityHints,
  shouldGoScore,
  similarCities,
  weatherComfortFromTempC,
} from "@shared/decisionMath";
import type {
  DecideResponse,
  SeasonalityResponse,
  SimilarCitiesResponse,
} from "@shared/features";
import { purchasingPowerScore } from "@shared/pulseMath";

async function citiesModule() {
  return import("@shared/cities");
}

/** Lightweight client fallback when /api/decide is unreachable. */
export async function buildClientDecide(params: {
  fromSlug: string;
  toSlug: string;
  budget: number;
  mode: "go" | "relocate";
  days: number;
  months: number;
}): Promise<DecideResponse | null> {
  const { getCity } = await citiesModule();
  const from = getCity(params.fromSlug);
  const to = getCity(params.toSlug);
  if (!from || !to) return null;

  const rates: Record<string, number> = { USD: 1 };
  // Approximate if no live FX — identity-ish placeholders won't convert well;
  // use 1:1 USD cross only when currencies match, else leave rates empty so convertAmount returns amount.
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
  const weatherComfort = weatherComfortFromTempC(20);
  const shouldGo = shouldGoScore({
    ppIndex,
    fxChange30dPct: 0,
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
    fxChange30dPct: null,
    weatherComfort,
    fromName: from.name,
    toName: to.name,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildClientSimilar(
  slug: string,
  limit = 6,
): Promise<SimilarCitiesResponse | null> {
  const { getCity, listCities } = await citiesModule();
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

export async function buildClientSeasonality(
  slug: string,
): Promise<SeasonalityResponse | null> {
  const { getCity } = await citiesModule();
  const city = getCity(slug);
  if (!city) return null;
  const hints = seasonalityHints(city.lat, []);
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
