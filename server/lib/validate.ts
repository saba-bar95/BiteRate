import { getCity } from "../../shared/cities.ts";
import type {
  PriceAlert,
  TripPlanInput,
  UserSyncPayload,
} from "../../shared/features.ts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const MAX_MONEY = 1_000_000_000;
const MAX_SAVED = 40;
const MAX_ALERTS = 20;
const MAX_TRIPS = 20;
const MAX_STOPS = 12;
const MAX_LABEL = 120;
const MAX_STR = 64;

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && SLUG_RE.test(value);
}

export function requireCitySlug(value: unknown): string | null {
  if (!isSlug(value)) return null;
  return getCity(value) ? value : null;
}

export function isCurrency(value: unknown): value is string {
  return typeof value === "string" && CURRENCY_RE.test(value.toUpperCase());
}

export function parseCurrency(value: unknown, fallback = "USD"): string | null {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CURRENCY_RE.test(code) ? code : null;
}

export function parsePositiveNumber(
  value: unknown,
  opts: { min?: number; max?: number; fallback?: number } = {},
): number | null {
  const min = opts.min ?? Number.EPSILON;
  const max = opts.max ?? MAX_MONEY;
  if (value == null && opts.fallback !== undefined) {
    return parseBoundedNumber(opts.fallback, min, max);
  }
  return parseBoundedNumber(value, min, max);
}

export function parseBoundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function clampString(value: unknown, max = MAX_STR): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseTripBody(raw: unknown): TripPlanInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const homeCurrency = parseCurrency(body.homeCurrency, "USD");
  if (!homeCurrency) return null;
  const daily =
    body.dailyMealBudgetLocal == null
      ? undefined
      : parsePositiveNumber(body.dailyMealBudgetLocal, { min: 1, max: 10_000 });
  if (body.dailyMealBudgetLocal != null && daily == null) return null;

  if (
    !Array.isArray(body.stops) ||
    body.stops.length === 0 ||
    body.stops.length > MAX_STOPS
  ) {
    return null;
  }
  const stops: TripPlanInput["stops"] = [];
  for (const stop of body.stops) {
    if (!stop || typeof stop !== "object") return null;
    const row = stop as Record<string, unknown>;
    const citySlug = requireCitySlug(row.citySlug);
    const days = parsePositiveNumber(row.days, { min: 1, max: 90 });
    if (!citySlug || days == null) return null;
    stops.push({ citySlug, days: Math.floor(days) });
  }
  return {
    homeCurrency,
    dailyMealBudgetLocal: daily ?? undefined,
    stops,
  };
}

export function sanitizeSyncPayload(raw: unknown): UserSyncPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const savedIn = Array.isArray(body.saved)
    ? body.saved.slice(0, MAX_SAVED)
    : [];
  const alertsIn = Array.isArray(body.alerts)
    ? body.alerts.slice(0, MAX_ALERTS)
    : [];
  const tripsIn = Array.isArray(body.trips)
    ? body.trips.slice(0, MAX_TRIPS)
    : [];

  const saved = [];
  for (const item of savedIn) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fromSlug = requireCitySlug(row.fromSlug);
    const toSlug = requireCitySlug(row.toSlug);
    const budget = parsePositiveNumber(row.budget, {
      min: 0.01,
      max: MAX_MONEY,
    });
    const mode = row.mode === "hourly" ? "hourly" : "flat";
    if (!fromSlug || !toSlug || budget == null) continue;
    saved.push({
      id: clampString(row.id, 48) || `cmp_${saved.length}`,
      fromSlug,
      toSlug,
      budget,
      mode: mode as "flat" | "hourly",
      label: clampString(row.label, MAX_LABEL) || `${fromSlug} vs ${toSlug}`,
      createdAt: clampString(row.createdAt, 40) || new Date().toISOString(),
    });
  }

  const alerts: PriceAlert[] = [];
  for (const item of alertsIn) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fromCurrency = parseCurrency(row.fromCurrency, "");
    const toCurrency = parseCurrency(row.toCurrency, "");
    const thr = parseBoundedNumber(row.thresholdPct, -100, 100);
    if (!fromCurrency || !toCurrency || thr == null) continue;
    alerts.push({
      id: clampString(row.id, 48) || `alert_${alerts.length}`,
      fromCurrency,
      toCurrency,
      thresholdPct: thr,
      label:
        clampString(row.label, MAX_LABEL) || `${fromCurrency}/${toCurrency}`,
      createdAt: clampString(row.createdAt, 40) || new Date().toISOString(),
    });
  }

  const trips = [];
  for (const item of tripsIn) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const plan = parseTripBody(row.plan);
    if (!plan) continue;
    trips.push({
      id: clampString(row.id, 48) || `trip_${trips.length}`,
      name: clampString(row.name, MAX_LABEL) || "Trip",
      plan,
      savedAt: clampString(row.savedAt, 40) || new Date().toISOString(),
    });
  }

  return {
    saved,
    alerts,
    trips,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeAlertsInput(raw: unknown): PriceAlert[] | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body.alerts)) return null;
  if (body.alerts.length > MAX_ALERTS) return null;
  const out: PriceAlert[] = [];
  for (const item of body.alerts) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fromCurrency = parseCurrency(row.fromCurrency, "");
    const toCurrency = parseCurrency(row.toCurrency, "");
    const thr = parseBoundedNumber(row.thresholdPct, -100, 100);
    if (!fromCurrency || !toCurrency || thr == null) continue;
    out.push({
      id: clampString(row.id, 48) || `alert_${out.length}`,
      fromCurrency,
      toCurrency,
      thresholdPct: thr,
      label:
        clampString(row.label, MAX_LABEL) || `${fromCurrency}/${toCurrency}`,
      createdAt: clampString(row.createdAt, 40) || new Date().toISOString(),
    });
  }
  return out;
}
