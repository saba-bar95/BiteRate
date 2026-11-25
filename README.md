# BiteRate

**Global & Local Purchasing Power Index** — compare cities with live FX, wages, weather, and how many signature local dishes your money buys (Khinkali in Tbilisi, Ramen in Tokyo, Street Tacos in Mexico City, and more).

Interactive and URL-driven (local saves + optional Cursor identity sync):

- `/compare/:fromCity-vs-:toCity?budget=100`
- `/city/:slug` — rich city page + CoL source note
- `/trip` — multi-city trip budget planner
- `/equivalent` — wage → lifestyle PPP calculator
- `/story` — FX / dish purchasing story over time
- `/map` — world map of PP scores
- `/spend` — FX fee deep-dive
- `/saved` — saved comparisons & trips (+ cloud sync)
- `/alerts` — FX threshold alerts

## Stack

- **Frontend:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Lucide · Recharts
- **Backend:** Hono (Node) aggregation + in-memory TTL cache
- **Data:** Curated **100+ city** seed in `shared/cities.ts` (multiple cities per country). Live APIs enrich FX, weather, Wikipedia, country metadata, and GDP — there is no free keyless global cost-of-living/dish price API, so baselines stay curated and are exposed via `/api/cities`.

## Quick start

```bash
npm install
npm run dev
```

- Web UI: `http://127.0.0.1:3847`
- API: `http://127.0.0.1:3848`

### Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | API + Vite concurrently              |
| `npm run build`| Typecheck + production frontend build|
| `npm start`    | Run API (serves `dist/` in production)|

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/cities?q=&country=&currency=&iso2=` | Seed cities + purchasing-power leaderboard |
| `GET /api/cities/catalog?q=&country=` | Fast catalog + cities grouped by country |
| `GET /api/cities/:slug` | City + CoL snapshot (seed or Numbeo) |
| `GET /api/pulse/:fromSlug/:toSlug?budget=100&mode=flat\|hourly` | Full comparison pulse |
| `POST /api/trip` | Multi-city trip budget plan |
| `POST /api/equivalent` | Wage → lifestyle PPP equivalent |
| `GET /api/story/:from/:to?budget=` | FX / dish portions over time |
| `GET /api/spend?amount=&currency=` | FX fee scenarios |
| `GET /api/map` | Map points from PP leaderboard |
| `POST /api/alerts/check` | Evaluate local FX alerts |
| `GET /api/me` · `GET|PUT /api/sync` | Cursor identity + saved sync |

Optional env: `NUMBEO_API_KEY` for live cost-of-living enrichment (falls back to curated seed).

### Security & performance

- Strict CORS allowlist (parsed origins, not substring match)
- Security headers (CSP, frame deny, nosniff, COOP/CORP)
- Input validation + body size caps on sync / trip / alerts
- Tiered rate limits; cache singleflight for upstream APIs
- Route-level code splitting (Recharts loaded only on FX Story)

Upstream sources (mostly keyless), fetched with `Promise.all` / cache:

1. **Frankfurter** (+ **Fawaz Ahmed Currency API** fallback for GEL, ARS, VND, …)
2. **Open-Meteo** weather
3. **Wikipedia REST** dish summaries
4. **REST Countries** flags / languages
5. **World Bank** GDP per capita

### Cache TTLs

- FX: 30 minutes
- Weather: 15 minutes
- Country / Wikipedia / World Bank: 24 hours

Partial failures never crash the UI — responses include `sourcesStatus` pills.

## License

MIT
