import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingPane } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { FieldSelect } from "../components/Select";
import { useAbortableQuery } from "../hooks/useAbortableQuery";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { useSeo } from "../hooks/useSeo";
import { fetchMap } from "../lib/api";
import { getLastCompareFrom } from "../lib/lastCompare";
import { formatNumber } from "../lib/format";

type Point = {
  slug: string;
  name: string;
  country: string;
  score: number;
  lat: number;
  lon: number;
  dish: string;
};

function project(lat: number, lon: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

export function MapPage() {
  useSeo(
    "Map",
    "Explore purchasing power scores on a world map and browse cities by country.",
  );
  const { byCountry } = useCitiesCatalog();
  const [active, setActive] = useState<Point | null>(null);
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const w = 960;
  const h = 480;
  const fromSlug = getLastCompareFrom() || "new-york";
  const countries = useMemo(() => Object.keys(byCountry).sort(), [byCountry]);
  const countryOptions = useMemo(
    () => [
      { value: "all", label: "All countries" },
      ...countries.map((name) => ({ value: name, label: name })),
    ],
    [countries],
  );

  const {
    data: mapData,
    loading,
    error,
    reload,
  } = useAbortableQuery(
    (signal) => fetchMap(signal),
    [],
    "Failed to load map",
  );
  const points = (mapData?.points ?? []) as Point[];

  const max = useMemo(
    () => Math.max(...points.map((p) => p.score), 1),
    [points],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return points.filter((p) => {
      if (countryFilter !== "all" && p.country !== countryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.dish.toLowerCase().includes(q)
      );
    });
  }, [points, query, countryFilter]);

  return (
    <main className="page-shell mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Map explorer"
        title="Purchasing power around the world"
        description="Select a city from the map or the searchable list."
      />

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="bento grid gap-4 overflow-hidden p-3 sm:p-5 lg:grid-cols-[1fr_280px]">
        {loading ? (
          <LoadingPane
            label="Loading map…"
            className="flex h-72 items-center justify-center text-sm text-muted lg:col-span-2"
          />
        ) : (
          <>
            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="min-w-full rounded-md bg-obsidian"
                role="img"
                aria-label="World map of purchasing power scores"
              >
                <rect width={w} height={h} className="fill-obsidian" />
                {[...Array(12)].map((_, i) => (
                  <line
                    key={`v${i}`}
                    x1={(w / 12) * i}
                    x2={(w / 12) * i}
                    y1={0}
                    y2={h}
                    stroke="rgba(255,255,255,0.04)"
                  />
                ))}
                {[...Array(6)].map((_, i) => (
                  <line
                    key={`h${i}`}
                    y1={(h / 6) * i}
                    y2={(h / 6) * i}
                    x1={0}
                    x2={w}
                    stroke="rgba(255,255,255,0.04)"
                  />
                ))}
                {points.map((p) => {
                  const { x, y } = project(p.lat, p.lon, w, h);
                  const r = 3 + (p.score / max) * 7;
                  const selected = p === active;
                  return (
                    <circle
                      key={p.slug}
                      cx={x}
                      cy={y}
                      r={r}
                      fill={selected ? "#c9923a" : "#3d9b78"}
                      fillOpacity={0.85}
                      role="button"
                      tabIndex={0}
                      aria-label={`${p.name}, score ${p.score}`}
                      className="cursor-pointer outline-none focus:stroke-amber focus:stroke-2"
                      onClick={() => setActive(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActive(p);
                        }
                      }}
                    >
                      <title>
                        {p.name}: score {p.score}
                      </title>
                    </circle>
                  );
                })}
              </svg>
            </div>

            <div className="flex max-h-[28rem] flex-col gap-2">
              <label className="field">
                Find a city
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="field-control"
                />
              </label>
              <FieldSelect
                label="Country"
                value={countryFilter}
                options={countryOptions}
                onChange={setCountryFilter}
                searchable
              />
              <ul className="flex-1 space-y-1 overflow-y-auto rounded-md border border-white/8 p-1">
                {filtered.slice(0, 80).map((p) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => setActive(p)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${
                        active?.slug === p.slug
                          ? "bg-emerald/15 text-ink"
                          : "text-muted hover:bg-white/5 hover:text-ink"
                      }`}
                    >
                      <span>
                        {p.name}
                        <span className="block text-xs text-muted">
                          {p.country}
                        </span>
                      </span>
                      <span className="tabular text-emerald">
                        {formatNumber(p.score, 0)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {active && (
          <div className="surface flex flex-wrap items-center justify-between gap-3 p-4 lg:col-span-2">
            <div>
              <div className="font-medium">
                {active.name}, {active.country}
              </div>
              <div className="text-sm text-muted">
                Score {formatNumber(active.score, 0)} · {active.dish}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/city/${active.slug}`}
                className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
              >
                City page
              </Link>
              <Link
                to={`/compare/${fromSlug}-vs-${active.slug}?budget=100`}
                className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald"
              >
                Compare
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
