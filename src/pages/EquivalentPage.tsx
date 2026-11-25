import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { WageEquivalentResult } from "@shared/features";
import { CitySelect } from "../components/CitySelect";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { useSeo } from "../hooks/useSeo";
import { fetchEquivalent } from "../lib/api";
import { formatMoney, formatNumber } from "../lib/format";

export function EquivalentPage() {
  useSeo(
    "Wage PPP",
    "Convert a monthly net wage into purchasing-power equivalent lifestyle costs in another city.",
  );
  const {
    cities,
    loading: catalogLoading,
    error: catalogError,
    reload,
  } = useCitiesCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromSlug, setFrom] = useState(searchParams.get("from") || "tbilisi");
  const [toSlug, setTo] = useState(searchParams.get("to") || "berlin");
  const [wage, setWage] = useState(searchParams.get("wage") || "1800");
  const [result, setResult] = useState<WageEquivalentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await fetchEquivalent({
          fromSlug,
          toSlug,
          monthlyNetWage: Number(wage) || 0,
        }),
      );
      const params = new URLSearchParams({
        from: fromSlug,
        to: toSlug,
        wage,
      });
      setSearchParams(params, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [fromSlug, setSearchParams, toSlug, wage]);

  useEffect(() => {
    if (
      searchParams.get("from") ||
      searchParams.get("to") ||
      searchParams.get("wage")
    ) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="Wage → lifestyle"
        title="Purchasing-power equivalent"
        description="What monthly net wage matches your lifestyle when you move cities?"
      />

      {(error || catalogError) && (
        <ErrorBanner
          message={error || catalogError || ""}
          onRetry={() => (catalogError ? reload() : void run())}
        />
      )}

      <section className="bento grid gap-3 p-5 sm:grid-cols-4">
        <CitySelect
          label="From"
          value={fromSlug}
          cities={cities}
          disabled={catalogLoading}
          onChange={setFrom}
        />
        <CitySelect
          label="To"
          value={toSlug}
          cities={cities}
          disabled={catalogLoading}
          onChange={setTo}
        />
        <label className="text-sm text-muted">
          Monthly net wage
          <input
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          />
        </label>
        <div className="flex items-end">
          <PrimaryButton
            className="w-full"
            loading={loading}
            onClick={() => void run()}
          >
            Calculate
          </PrimaryButton>
        </div>
      </section>

      {result && (
        <section className="bento space-y-3 p-5">
          <p className="text-sm leading-relaxed">{result.narrative}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface p-3">
              <div className="text-xs text-muted">Equivalent wage</div>
              <div className="mt-1 text-lg font-semibold tabular text-emerald">
                {formatMoney(result.equivalentWage, result.equivalentCurrency)}
              </div>
            </div>
            <div className="surface p-3">
              <div className="text-xs text-muted">PPP index</div>
              <div className="mt-1 text-lg font-semibold tabular">
                {formatNumber(result.purchasingPowerIndex, 2)}×
              </div>
            </div>
            <div className="surface p-3">
              <div className="text-xs text-muted">Dish portions / month</div>
              <div className="mt-1 text-sm tabular">
                {formatNumber(result.dishPortionsFrom, 1)} →{" "}
                {formatNumber(result.dishPortionsTo, 1)}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted">
            Rent burden {formatNumber(result.rentBurdenFrom * 100, 1)}% →{" "}
            {formatNumber(result.rentBurdenTo * 100, 1)}% of wage.
          </p>
        </section>
      )}
    </main>
  );
}
