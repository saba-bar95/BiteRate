import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  applyPriceOverrides,
  freshnessMeta,
  type NeighborhoodTier,
} from "@shared/decisionMath";
import type { City } from "@shared/types";
import type {
  ColSnapshot,
  SeasonalityResponse,
  SimilarCitiesResponse,
} from "@shared/features";
import { BookingHandoff } from "../components/BookingHandoff";
import { ErrorBanner } from "../components/ErrorBanner";
import { FreshnessBadges } from "../components/FreshnessBadge";
import { LoadingPane } from "../components/LoadingSpinner";
import { NeighborhoodToggle } from "../components/NeighborhoodToggle";
import { PriceOverridePanel } from "../components/PriceOverridePanel";
import { ShortlistButton } from "../components/ShortlistButton";
import { useSeo } from "../hooks/useSeo";
import {
  fetchCity,
  fetchPulse,
  fetchSeasonality,
  fetchSimilarCities,
  isAbortError,
} from "../lib/api";
import { formatMoney, formatNumber } from "../lib/format";
import { getLastCompareFrom } from "../lib/lastCompare";
import { getCityOverrides } from "../lib/overrides";

export function CityPage() {
  const { slug = "" } = useParams();
  const [city, setCity] = useState<City | null>(null);
  const [col, setCol] = useState<ColSnapshot | null>(null);
  const [dishLine, setDishLine] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarCitiesResponse | null>(null);
  const [season, setSeason] = useState<SeasonalityResponse | null>(null);
  const [tier, setTier] = useState<NeighborhoodTier>("mid");
  const [overrideTick, setOverrideTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const fromSlug = getLastCompareFrom() || "new-york";
  useSeo(
    city?.name ?? "City",
    city
      ? `Purchasing power, baseline prices, and signature dish costs in ${city.name}, ${city.country}.`
      : undefined,
  );

  const load = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCity(slug, ac.signal),
      fetchPulse(
        { from: fromSlug, to: slug, budget: 100, mode: "flat" },
        ac.signal,
      ),
      fetchSimilarCities(slug, 6, ac.signal).catch(() => null),
      fetchSeasonality(slug, ac.signal).catch(() => null),
    ])
      .then(([cityRes, pulse, sim, sea]) => {
        setCity(cityRes.city);
        setCol(cityRes.col);
        setSimilar(sim);
        setSeason(sea);
        setDishLine(
          pulse.dish
            ? `$100 buys ~${formatNumber(pulse.dish.visitorUnitsApprox, 2)} ${pulse.dish.unitLabel}s`
            : null,
        );
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setError(err instanceof Error ? err.message : "Failed");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [fromSlug, slug]);

  useEffect(() => load(), [load, retryKey]);

  const displayCity = useMemo(() => {
    if (!city) return null;
    void overrideTick;
    return applyPriceOverrides(city, getCityOverrides(slug), tier);
  }, [city, slug, tier, overrideTick]);

  if (loading) {
    return (
      <main>
        <LoadingPane label="Loading city…" />
      </main>
    );
  }

  if (error || !city || !displayCity) {
    return (
      <main className="page-shell mx-auto max-w-3xl">
        <ErrorBanner
          message={error ?? "City not found"}
          layout="page"
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </main>
    );
  }

  return (
    <main className="page-shell mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {displayCity.country} · {displayCity.currencyCode}
          </p>
          <h1 className="display display-xl mt-1">{displayCity.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Signature dish {displayCity.signatureDish.name}
            {displayCity.alsoTry ? ` · also try ${displayCity.alsoTry.name}` : ""}
            . {dishLine}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShortlistButton slug={slug} />
          <NeighborhoodToggle value={tier} onChange={setTier} />
        </div>
      </div>

      <FreshnessBadges
        badges={freshnessMeta({
          fxAsOf: new Date().toISOString(),
          colSource: col?.source,
          seedNote: col?.note,
        })}
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="bento p-5">
          <h2 className="display display-sm">Baseline prices</h2>
          <p className="mt-1 text-xs text-muted">
            Tier: {tier}
            {tier !== "mid" ? " (scaled)" : ""}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted">Burger meal</span>
              <span className="tabular">
                {formatMoney(
                  displayCity.localBaselinePrices.burgerMeal,
                  displayCity.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Cappuccino</span>
              <span className="tabular">
                {formatMoney(
                  displayCity.localBaselinePrices.cappuccino,
                  displayCity.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Transit</span>
              <span className="tabular">
                {formatMoney(
                  displayCity.localBaselinePrices.transitTicket,
                  displayCity.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">1BR center</span>
              <span className="tabular">
                {formatMoney(
                  displayCity.localBaselinePrices.oneBedRentCenter,
                  displayCity.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Net wage</span>
              <span className="tabular">
                {formatMoney(
                  displayCity.localBaselinePrices.avgMonthlyNetSalary,
                  displayCity.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Signature dish</span>
              <span className="tabular">
                {formatMoney(
                  displayCity.signatureDish.localPrice,
                  displayCity.currencyCode,
                )}
              </span>
            </li>
          </ul>
        </div>
        <div className="bento space-y-4 p-5">
          <div>
            <h2 className="display display-sm">Cost data source</h2>
            <p className="mt-3 text-sm text-muted">{col?.note}</p>
            <p className="mt-2 text-xs text-muted">
              Source: {col?.source ?? "seed"}
            </p>
          </div>
          <BookingHandoff
            cityName={displayCity.name}
            country={displayCity.country}
          />
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/compare/${fromSlug}-vs-${city.slug}?budget=100`}
              className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald"
            >
              Compare from {fromSlug.replace(/-/g, " ")}
            </Link>
            <Link
              to={`/decide?from=${fromSlug}&to=${city.slug}`}
              className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
            >
              Decide
            </Link>
            <Link
              to={`/story?from=${fromSlug}&to=${city.slug}&budget=100`}
              className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
            >
              FX story
            </Link>
          </div>
        </div>
      </section>

      <PriceOverridePanel
        slug={slug}
        defaults={{
          dishPrice: city.signatureDish.localPrice,
          burgerMeal: city.localBaselinePrices.burgerMeal,
          oneBedRentCenter: city.localBaselinePrices.oneBedRentCenter,
        }}
        onChange={() => setOverrideTick((n) => n + 1)}
      />

      {season ? (
        <section className="bento fade-in p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Seasonality</p>
              <h2 className="display mt-1 text-xl">Best windows</h2>
            </div>
            <p className="text-xs text-muted max-w-sm">{season.fxNote}</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {season.months.map((m) => {
              const best = season.bestMonths.includes(m.month);
              const h = Math.max(12, m.comfort * 0.55);
              return (
                <div key={m.month} className="text-center">
                  <div className="flex h-16 items-end justify-center rounded-md bg-obsidian/40 px-1">
                    <div
                      className={`w-full rounded-sm ${best ? "bg-emerald/70" : "bg-white/15"}`}
                      style={{ height: `${h}%` }}
                      title={m.note}
                    />
                  </div>
                  <p
                    className={`mt-1 text-[10px] ${best ? "text-emerald" : "text-muted"}`}
                  >
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {similar?.cities.length ? (
        <section className="bento fade-in-delay p-5">
          <p className="eyebrow">Cities like this</p>
          <h2 className="display mt-1 text-xl">Similar destinations</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {similar.cities.map((c) => (
              <Link
                key={c.slug}
                to={`/city/${c.slug}`}
                className="surface block p-3 transition hover:border-emerald/30"
              >
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.country} · {c.dish}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
