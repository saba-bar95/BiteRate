# BiteRate

**Global & Local Purchasing Power Index** — a personal project for comparing how far money goes across cities: live FX, wages, weather, and how many signature local dishes your budget buys (Khinkali in Tbilisi, Ramen in Tokyo, Street Tacos in Mexico City, and more).

## What it does

BiteRate answers “how far does my money go?” when you travel or relocate:

- **Compare** two cities with a flat budget or hourly wage, live FX, a cost basket, signature-dish PP, discovery presets, freshness badges, and “how we got this number” explainers
- **Decide** whether to go now (score from PP / FX / weather / trip cost) or **relocate vs visit** break-even
- **Explore** a **200+ city** catalog (100+ countries), map, leaderboard, shortlist ranking, and city pages with similar cities, seasonality, neighborhood tiers, and local price overrides
- **Plan** multi-city trips with booking handoffs (flights/stays) and print/PDF trip sheets; wage PPP, FX/dish stories, and FX fee scenarios
- **Save** comparisons and trips locally (browser); optional Cursor-identity cloud sync when signed in; FX alerts with **browser notifications**
- **Trust** — `/data` explains curated baselines vs live enrichment; booking/fee links are labeled as search handoffs / illustrative math, not partnerships

Baselines (dish prices, burgers, rent, wages) are **curated seed data** (`shared/cities.ts` + `shared/citiesExtra.ts`). Live APIs enrich FX, weather, Wikipedia dish blurbs, country metadata, and GDP. There is no free keyless global cost-of-living API for every dish, so seed prices remain the source of truth unless you set `NUMBEO_API_KEY`.

## Routes

| Path | Purpose | Shareable query / params |
|------|---------|--------------------------|
| `/compare/:from-vs-:to` | Main pulse comparison | `?budget=100&mode=flat\|hourly` |
| `/decide` | Should I go? + relocate vs visit | `?from=&to=&mode=go\|relocate&budget=&days=&months=` |
| `/city/:slug` | Baselines, overrides, tiers, seasonality, similar | Links into compare / decide / FX story |
| `/shortlist` | Rank cities by PP / wage / dish | `?cities=slug,slug,…` |
| `/trip` | Multi-stop trip budget + print sheet | `?currency=&name=&s0=&d0=&…` / `?trip=` restore |
| `/equivalent` | Wage → lifestyle PPP | `?from=&to=&wage=` |
| `/story` | FX / dish portions over time | `?from=&to=&budget=` |
| `/map` | PP map + searchable city list | — |
| `/spend` | FX fee scenarios | `?amount=&currency=` |
| `/saved` | Local saves + optional sync (`noindex`) | — |
| `/alerts` | FX threshold alerts (`noindex`) | `?from=&to=&threshold=&label=` |
| `/data` | Methodology, seed vs live, privacy | — |

Default landing redirects to `/compare/new-york-vs-tbilisi?budget=100`. The nav remembers your last compare pair.

## Stack

| Layer | Choices |
|-------|---------|
| Frontend | React 19 · TypeScript · Vite · React Router · Tailwind CSS v4 · Lucide · Recharts |
| Backend | Hono on Node (`@hono/node-server`) · in-memory TTL cache + singleflight |
| Shared | City seed, types, pulse math, decision math (`shared/`) |
| Deploy | Vercel SPA + serverless `api/[[...route]].ts` (Hono) · CSP / security headers in `vercel.json` |
| Auth (optional) | Cursor app identity for `/api/me` and `/api/sync` |
| Tests | Vitest (`npm test`) — pulse math, decision math, cities, errors, storage |

## Project layout

```
shared/          City seed (+ citiesExtra), types, pulseMath, decisionMath
server/          Hono API, security, FX/weather/wiki/COL/decision services
api/             Vercel serverless entry wrapping the Hono app
src/             React app (pages, components, hooks, client API + fallbacks)
scripts/         Build helpers (sitemap generation)
cursor/          Local identity helpers for Cursor-hosted runs
public/          Favicon, OG image, sitemap, robots
```

## Quick start

```bash
npm install
npm run dev
```

- Web UI: `http://127.0.0.1:3847` (Vite proxies `/api` → API)
- API: `http://127.0.0.1:3848`

`npm run dev` starts **one Vite process** with the Hono API mounted at `/api` (no separate `:3848` server, so no local proxy 502s). Use `npm run dev:api` / `npm run dev:split` only if you want the old two-process setup.

### Vercel

The UI includes **Vercel Web Analytics** and **Speed Insights**. They only send data in production on Vercel.

1. Deploy/import the repo on Vercel (Vite preset).
2. `vercel.json` rewrites `/api/*` → `api/index.js` (bundled Hono), SPA fallback for the rest, plus CSP / frame-deny / long-cache for `/assets/*`.
3. `npm run build` also bundles the API into `api/app.mjs` (required on Vercel — importing raw `server/*.ts` from the function fails at runtime).
4. Enable **Analytics** / **Speed Insights** in the project settings if prompted.
5. Set `SITE_URL` (and optionally `ALLOWED_ORIGINS`) so sitemap/CORS match your domain. Build also regenerates `public/sitemap.xml` + `robots.txt` (~200+ city + compare URLs).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite + in-process `/api` (port 3847) |
| `npm run dev:web` | Same as `dev` |
| `npm run dev:api` | Standalone API only (port 3848) |
| `npm run dev:split` | Old two-process API+Vite via concurrently |
| `npm run sitemap` | Regenerate sitemap + robots from city catalog |
| `npm run build:api` | Bundle Hono API → `api/app.mjs` for Vercel |
| `npm run build` | Sitemap + API bundle + typecheck + Vite build |
| `npm start` | Run API (serves `dist/` when built; skipped listen on `VERCEL`) |
| `npm run preview` | Vite preview of the built UI |
| `npm test` | Vitest unit tests |
| `npm run lint` | Oxlint |

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default `3848`) |
| `HOST` | No | API bind host (default `127.0.0.1`) |
| `NODE_ENV` | No | `production` enables static `dist/` serving (non-Vercel) |
| `VERCEL` | Auto | Skips Node `serve()`; use serverless handler |
| `SITE_URL` | No | Canonical origin for sitemap (default `https://biterate.vercel.app`) |
| `ALLOWED_ORIGINS` | No | Extra CORS origins (comma-separated), e.g. custom domain |
| `NUMBEO_API_KEY` | No | Live cost-of-living enrichment; falls back to seed |
| `CURSOR_APP_ID` | No | Set on Cursor-hosted deploys for real identity |
| `TRUST_PROXY` | No | Trust `X-Forwarded-For` for rate-limit IP outside `NODE_ENV=production` |

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/cities` | Cities + purchasing-power leaderboard (filter: `q`, `country`, `currency`, `iso2`) |
| `GET /api/cities/catalog` | Slim catalog for selects + `byCountry` |
| `GET /api/cities/:slug` | Full city + CoL snapshot |
| `GET /api/cities/:slug/similar` | Similar destinations |
| `GET /api/cities/:slug/seasonality` | Month comfort + FX-friendly windows |
| `GET /api/decide` | Should-go score + relocate vs visit (`from`, `to`, `budget`, `mode`, `days`, `months`) |
| `GET /api/pulse/:from/:to` | Full comparison pulse (`budget`, `mode`, optional `wage`) |
| `POST /api/trip` | Multi-city trip plan |
| `POST /api/equivalent` | Wage PPP equivalent |
| `GET /api/story/:from/:to` | FX / dish portions over time |
| `GET /api/spend` | FX fee scenarios (`amount`, `currency`) |
| `GET /api/map` | Map points from PP scores |
| `POST /api/alerts/check` | Evaluate FX alerts |
| `GET /api/me` | Cursor identity (or local simulated viewer) |
| `GET\|PUT /api/sync` | Pull/push saved comparisons, trips, alerts |

Error JSON may include a `code` (e.g. `not_found`, `rate_limited`) alongside `error`. The UI maps failures to friendly banners (network / not found / rate limit / server).

### Upstream data sources

Mostly keyless; fetched with caching / `Promise.all`:

1. **Frankfurter** FX (+ **Fawaz Ahmed Currency API** fallback for GEL, ARS, VND, …)
2. **Open-Meteo** weather
3. **Wikipedia REST** dish summaries / thumbnails
4. **REST Countries** / country metadata
5. **World Bank** GDP per capita
6. **Numbeo** (optional, keyed) for CoL enrichment

### Cache TTLs (server)

| Data | TTL / HTTP cache |
|------|------------------|
| FX | ~30 minutes (server); pulse/decide also send short `Cache-Control` + SWR |
| Weather | ~15 minutes |
| Country / Wikipedia / World Bank | ~24 hours |
| Cities list / map / similar / seasonality / spend | Short public `Cache-Control` on selected GETs |

Partial upstream failures do not crash the UI — pulse responses include `sourcesStatus` (ok / cached / degraded / unavailable) for internals, and the Compare page surfaces **freshness badges** for users. Client fallbacks cover pulse, decide, similar, and seasonality when the API is unreachable (seed chunk loads only on fallback).

### Security & performance notes

- CORS allowlist (parsed origins; `*.vercel.app` + `ALLOWED_ORIGINS` / `SITE_URL`)
- Security headers on API and static CDN (CSP, frame deny, nosniff, Permissions-Policy)
- Input validation + hard JSON body byte cap (even without `Content-Length`)
- Route-scoped rate limits (pulse / decide / alerts / heavy / write / health)
- Cache singleflight for upstream calls
- Lazy route chunks; Recharts mainly on FX Story; searchable custom selects
- Fluid type/spacing; slim catalog for tool pages

## Product notes

- **FX** = foreign exchange rate used for conversions between home and target currencies
- Compare / decide / trip / tool state lives in the URL where possible so links are shareable
- Saves / alerts / trips / shortlist / price overrides live in `localStorage` (overrides & shortlist are local-only; sync payload is saved/alerts/trips)
- Cloud sync needs a signed-in Cursor session; Saved shows **Local only** vs **Cloud ready**. In-memory sync on Vercel is ephemeral — treat unsigned or Vercel-only deploys as browser-local
- Alerts can fire **browser notifications** when permission is granted; they also evaluate on Alerts open and via a throttled shell check
- Multi-currency / booking deep links are illustrative search handoffs, not partner integrations
- Neighborhood tiers scale seed baselines (budget / mid / premium); user overrides win when set
- SEO: build-time sitemap + robots; OG image at `/og.svg`; `/saved` and `/alerts` are `noindex`

## License

This is a **personal project with no license**.

All rights reserved. You may view the code in this repository, but there is no grant to use, copy, modify, or distribute it unless the author explicitly says otherwise.
