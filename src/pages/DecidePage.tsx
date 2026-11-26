import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CatalogErrorBanner } from "../components/CatalogErrorBanner";
import { CitySelect } from "../components/CitySelect";
import { LoadingPane } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { useAbortableQuery } from "../hooks/useAbortableQuery";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { useSeo } from "../hooks/useSeo";
import { fetchDecide } from "../lib/api";
import { formatMoney, formatNumber } from "../lib/format";
import { getLastCompareFrom, getLastCompareTo } from "../lib/lastCompare";

export function DecidePage() {
  useSeo(
    "Decide",
    "Should you go now, or would a longer stay beat a short visit?",
  );
  const { cities, loading: catalogLoading, error: catalogError, reload } =
    useCitiesCatalog();
  const [params, setParams] = useSearchParams();
  const [from, setFrom] = useState(
    params.get("from") || getLastCompareFrom() || "new-york",
  );
  const [to, setTo] = useState(
    params.get("to") || getLastCompareTo() || "tbilisi",
  );
  const [mode, setMode] = useState<"go" | "relocate">(
    params.get("mode") === "relocate" ? "relocate" : "go",
  );
  const [budget, setBudget] = useState(Number(params.get("budget")) || 100);
  const [days, setDays] = useState(Number(params.get("days")) || 7);
  const [months, setMonths] = useState(Number(params.get("months")) || 1);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("from", from);
    next.set("to", to);
    next.set("mode", mode);
    next.set("budget", String(budget));
    next.set("days", String(days));
    next.set("months", String(months));
    setParams(next, { replace: true });
  }, [from, to, mode, budget, days, months, setParams]);

  const { data, loading, error, reload: reloadDecide } = useAbortableQuery(
    (signal) =>
      fetchDecide({ from, to, budget, mode, days, months }, signal),
    [from, to, budget, mode, days, months],
    "Failed",
  );

  const ring = useMemo(() => {
    const score = data?.shouldGo.score ?? 0;
    const r = 54;
    const c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    return { r, c, offset, score };
  }, [data?.shouldGo.score]);

  return (
    <main className="page-shell mx-auto max-w-5xl space-y-5">
      <PageHeader
        eyebrow="Decide"
        title="Should you go?"
        description="A single score from purchasing power, FX, weather, and trip cost — plus relocate vs visit break-even."
      />

      <div className="flex flex-wrap gap-1 rounded-md border border-white/10 bg-panel p-1 w-fit">
        {(
          [
            ["go", "Should I go?"],
            ["relocate", "Relocate vs visit"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded px-3 py-1.5 text-sm transition ${
              mode === id
                ? "bg-white/10 text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="bento grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <CitySelect
          label="From"
          value={from}
          cities={cities}
          disabled={catalogLoading}
          onChange={setFrom}
        />
        <CitySelect
          label="To"
          value={to}
          cities={cities}
          disabled={catalogLoading}
          onChange={setTo}
        />
        <label className="field">
          Budget context
          <input
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || 100)}
            className="field-control tabular"
          />
        </label>
        {mode === "go" ? (
          <label className="field">
            Visit days
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 7)}
              className="field-control tabular"
            />
          </label>
        ) : (
          <label className="field">
            Stay months
            <input
              type="number"
              min={0.25}
              step={0.25}
              max={36}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 1)}
              className="field-control tabular"
            />
          </label>
        )}
      </section>

      <CatalogErrorBanner
        pageError={error}
        catalogError={catalogError}
        onReloadCatalog={reload}
        onRetryPage={reloadDecide}
      />

      {loading ? (
        <LoadingPane
          label="Scoring…"
          className="flex min-h-[28vh] items-center justify-center text-muted"
        />
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <section className="bento fade-in flex flex-col items-center justify-center gap-3 p-6">
            <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
              <circle
                cx="70"
                cy="70"
                r={ring.r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="10"
              />
              <circle
                cx="70"
                cy="70"
                r={ring.r}
                fill="none"
                stroke={
                  ring.score >= 60
                    ? "#3d9b78"
                    : ring.score >= 40
                      ? "#c9923a"
                      : "#d45d5d"
                }
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ring.c}
                strokeDashoffset={ring.offset}
                transform="rotate(-90 70 70)"
                className="transition-[stroke-dashoffset] duration-700"
              />
              <text
                x="70"
                y="76"
                textAnchor="middle"
                className="fill-ink"
                style={{ fontSize: "28px", fontWeight: 600 }}
              >
                {ring.score}
              </text>
            </svg>
            <p className="text-center text-sm font-medium capitalize text-ink">
              {data.shouldGo.verdict.replace("-", " ")}
            </p>
            <p className="text-center text-xs text-muted">{data.shouldGo.headline}</p>
          </section>

          <section className="space-y-4">
            {mode === "go" ? (
              <div className="bento fade-in-delay space-y-3 p-5">
                <p className="eyebrow">Factors</p>
                {data.shouldGo.factors.map((f) => (
                  <div key={f.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{f.label}</span>
                      <span className="tabular text-muted">{f.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-emerald/80 transition-all duration-500"
                        style={{ width: `${f.score}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">{f.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bento fade-in-delay space-y-4 p-5">
                <p className="eyebrow">Relocate vs visit</p>
                <p className="text-sm text-muted">{data.relocate.narrative}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="surface p-4">
                    <p className="text-xs text-muted">Visit total</p>
                    <p className="display mt-1 tabular">
                      {formatMoney(data.relocate.visitTotalUsd, "USD")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {data.relocate.daysVisit} days · ~
                      {formatMoney(data.relocate.visitDailyUsd, "USD")}/day
                    </p>
                  </div>
                  <div className="surface p-4">
                    <p className="text-xs text-muted">Relocate total</p>
                    <p className="display mt-1 tabular">
                      {formatMoney(data.relocate.relocateTotalUsd, "USD")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatNumber(data.relocate.monthsStay, 2)} mo · ~
                      {formatMoney(data.relocate.monthlyLocalUsd, "USD")}/mo
                    </p>
                  </div>
                </div>
                {data.relocate.breakEvenDays != null ? (
                  <p className="text-sm">
                    Break-even around{" "}
                    <span className="tabular text-amber">
                      {data.relocate.breakEvenDays} visit days
                    </span>{" "}
                    vs this stay length.
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/compare/${from}-vs-${to}?budget=${budget}`}
                className="rounded-md border border-white/12 px-3 py-2 text-sm text-ink transition hover:border-emerald/40"
              >
                Open compare
              </Link>
              <Link
                to={`/trip?s0=${encodeURIComponent(to)}&d0=${days}&currency=USD`}
                className="rounded-md border border-white/12 px-3 py-2 text-sm text-muted transition hover:text-ink"
              >
                Plan a trip
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
