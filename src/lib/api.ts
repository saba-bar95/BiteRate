import type { CitiesListResponse, PulseResponse } from "@shared/types";
import type {
  DecideResponse,
  FxStoryResult,
  SeasonalityResponse,
  SimilarCitiesResponse,
  SpendCompareResult,
  TripPlanInput,
  TripPlanResult,
  UserSyncPayload,
  WageEquivalentResult,
  PriceAlert,
} from "@shared/features";
import {
  buildClientDecide,
  buildClientSeasonality,
  buildClientSimilar,
} from "./clientDecide";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code =
      code ??
      (status === 404
        ? "not_found"
        : status === 429
          ? "rate_limited"
          : "error");
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export type CityCatalogItem = {
  slug: string;
  name: string;
  country: string;
  currencyCode: string;
};

const CITIES_TTL_MS = 5 * 60 * 1000;
let citiesCache: { data: CitiesListResponse; at: number } | null = null;

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body.error) message = body.error;
      if (body.code) code = body.code;
    } catch {
      // ignore
    }
    if (res.status === 429)
      message = message || "Too many requests — try again shortly";
    if (res.status === 404) message = message || "Not found";
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as T;
}

export async function fetchCitiesCatalog(signal?: AbortSignal) {
  const res = await fetch("/api/cities/catalog", { signal });
  return readJson<{
    cities: CityCatalogItem[];
    byCountry: Record<string, Array<{ slug: string; name: string }>>;
    stats: { cityCount: number; countryCount: number; matchedCount: number };
  }>(res);
}

export async function fetchCities(
  signal?: AbortSignal,
): Promise<CitiesListResponse> {
  if (citiesCache && Date.now() - citiesCache.at < CITIES_TTL_MS) {
    return citiesCache.data;
  }
  try {
    const res = await fetch("/api/cities", { signal });
    if (res.ok) {
      const data = (await res.json()) as CitiesListResponse;
      citiesCache = { data, at: Date.now() };
      return data;
    }
  } catch (err) {
    if (isAbortError(err)) throw err;
    // fall through
  }
  const { buildClientCities } = await import("./clientPulse");
  const fallback = await buildClientCities();
  citiesCache = { data: fallback, at: Date.now() };
  return fallback;
}

export async function fetchPulse(
  params: {
    from: string;
    to: string;
    budget: number;
    mode: "flat" | "hourly";
    wage?: number | null;
  },
  signal?: AbortSignal,
): Promise<PulseResponse> {
  const qs = new URLSearchParams({
    budget: String(params.budget),
    mode: params.mode,
  });
  if (params.mode === "hourly" && params.wage != null)
    qs.set("wage", String(params.wage));
  try {
    const res = await fetch(`/api/pulse/${params.from}/${params.to}?${qs}`, {
      signal,
    });
    if (res.ok) return (await res.json()) as PulseResponse;
  } catch (err) {
    if (isAbortError(err)) throw err;
  }
  const { buildClientPulse } = await import("./clientPulse");
  const pulse = await buildClientPulse(params);
  return { ...pulse, degraded: true };
}

export async function fetchCity(slug: string, signal?: AbortSignal) {
  const res = await fetch(`/api/cities/${encodeURIComponent(slug)}`, {
    signal,
  });
  return readJson<{
    city: import("@shared/types").City;
    col: import("@shared/features").ColSnapshot;
  }>(res);
}

export async function fetchTrip(
  plan: TripPlanInput,
  signal?: AbortSignal,
): Promise<TripPlanResult> {
  const res = await fetch("/api/trip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
    signal,
  });
  return readJson<TripPlanResult>(res);
}

export async function fetchEquivalent(
  body: {
    fromSlug: string;
    toSlug: string;
    monthlyNetWage: number;
  },
  signal?: AbortSignal,
): Promise<WageEquivalentResult> {
  const res = await fetch("/api/equivalent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return readJson<WageEquivalentResult>(res);
}

export async function fetchStory(
  from: string,
  to: string,
  budget: number,
  signal?: AbortSignal,
): Promise<FxStoryResult> {
  const res = await fetch(
    `/api/story/${encodeURIComponent(from)}/${encodeURIComponent(to)}?budget=${encodeURIComponent(String(budget))}`,
    { signal },
  );
  return readJson<FxStoryResult>(res);
}

export async function fetchSpend(
  amount: number,
  currency: string,
  signal?: AbortSignal,
): Promise<SpendCompareResult> {
  const qs = new URLSearchParams({
    amount: String(amount),
    currency: currency.toUpperCase(),
  });
  const res = await fetch(`/api/spend?${qs}`, { signal });
  return readJson<SpendCompareResult>(res);
}

export async function fetchMap(signal?: AbortSignal) {
  const res = await fetch("/api/map", { signal });
  return readJson<{
    points: Array<{
      slug: string;
      name: string;
      country: string;
      score: number;
      lat: number;
      lon: number;
      dish: string;
      dishValueUsd: number;
    }>;
  }>(res);
}

export async function checkAlerts(alerts: PriceAlert[], signal?: AbortSignal) {
  const res = await fetch("/api/alerts/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alerts: alerts.slice(0, 20) }),
    signal,
  });
  return readJson<{ alerts: PriceAlert[] }>(res);
}

export async function fetchMe(signal?: AbortSignal) {
  const res = await fetch("/api/me", { signal });
  return readJson<{
    signedIn: boolean;
    simulated?: boolean;
    name?: string;
    email?: string;
  }>(res);
}

export async function pullSync(signal?: AbortSignal) {
  const res = await fetch("/api/sync", { signal });
  return readJson<{ signedIn: boolean; data: UserSyncPayload }>(res);
}

export async function pushSync(data: UserSyncPayload, signal?: AbortSignal) {
  const res = await fetch("/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saved: data.saved.slice(0, 40),
      alerts: data.alerts.slice(0, 20),
      trips: data.trips.slice(0, 20),
      updatedAt: data.updatedAt,
    }),
    signal,
  });
  return readJson<{ ok: boolean; data: UserSyncPayload }>(res);
}

export async function fetchDecide(
  params: {
    from: string;
    to: string;
    budget: number;
    mode: "go" | "relocate";
    days?: number;
    months?: number;
  },
  signal?: AbortSignal,
): Promise<DecideResponse> {
  const qs = new URLSearchParams({
    from: params.from,
    to: params.to,
    budget: String(params.budget),
    mode: params.mode,
    days: String(params.days ?? 7),
    months: String(params.months ?? 1),
  });
  try {
    const res = await fetch(`/api/decide?${qs}`, { signal });
    if (res.ok) return (await res.json()) as DecideResponse;
  } catch (err) {
    if (isAbortError(err)) throw err;
  }
  const fallback = await buildClientDecide({
    fromSlug: params.from,
    toSlug: params.to,
    budget: params.budget,
    mode: params.mode,
    days: params.days ?? 7,
    months: params.months ?? 1,
  });
  if (!fallback) throw new ApiError("Unable to build decision", 500);
  return { ...fallback, degraded: true };
}

export async function fetchSimilarCities(
  slug: string,
  limit = 6,
  signal?: AbortSignal,
): Promise<SimilarCitiesResponse> {
  try {
    const res = await fetch(
      `/api/cities/${encodeURIComponent(slug)}/similar?limit=${limit}`,
      { signal },
    );
    if (res.ok) return (await res.json()) as SimilarCitiesResponse;
  } catch (err) {
    if (isAbortError(err)) throw err;
  }
  const fallback = await buildClientSimilar(slug, limit);
  if (!fallback) throw new ApiError("City not found", 404, "not_found");
  return fallback;
}

export async function fetchSeasonality(
  slug: string,
  signal?: AbortSignal,
): Promise<SeasonalityResponse> {
  try {
    const res = await fetch(
      `/api/cities/${encodeURIComponent(slug)}/seasonality`,
      { signal },
    );
    if (res.ok) return (await res.json()) as SeasonalityResponse;
  } catch (err) {
    if (isAbortError(err)) throw err;
  }
  const fallback = await buildClientSeasonality(slug);
  if (!fallback) throw new ApiError("City not found", 404, "not_found");
  return fallback;
}
