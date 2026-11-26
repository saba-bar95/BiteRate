import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FxStoryResult } from "@shared/features";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CatalogErrorBanner } from "../components/CatalogErrorBanner";
import { CitySelect } from "../components/CitySelect";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useSeo } from "../hooks/useSeo";
import { fetchStory } from "../lib/api";
import { formatNumber } from "../lib/format";

export function StoryPage() {
  useSeo(
    "FX Story",
    "See how FX shifts changed how many local dishes your budget could buy over time.",
  );
  const {
    cities,
    loading: catalogLoading,
    error: catalogError,
    reload,
  } = useCitiesCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromSlug, setFrom] = useState(searchParams.get("from") || "new-york");
  const [toSlug, setTo] = useState(searchParams.get("to") || "tbilisi");
  const [budget, setBudget] = useState(searchParams.get("budget") || "100");
  const [story, setStory] = useState<FxStoryResult | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { loading, error, run } = useAsyncAction(
    async () => {
      setStory(await fetchStory(fromSlug, toSlug, Number(budget) || 100));
      setSearchParams(
        { from: fromSlug, to: toSlug, budget },
        { replace: true },
      );
    },
    "Failed to build story",
    [budget, fromSlug, setSearchParams, toSlug],
  );

  useEffect(() => {
    if (
      searchParams.get("from") ||
      searchParams.get("to") ||
      searchParams.get("budget")
    ) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page-shell mx-auto max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Inflation & FX story"
        title="What your money bought over time"
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
          label="In"
          value={toSlug}
          cities={cities}
          disabled={catalogLoading}
          onChange={setTo}
        />
        <label className="field">
          Budget
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="field-control tabular"
          />
        </label>
        <div className="flex items-end">
          <PrimaryButton
            className="w-full"
            loading={loading}
            onClick={() => void run()}
          >
            Build story
          </PrimaryButton>
        </div>
      </section>

      {story && (
        <section className="bento space-y-4 p-5">
          <h2 className="display display-sm">
            {story.budget} {story.fromCurrency} → {story.dishName} in{" "}
            {story.cityName}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={story.points}>
                <XAxis dataKey="label" stroke="#9a968c" fontSize={11} />
                <YAxis stroke="#9a968c" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-panel, #151513)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <Bar
                  dataKey="dishPortions"
                  fill="#3d9b78"
                  radius={4}
                  isAnimationActive={!reducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {story.points.map((p) => (
              <div key={p.label} className="surface p-3 text-sm">
                <div className="text-xs text-muted">{p.label}</div>
                <div className="mt-1 font-medium tabular">
                  {formatNumber(p.dishPortions, 2)} portions
                </div>
                <div className="text-xs tabular text-muted">
                  rate {formatNumber(p.rate, 4)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
