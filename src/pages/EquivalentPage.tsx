import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { WageEquivalentResult } from "@shared/features";
import { CatalogErrorBanner } from "../components/CatalogErrorBanner";
import { CitySelect } from "../components/CitySelect";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAsyncAction } from "../hooks/useAsyncAction";
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

  const { loading, error, run } = useAsyncAction(
    async () => {
      setResult(
        await fetchEquivalent({
          fromSlug,
          toSlug,
          monthlyNetWage: Number(wage) || 0,
        }),
      );
      setSearchParams(
        { from: fromSlug, to: toSlug, wage },
        { replace: true },
      );
    },
    "Failed",
    [fromSlug, setSearchParams, toSlug, wage],
  );

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
    <main className="page-shell mx-auto max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Wage → lifestyle"
        title="Purchasing-power equivalent"
        description="What monthly net wage matches your lifestyle when you move cities?"
      />

      <CatalogErrorBanner
        pageError={error}
        catalogError={catalogError}
        onReloadCatalog={reload}
        onRetryPage={() => void run()}
      />

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
        <label className="field">
          Monthly net wage
          <input
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            className="field-control tabular"
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
