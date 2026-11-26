import type { CityPriceOverrides } from "@shared/decisionMath";

const KEY = "biterate:overrides:v1";
const MAX_CITIES = 80;

export type OverridesMap = Record<string, CityPriceOverrides>;

function read(): OverridesMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OverridesMap;
    if (!parsed || typeof parsed !== "object") return {};
    const out: OverridesMap = {};
    for (const [slug, val] of Object.entries(parsed).slice(0, MAX_CITIES)) {
      if (!val || typeof val !== "object") continue;
      out[slug] = sanitizeOverride(val);
    }
    return out;
  } catch {
    return {};
  }
}

function sanitizeOverride(val: CityPriceOverrides): CityPriceOverrides {
  const out: CityPriceOverrides = {};
  for (const key of [
    "dishPrice",
    "burgerMeal",
    "cappuccino",
    "transitTicket",
    "oneBedRentCenter",
    "avgMonthlyNetSalary",
  ] as const) {
    const n = val[key];
    if (typeof n === "number" && Number.isFinite(n) && n > 0) out[key] = n;
  }
  return out;
}

function write(map: OverridesMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
  return map;
}

export function loadOverrides(): OverridesMap {
  return read();
}

export function getCityOverrides(slug: string): CityPriceOverrides | null {
  const o = read()[slug];
  return o && Object.keys(o).length ? o : null;
}

export function setCityOverrides(slug: string, overrides: CityPriceOverrides) {
  const map = read();
  const clean = sanitizeOverride(overrides);
  if (!Object.keys(clean).length) {
    delete map[slug];
  } else {
    map[slug] = clean;
  }
  return write(map);
}

export function clearCityOverrides(slug: string) {
  const map = read();
  delete map[slug];
  return write(map);
}

export function hasOverrides(slug: string): boolean {
  return Boolean(getCityOverrides(slug));
}
