import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  rankShortlist,
  type ShortlistRankMode,
} from "@shared/decisionMath";
import type { City } from "@shared/types";
import { CatalogErrorBanner } from "../components/CatalogErrorBanner";
import { CitySelect } from "../components/CitySelect";
import { PageHeader } from "../components/PageHeader";
import { useAbortableQuery } from "../hooks/useAbortableQuery";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { useSeo } from "../hooks/useSeo";
import { fetchCities } from "../lib/api";
import {
  addToShortlist,
  loadShortlist,
  removeFromShortlist,
  replaceShortlist,
  setShortlistOrder,
} from "../lib/shortlist";

export function ShortlistPage() {
  useSeo(
    "Shortlist",
    "Build a city shortlist and rank by purchasing power, wage stretch, or dish value.",
  );
  const { cities: catalog, error: catalogError, reload } = useCitiesCatalog();
  const [params, setParams] = useSearchParams();
  const [slugs, setSlugs] = useState<string[]>(() => {
    const fromUrl = params.get("cities");
    if (fromUrl) {
      return fromUrl
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    return loadShortlist().slugs;
  });
  const [mode, setMode] = useState<ShortlistRankMode>("pp");
  const [pick, setPick] = useState(catalog[0]?.slug || "lisbon");

  useEffect(() => {
    if (catalog[0] && !catalog.find((c) => c.slug === pick)) {
      setPick(catalog[0].slug);
    }
  }, [catalog, pick]);

  useEffect(() => {
    replaceShortlist(slugs);
    const next = new URLSearchParams(params);
    if (slugs.length) next.set("cities", slugs.join(","));
    else next.delete("cities");
    setParams(next, { replace: true });
  }, [slugs]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: cityData, error, reload: reloadCities } = useAbortableQuery(
    async (signal) => {
      const data = await fetchCities(signal);
      const map: Record<string, City> = {};
      for (const c of data.cities) map[c.slug] = c;
      const rates: Record<string, number> = { USD: 1 };
      for (const row of data.leaderboard) {
        if (row.salaryUsd > 0 && map[row.slug]) {
          const local = map[row.slug]!.localBaselinePrices.avgMonthlyNetSalary;
          if (local > 0) rates[row.currencyCode] = local / row.salaryUsd;
        }
      }
      return { map, rates };
    },
    [],
    "Failed to load cities",
  );
  const cityMap = cityData?.map ?? {};
  const rates = cityData?.rates ?? {};

  const ranked = useMemo(() => {
    const list = slugs.map((s) => cityMap[s]).filter(Boolean) as City[];
    return rankShortlist(list, mode, rates);
  }, [slugs, cityMap, mode, rates]);

  const move = (slug: string, dir: -1 | 1) => {
    const i = slugs.indexOf(slug);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= slugs.length) return;
    const next = [...slugs];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setSlugs(next);
    setShortlistOrder(next);
  };

  return (
    <main className="page-shell mx-auto max-w-4xl space-y-5">
      <PageHeader
        eyebrow="Shortlist"
        title="Your city shortlist"
        description="Pick up to 12 cities, rank them, and jump into compare or decide."
      />

      <CatalogErrorBanner
        pageError={error}
        catalogError={catalogError}
        onReloadCatalog={reload}
        onRetryPage={reloadCities}
      />

      <section className="bento flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="flex-1">
          <CitySelect
            label="Add a city"
            value={pick}
            cities={catalog}
            onChange={setPick}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!pick || slugs.includes(pick)) return;
            addToShortlist(pick);
            setSlugs((s) => [pick, ...s.filter((x) => x !== pick)].slice(0, 12));
          }}
          className="h-10 rounded-md bg-emerald/90 px-4 text-sm font-medium text-obsidian transition hover:bg-emerald"
        >
          Add
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Rank by</span>
        {(
          [
            ["pp", "Purchasing power"],
            ["wage", "Wage stretch"],
            ["dish", "Dish PP"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              mode === id
                ? "border-emerald/35 bg-emerald/10 text-emerald"
                : "border-white/10 text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!slugs.length ? (
        <p className="text-sm text-muted">
          No cities yet — add a few destinations to compare side by side.
        </p>
      ) : (
        <ul className="space-y-2">
          {ranked.map((row, index) => (
            <li
              key={row.city.slug}
              className="bento fade-in flex flex-wrap items-center gap-3 p-4"
            >
              <span className="tabular text-lg text-muted w-6">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/city/${row.city.slug}`}
                  className="font-medium text-ink hover:text-emerald"
                >
                  {row.city.name}
                </Link>
                <p className="text-xs text-muted">
                  {row.city.country} · {row.detail}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(row.city.slug, -1)}
                  className="rounded border border-white/10 px-2 py-1 text-xs text-muted hover:text-ink"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(row.city.slug, 1)}
                  className="rounded border border-white/10 px-2 py-1 text-xs text-muted hover:text-ink"
                >
                  ↓
                </button>
                <Link
                  to={`/compare/new-york-vs-${row.city.slug}?budget=100`}
                  className="rounded border border-white/10 px-2 py-1 text-xs text-muted hover:text-ink"
                >
                  Compare
                </Link>
                <Link
                  to={`/decide?to=${row.city.slug}`}
                  className="rounded border border-white/10 px-2 py-1 text-xs text-muted hover:text-ink"
                >
                  Decide
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    removeFromShortlist(row.city.slug);
                    setSlugs((s) => s.filter((x) => x !== row.city.slug));
                  }}
                  className="rounded border border-coral/25 px-2 py-1 text-xs text-coral/90 hover:bg-coral/10"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
