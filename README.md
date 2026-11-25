# BiteRate

**Global & Local Purchasing Power Index** — a personal project for comparing how far money goes across cities: live FX, wages, weather, and how many signature local dishes your budget buys (Khinkali in Tbilisi, Ramen in Tokyo, Street Tacos in Mexico City, and more).

## What it does

BiteRate answers “how far does my money go?” when you travel or relocate:

- **Compare** two cities with a flat budget or hourly wage, live FX, a standardized cost basket, and a signature-dish purchasing-power card
- **Explore** a 100+ city leaderboard and world map of purchasing-power scores
- **Plan** multi-city trip spend, wage PPP equivalents, FX/dish stories over time, and FX fee scenarios
- **Save** comparisons and trips locally, with optional Cursor-identity cloud sync and FX threshold alerts

Baselines (dish prices, burgers, rent, wages) are **curated seed data**. Live APIs enrich FX, weather, Wikipedia dish blurbs, country metadata, and GDP. There is no free keyless global cost-of-living API for every dish, so seed prices remain the source of truth unless you set `NUMBEO_API_KEY`.

## Routes

| Path | Purpose | Shareable query / params |
|------|---------|--------------------------|
| `/compare/:from-vs-:to` | Main pulse comparison | `?budget=100&mode=flat\|hourly` |
| `/city/:slug` | City baselines + CoL note | Links into compare / FX story |
| `/trip` | Multi-stop trip budget | `?currency=&name=&s0=&d0=&…` / `?trip=` restore |
| `/equivalent` | Wage → lifestyle PPP | `?from=&to=&wage=` |
| `/story` | FX / dish portions over time | `?from=&to=&budget=` |
| `/map` | PP map + searchable city list | — |
| `/spend` | FX fee scenarios | `?amount=&currency=` |
| `/saved` | Local saves + pull/push sync | — |
| `/alerts` | Local FX threshold alerts | `?from=&to=&threshold=&label=` |

Default landing redirects to `/compare/new-york-vs-tbilisi?budget=100`. The nav remembers your last compare pair.

## Stack

| Layer | Choices |
|-------|---------|
| Frontend | React 19 · TypeScript · Vite · React Router · Tailwind CSS v4 · Lucide · Recharts |
| Backend | Hono on Node (`@hono/node-server`) · in-memory TTL cache + singleflight |
| Shared | City seed + types + pure pulse math in `shared/` |
| Auth (optional) | Cursor app identity for `/api/me` and `/api/sync` |
| Tests | Vitest (`npm test`) |

## Project layout

```
shared/          City seed, types, pulse math (server + client fallback)
server/          Hono API, security, FX/weather/wiki/COL services
src/             React app (pages, components, hooks, client API)
cursor/          Local identity helpers for Cursor-hosted runs
public/          Favicon / icons
```

## Quick start

```bash
npm install
npm run dev
```

- Web UI: `http://127.0.0.1:3847` (Vite proxies `/api` → API)
- API: `http://127.0.0.1:3848`

Both processes must be running. If the API is down, the UI shows proxy/`ECONNREFUSED` errors for `/api/*`.

### Vercel (frontend analytics & SPA hosting)

The UI includes **Vercel Web Analytics** and **Speed Insights** (`@vercel/analytics`, `@vercel/speed-insights`). They only send data in production on Vercel.

1. Deploy/import the repo on Vercel (Vite preset; `vercel.json` rewrites SPA routes to `index.html`).
2. In the Vercel project: **Analytics → Enable**, and enable **Speed Insights** if prompted.
3. Point your production API separately (or keep `npm start` on a Node host). Vite’s `/api` proxy is for local/dev; on Vercel the static UI needs a real API base URL if you host the API elsewhere.
4. After deploy, replace the placeholder origin in [`public/sitemap.xml`](public/sitemap.xml) with your real domain (sitemaps require absolute URLs).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite concurrently |
| `npm run dev:web` | Vite only (port 3847) |
| `npm run dev:api` | API only (port 3848) |
| `npm run build` | Typecheck + production frontend build |
| `npm start` | Run API (serves `dist/` when built) |
| `npm run preview` | Vite preview of the built UI |
| `npm test` | Vitest unit tests |
| `npm run lint` | Oxlint |

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default `3848`) |
| `HOST` | No | API bind host (default `127.0.0.1`) |
| `NODE_ENV` | No | `production` enables static `dist/` serving |
| `NUMBEO_API_KEY` | No | Live cost-of-living enrichment; falls back to seed |
| `CURSOR_APP_ID` | No | Set on Cursor-hosted deploys for real identity |

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/cities` | Cities + purchasing-power leaderboard (filter: `q`, `country`, `currency`, `iso2`) |
| `GET /api/cities/catalog` | Slim catalog for selects + `byCountry` (cached ~60s) |
| `GET /api/cities/:slug` | Full city + CoL snapshot |
| `GET /api/pulse/:from/:to` | Full comparison pulse (`budget`, `mode`, optional `wage`) |
| `POST /api/trip` | Multi-city trip plan |
| `POST /api/equivalent` | Wage PPP equivalent |
| `GET /api/story/:from/:to` | FX / dish portions over time |
| `GET /api/spend` | FX fee scenarios (`amount`, `currency`) |
| `GET /api/map` | Map points from PP scores |
| `POST /api/alerts/check` | Evaluate FX alerts |
| `GET /api/me` | Cursor identity (or local simulated viewer) |
| `GET\|PUT /api/sync` | Pull/push saved comparisons, trips, alerts |

Error JSON may include a `code` (e.g. `not_found`, `rate_limited`) alongside `error`.

### Upstream data sources

Mostly keyless; fetched with caching / `Promise.all`:

1. **Frankfurter** FX (+ **Fawaz Ahmed Currency API** fallback for GEL, ARS, VND, …)
2. **Open-Meteo** weather
3. **Wikipedia REST** dish summaries / thumbnails
4. **REST Countries** / country metadata
5. **World Bank** GDP per capita
6. **Numbeo** (optional, keyed) for CoL enrichment

### Cache TTLs (server)

| Data | TTL |
|------|-----|
| FX | ~30 minutes |
| Weather | ~15 minutes |
| Country / Wikipedia / World Bank | ~24 hours |
| Cities list / map | Short public `Cache-Control` on selected GETs |

Partial upstream failures do not crash the UI — pulse responses include `sourcesStatus` pills (ok / cached / degraded / unavailable).

### Security & performance notes

- CORS allowlist (parsed origins)
- Security headers (CSP, frame deny, nosniff, COOP/CORP)
- Input validation + body size caps on sync / trip / alerts
- Tiered rate limits; cache singleflight for upstream calls
- Route-level code splitting (Recharts mainly on FX Story)
- Tool pages load a **slim city catalog** instead of shipping the full seed to the browser; offline pulse fallback can still lazy-load the seed

## Product notes

- **FX** = foreign exchange rate used for conversions between home and target currencies
- Compare state lives in the URL so links are shareable
- Saves/alerts/trips live in `localStorage`; cloud sync needs a signed-in Cursor app session
- Affiliate / multi-currency card CTAs are illustrative placeholders, not partner integrations
- Alerts evaluate when you open Alerts (or click Check now) — no email/push yet

## License

This is a **personal project with no license**.

All rights reserved. You may view the code in this repository, but there is no grant to use, copy, modify, or distribute it unless the author explicitly says otherwise.
