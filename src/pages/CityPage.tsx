import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { City } from "@shared/types";
import type { ColSnapshot } from "@shared/features";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useSeo } from "../hooks/useSeo";
import { fetchCity, fetchPulse } from "../lib/api";
import { formatMoney, formatNumber } from "../lib/format";
import { getLastCompareFrom } from "../lib/lastCompare";

export function CityPage() {
  const { slug = "" } = useParams();
  const [city, setCity] = useState<City | null>(null);
  const [col, setCol] = useState<ColSnapshot | null>(null);
  const [dishLine, setDishLine] = useState<string | null>(null);
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
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCity(slug),
      fetchPulse({ from: fromSlug, to: slug, budget: 100, mode: "flat" }),
    ])
      .then(([cityRes, pulse]) => {
        if (cancelled) return;
        setCity(cityRes.city);
        setCol(cityRes.col);
        setDishLine(
          pulse.dish
            ? `$100 buys ~${formatNumber(pulse.dish.visitorUnitsApprox, 2)} ${pulse.dish.unitLabel}s`
            : null,
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromSlug, slug]);

  useEffect(() => load(), [load, retryKey]);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted">
        <LoadingSpinner /> Loading city…
      </main>
    );
  }

  if (error || !city) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ErrorBanner
          message={error ?? "City not found"}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="eyebrow">
          {city.country} · {city.currencyCode}
        </p>
        <h1 className="display mt-1 text-4xl">{city.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Signature dish {city.signatureDish.name}
          {city.alsoTry ? ` · also try ${city.alsoTry.name}` : ""}. {dishLine}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="bento p-5">
          <h2 className="display text-xl">Baseline prices</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted">Burger meal</span>
              <span className="tabular">
                {formatMoney(
                  city.localBaselinePrices.burgerMeal,
                  city.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Cappuccino</span>
              <span className="tabular">
                {formatMoney(
                  city.localBaselinePrices.cappuccino,
                  city.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Transit</span>
              <span className="tabular">
                {formatMoney(
                  city.localBaselinePrices.transitTicket,
                  city.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">1BR center</span>
              <span className="tabular">
                {formatMoney(
                  city.localBaselinePrices.oneBedRentCenter,
                  city.currencyCode,
                )}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Net wage</span>
              <span className="tabular">
                {formatMoney(
                  city.localBaselinePrices.avgMonthlyNetSalary,
                  city.currencyCode,
                )}
              </span>
            </li>
          </ul>
        </div>
        <div className="bento p-5">
          <h2 className="display text-xl">Cost data source</h2>
          <p className="mt-3 text-sm text-muted">{col?.note}</p>
          <p className="mt-2 text-xs text-muted">
            Source: {col?.source ?? "seed"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/compare/${fromSlug}-vs-${city.slug}?budget=100`}
              className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald"
            >
              Compare from {fromSlug.replace(/-/g, " ")}
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
    </main>
  );
}
