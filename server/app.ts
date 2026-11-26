import { Hono } from "hono";
import { logger } from "hono/logger";
import { getIdentity } from "../cursor/identity.ts";
import {
  cityStats,
  filterCities,
  getCity,
  listCities,
} from "../shared/cities.ts";
import { buildCitiesList, buildPulse } from "./services/aggregator.ts";
import { cachedFetch, TTL } from "./services/cache.ts";
import { getColSnapshot } from "./services/col.ts";
import {
  buildDecide,
  buildFxStory,
  buildSeasonality,
  buildSimilarCities,
  buildSpendCompare,
  buildTripPlan,
  buildWageEquivalent,
} from "./services/features.ts";
import { getFxQuote } from "./services/fx.ts";
import { emptySync, getSync, putSync } from "./services/syncStore.ts";
import {
  allowedCorsOrigin,
  clientIp,
  rateBucketForPath,
  rateLimit,
  readJsonCapped,
  securityHeaders,
} from "./lib/security.ts";
import {
  isSlug,
  parseCurrency,
  parsePositiveNumber,
  parseTripBody,
  requireCitySlug,
  sanitizeAlertsInput,
  sanitizeSyncPayload,
} from "./lib/validate.ts";

/** Pure Hono app — shared by local Node server and the Vercel serverless bundle. */
const app = new Hono();

app.use("*", securityHeaders);
if (process.env.NODE_ENV !== "production") {
  app.use("*", logger());
}

app.use("/api/*", async (c, next) => {
  const origin = allowedCorsOrigin(c.req.header("origin"));
  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header("Access-Control-Max-Age", "600");
  }
  if (c.req.method === "OPTIONS") {
    return c.body(null, origin ? 204 : 403);
  }

  const ip = clientIp(c);
  const { bucket, limit } = rateBucketForPath(c.req.path, c.req.method);

  if (!rateLimit(`${ip}:${bucket}`, limit)) {
    return c.json(
      {
        error: "Rate limit exceeded. Try again shortly.",
        code: "rate_limited",
      },
      429,
    );
  }

  await next();
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "biterate",
    ts: new Date().toISOString(),
    ...cityStats(),
  }),
);

app.get("/api/me", async (c) => {
  const identity = await getIdentity(c.req.raw);
  if (!identity.verified) {
    return c.json({ signedIn: false });
  }
  return c.json({
    signedIn: true,
    simulated: identity.simulated,
    name: identity.name,
    email: identity.email,
    sub: identity.sub,
    stage: identity.stage,
  });
});

app.get("/api/sync", async (c) => {
  const identity = await getIdentity(c.req.raw);
  if (!identity.verified) {
    return c.json({ signedIn: false, data: emptySync() });
  }
  const key = `${identity.stage}:${identity.sub}`;
  return c.json({ signedIn: true, data: getSync(key) ?? emptySync() });
});

app.put("/api/sync", async (c) => {
  const identity = await getIdentity(c.req.raw);
  if (!identity.verified) {
    return c.json({ error: "Sign in required to sync" }, 401);
  }
  const parsed = await readJsonCapped(c);
  if (!parsed.ok) return parsed.response;
  const payload = sanitizeSyncPayload(parsed.data);
  if (!payload) return c.json({ error: "Invalid sync payload" }, 400);
  const key = `${identity.stage}:${identity.sub}`;
  try {
    const saved = putSync(key, payload);
    return c.json({ ok: true, data: saved });
  } catch {
    return c.json({ error: "Unable to store sync data" }, 500);
  }
});

app.get("/api/cities", async (c) => {
  const q = c.req.query("q")?.slice(0, 80);
  const country = c.req.query("country")?.slice(0, 80);
  const currency = c.req.query("currency")
    ? parseCurrency(c.req.query("currency"), "")
    : undefined;
  if (c.req.query("currency") && !currency) {
    return c.json({ error: "Invalid currency filter" }, 400);
  }
  const iso2 = c.req.query("iso2")?.toUpperCase().slice(0, 2);
  const cacheKey = `cities:${q ?? ""}:${country ?? ""}:${currency ?? ""}:${iso2 ?? ""}`;
  const { data } = await cachedFetch(cacheKey, TTL.cities, () =>
    buildCitiesList({
      q: q || undefined,
      country: country || undefined,
      currency: currency || undefined,
      iso2: iso2 || undefined,
    }),
  );
  return c.json(data);
});

app.get("/api/cities/catalog", (c) => {
  const q = c.req.query("q")?.slice(0, 80);
  const country = c.req.query("country")?.slice(0, 80);
  const currency = c.req.query("currency")
    ? parseCurrency(c.req.query("currency"), "")
    : undefined;
  if (c.req.query("currency") && !currency) {
    return c.json({ error: "Invalid currency filter" }, 400);
  }
  const iso2 = c.req.query("iso2")?.toUpperCase().slice(0, 2);
  const all = listCities();
  const matched = filterCities({
    q: q || undefined,
    country: country || undefined,
    currency: currency || undefined,
    iso2: iso2 || undefined,
  });
  const cities = matched.map((city) => ({
    slug: city.slug,
    name: city.name,
    country: city.country,
    currencyCode: city.currencyCode,
  }));
  const byCountry: Record<string, Array<{ slug: string; name: string }>> = {};
  for (const city of all) {
    const bucket = (byCountry[city.country] ??= []);
    bucket.push({ slug: city.slug, name: city.name });
  }
  for (const key of Object.keys(byCountry)) {
    byCountry[key]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  c.header("Cache-Control", "public, max-age=60");
  return c.json({
    cities,
    byCountry,
    stats: { ...cityStats(), matchedCount: cities.length },
    note: "Curated seed + live enrichment via /api/pulse.",
    generatedAt: new Date().toISOString(),
  });
});

app.get("/api/cities/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isSlug(slug)) return c.json({ error: "Invalid city slug" }, 400);
  const city = getCity(slug);
  if (!city) return c.json({ error: "City not found", code: "not_found" }, 404);
  const col = await getColSnapshot(city);
  return c.json({ city, col });
});

app.get("/api/cities/:slug/similar", (c) => {
  const slug = requireCitySlug(c.req.param("slug"));
  if (!slug) return c.json({ error: "City not found", code: "not_found" }, 404);
  const limit = parsePositiveNumber(c.req.query("limit") ?? 6, {
    min: 1,
    max: 20,
    fallback: 6,
  });
  const data = buildSimilarCities(slug, limit ?? 6);
  if (!data) return c.json({ error: "City not found", code: "not_found" }, 404);
  c.header("Cache-Control", "public, max-age=120");
  return c.json(data);
});

app.get("/api/cities/:slug/seasonality", async (c) => {
  const slug = requireCitySlug(c.req.param("slug"));
  if (!slug) return c.json({ error: "City not found", code: "not_found" }, 404);
  const data = await buildSeasonality(slug);
  if (!data) return c.json({ error: "City not found", code: "not_found" }, 404);
  c.header("Cache-Control", "public, max-age=300");
  return c.json(data);
});

app.get("/api/decide", async (c) => {
  const fromSlug = requireCitySlug(c.req.query("from"));
  const toSlug = requireCitySlug(c.req.query("to"));
  if (!fromSlug || !toSlug) {
    return c.json({ error: "Unknown city slug", code: "not_found" }, 404);
  }
  const budget = parsePositiveNumber(c.req.query("budget") ?? 100, {
    min: 0.01,
    max: 1_000_000_000,
  });
  if (budget == null) return c.json({ error: "Invalid budget" }, 400);
  const mode = c.req.query("mode") === "relocate" ? "relocate" : "go";
  const days = parsePositiveNumber(c.req.query("days") ?? 7, {
    min: 1,
    max: 365,
    fallback: 7,
  });
  const months = parsePositiveNumber(c.req.query("months") ?? 1, {
    min: 0.25,
    max: 36,
    fallback: 1,
  });
  const data = await buildDecide({
    fromSlug,
    toSlug,
    budget,
    mode,
    days: days ?? 7,
    months: months ?? 1,
  });
  if (!data) return c.json({ error: "Unable to build decision" }, 500);
  c.header(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=120",
  );
  return c.json(data);
});

app.get("/api/pulse/:fromSlug/:toSlug", async (c) => {
  const fromSlug = requireCitySlug(c.req.param("fromSlug"));
  const toSlug = requireCitySlug(c.req.param("toSlug"));
  if (!fromSlug || !toSlug)
    return c.json({ error: "Unknown city slug", code: "not_found" }, 404);

  const budget = parsePositiveNumber(c.req.query("budget") ?? 100, {
    min: 0.01,
    max: 1_000_000_000,
  });
  if (budget == null) return c.json({ error: "Invalid budget" }, 400);

  const mode = c.req.query("mode") === "hourly" ? "hourly" : "flat";
  const wageRaw = c.req.query("wage");
  const hourlyWage = wageRaw
    ? parsePositiveNumber(wageRaw, { min: 0.01, max: 1_000_000 })
    : mode === "hourly"
      ? budget
      : null;
  if (wageRaw && hourlyWage == null) {
    return c.json({ error: "Invalid wage" }, 400);
  }

  const pulse = await buildPulse(fromSlug, toSlug, budget, mode, hourlyWage);
  if (!pulse) return c.json({ error: "Unable to build pulse" }, 500);
  c.header(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=120",
  );
  return c.json(pulse);
});

app.post("/api/trip", async (c) => {
  const parsed = await readJsonCapped(c);
  if (!parsed.ok) return parsed.response;
  const input = parseTripBody(parsed.data);
  if (!input) return c.json({ error: "Invalid trip plan" }, 400);
  const plan = await buildTripPlan(input);
  if (!plan) return c.json({ error: "Invalid trip plan" }, 400);
  return c.json(plan);
});

app.post("/api/equivalent", async (c) => {
  const parsed = await readJsonCapped(c);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const fromSlug = requireCitySlug(body.fromSlug);
  const toSlug = requireCitySlug(body.toSlug);
  const monthlyNetWage = parsePositiveNumber(body.monthlyNetWage, {
    min: 1,
    max: 1_000_000_000,
  });
  if (!fromSlug || !toSlug || monthlyNetWage == null) {
    return c.json({ error: "Invalid wage equivalent request" }, 400);
  }
  const result = await buildWageEquivalent({
    fromSlug,
    toSlug,
    monthlyNetWage,
  });
  if (!result) return c.json({ error: "Invalid wage equivalent request" }, 400);
  return c.json(result);
});

app.get("/api/story/:fromSlug/:toSlug", async (c) => {
  const fromSlug = requireCitySlug(c.req.param("fromSlug"));
  const toSlug = requireCitySlug(c.req.param("toSlug"));
  const budget = parsePositiveNumber(c.req.query("budget") ?? 100, {
    min: 0.01,
    max: 1_000_000_000,
  });
  if (!fromSlug || !toSlug || budget == null) {
    return c.json({ error: "Unable to build FX story" }, 400);
  }
  const story = await buildFxStory({ fromSlug, toSlug, budget });
  if (!story) return c.json({ error: "Unable to build FX story" }, 400);
  c.header(
    "Cache-Control",
    "public, max-age=120, stale-while-revalidate=300",
  );
  return c.json(story);
});

app.get("/api/spend", (c) => {
  const amount = parsePositiveNumber(c.req.query("amount") ?? 1000, {
    min: 0.01,
    max: 1_000_000_000,
  });
  const currency = parseCurrency(c.req.query("currency") ?? "USD", "USD");
  if (amount == null || !currency) {
    return c.json({ error: "Invalid amount or currency" }, 400);
  }
  c.header("Cache-Control", "public, max-age=300");
  return c.json(buildSpendCompare(amount, currency));
});

app.post("/api/alerts/check", async (c) => {
  const parsed = await readJsonCapped(c);
  if (!parsed.ok) return parsed.response;
  const alerts = sanitizeAlertsInput(parsed.data);
  if (!alerts) return c.json({ error: "Invalid alerts payload" }, 400);

  const checked = await Promise.all(
    alerts.map(async (alert) => {
      const { quote, status } = await getFxQuote(
        alert.fromCurrency,
        alert.toCurrency,
      );
      const change = status === "unavailable" ? null : quote.change30dPct;
      return {
        ...alert,
        lastCheckedAt: new Date().toISOString(),
        lastChange30dPct: change,
        triggered: change != null && change <= alert.thresholdPct,
      };
    }),
  );
  return c.json({ alerts: checked });
});

app.get("/api/map", async (c) => {
  const { data } = await cachedFetch("map:points", TTL.map, async () => {
    const payload = await buildCitiesList();
    return {
      points: payload.leaderboard.map((row) => {
        const city = getCity(row.slug)!;
        return {
          ...row,
          lat: city.lat,
          lon: city.lon,
          dish: city.signatureDish.name,
        };
      }),
      stats: payload.stats,
      generatedAt: payload.generatedAt,
    };
  });
  c.header("Cache-Control", "public, max-age=60");
  return c.json(data);
});

export default app;
