import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CitiesListResponse, PulseResponse } from "@shared/types";
import { explainDishMetric, freshnessMeta } from "@shared/decisionMath";
import { AffiliateStrip } from "../components/AffiliateStrip";
import { BasketCard } from "../components/BasketCard";
import { CityPulseStrip } from "../components/CityPulseStrip";
import { ControlBar } from "../components/ControlBar";
import { DishHeroCard } from "../components/DishHeroCard";
import { ErrorBanner } from "../components/ErrorBanner";
import { ExplainMetric } from "../components/ExplainMetric";
import { FreshnessBadges } from "../components/FreshnessBadge";
import { Leaderboard } from "../components/Leaderboard";
import { FetchOverlay, LoadingSpinner } from "../components/LoadingSpinner";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PresetChips } from "../components/PresetChips";
import { ShareModal } from "../components/ShareModal";
import { ShortlistButton } from "../components/ShortlistButton";
import { Toast } from "../components/Toast";
import { useComparisonState } from "../hooks/useComparisonState";
import { useSeo } from "../hooks/useSeo";
import { fetchCities, fetchPulse, isAbortError } from "../lib/api";
import { hasOverrides } from "../lib/overrides";
import { uid, upsertSaved } from "../lib/storage";

export function HomePage() {
  const {
    fromSlug,
    toSlug,
    budget,
    mode,
    setFrom,
    setTo,
    setBudget,
    setMode,
    swap,
    shareUrl,
  } = useComparisonState();

  useSeo(
    "Compare",
    "Compare purchasing power between cities with live FX, wages, weather, and signature local dishes.",
  );

  const [citiesPayload, setCitiesPayload] = useState<CitiesListResponse | null>(
    null,
  );
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [pulse, setPulse] = useState<PulseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const loadCities = useCallback(() => {
    const ac = new AbortController();
    setCitiesLoading(true);
    fetchCities(ac.signal)
      .then((data) => {
        if (ac.signal.aborted) return;
        setCitiesPayload(data);
        setCitiesLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err) || ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load cities");
        setCitiesLoading(false);
      });
    return () => ac.abort();
  }, []);

  useEffect(() => loadCities(), [loadCities, retryKey]);

  useEffect(() => {
    const ac = new AbortController();
    // Budget is already debounced in the control bar; keep a short delay for city/mode swaps
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchPulse(
        {
          from: fromSlug,
          to: toSlug,
          budget,
          mode,
          wage: mode === "hourly" ? budget : null,
        },
        ac.signal,
      )
        .then((data) => {
          if (ac.signal.aborted) return;
          setPulse(data);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (isAbortError(err) || ac.signal.aborted) return;
          setError(
            err instanceof Error ? err.message : "Failed to load comparison",
          );
          setLoading(false);
        });
    }, 150);

    return () => {
      ac.abort();
      window.clearTimeout(handle);
    };
  }, [budget, fromSlug, mode, toSlug, retryKey]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToast("Shareable comparison copied");
    } catch {
      setCopied(false);
    }
    setShareOpen(true);
  }, [shareUrl]);

  const onSave = useCallback(() => {
    const label = `${fromSlug} vs ${toSlug}`;
    upsertSaved({
      id: uid("cmp"),
      fromSlug,
      toSlug,
      budget,
      mode,
      label,
      createdAt: new Date().toISOString(),
    });
    setToast("Comparison saved locally");
  }, [budget, fromSlug, mode, toSlug]);

  const cities = citiesPayload?.cities ?? [];
  const busy = loading || citiesLoading;
  const fxLabel = pulse?.fx
    ? `1 ${pulse.fx.from} = ${pulse.fx.rate.toFixed(2)} ${pulse.fx.to}`
    : "Syncing…";

  return (
    <div className="pb-16">
      <ControlBar
        cities={cities.length ? cities : []}
        fromSlug={fromSlug}
        toSlug={toSlug}
        budget={budget}
        mode={mode}
        fxLabel={fxLabel}
        fxLive={
          pulse?.sourcesStatus.fx === "ok" ||
          pulse?.sourcesStatus.fx === "cached"
        }
        loading={busy}
        onFromChange={setFrom}
        onToChange={setTo}
        onBudgetChange={setBudget}
        onModeChange={setMode}
        onSwap={swap}
        onShare={onShare}
        onSave={onSave}
      />

      <main className="page-shell mx-auto max-w-7xl !pt-[var(--space-page-y)] !pb-8">
        <div className="mb-[var(--space-section)] flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="display display-xl">
              How far does your money go?
            </h1>
            <p className="lede mt-2">
              Live FX, local wages, weather, and cultural dish purchasing power
              — from Khinkali in Tbilisi to Ramen in Tokyo.
            </p>
            <div className="mt-3">
              <PresetChips />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                to={`/decide?from=${fromSlug}&to=${toSlug}&budget=${budget}`}
                className="rounded-md border border-emerald/30 bg-emerald/10 px-3 py-1.5 text-sm text-emerald transition hover:bg-emerald/15"
              >
                Should I go?
              </Link>
              <ShortlistButton slug={toSlug} />
              <Link
                to={`/shortlist`}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-muted transition hover:text-ink"
              >
                Open shortlist
              </Link>
            </div>
          </div>
          {loading && pulse ? (
            <LoadingSpinner
              size="sm"
              label="Refreshing live data…"
              className="shrink-0"
            />
          ) : null}
        </div>

        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        )}

        {loading && !pulse ? (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm text-muted">
              <LoadingSpinner size="sm" />
              Loading comparison…
            </div>
            <LoadingSkeleton />
          </div>
        ) : pulse ? (
          <div className="relative space-y-4">
            <FetchOverlay show={loading} label="Updating live comparison…" />
            <div
              className={`space-y-4 transition-[opacity,filter] duration-200 ${
                loading ? "pointer-events-none opacity-45" : ""
              }`}
              aria-busy={loading}
            >
              <FreshnessBadges
                badges={freshnessMeta({
                  fxAsOf: pulse.fx?.asOf,
                  colSource: "seed",
                  fxStatus: pulse.sourcesStatus.fx,
                  degraded: pulse.degraded,
                  seedNote:
                    "Baselines are curated seed data enriched with live FX.",
                })}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <BasketCard
                  fromName={pulse.from.city.name}
                  toName={pulse.to.city.name}
                  homeCurrency={pulse.from.city.currencyCode}
                  basket={pulse.basket}
                  fx={pulse.fx}
                />
                <div>
                  <DishHeroCard
                    cityName={pulse.to.city.name}
                    currencyCode={pulse.from.city.currencyCode}
                    dishCurrencyCode={pulse.to.city.currencyCode}
                    budget={pulse.budget}
                    budgetMode={pulse.budgetMode}
                    dish={pulse.dish}
                    alsoTry={pulse.to.city.alsoTry}
                  />
                  {pulse.dish ? (
                    <div className="px-1">
                      <ExplainMetric>
                        {explainDishMetric({
                          dishName: pulse.dish.dishName,
                          unitLabel: pulse.dish.unitLabel,
                          localPrice: pulse.dish.localPrice,
                          budget: pulse.budget,
                          budgetInLocal:
                            pulse.dish.localPrice > 0
                              ? pulse.dish.visitorPortions *
                                pulse.dish.localPrice
                              : 0,
                          homeCurrency: pulse.from.city.currencyCode,
                          localCurrency: pulse.to.city.currencyCode,
                          portions: pulse.dish.visitorPortions,
                          overridden: hasOverrides(toSlug),
                        })}
                      </ExplainMetric>
                    </div>
                  ) : null}
                </div>
              </div>

              <CityPulseStrip from={pulse.from} to={pulse.to} />

              <AffiliateStrip
                currency={pulse.from.city.currencyCode}
                budget={pulse.budget}
                bankFee={pulse.affiliate.estimatedBankFee}
                multiFee={pulse.affiliate.estimatedMultiCurrencyFee}
                savings={pulse.affiliate.savings}
                savingsPct={pulse.affiliate.savingsPct}
              />

              {citiesPayload ? (
                <Leaderboard
                  rows={citiesPayload.leaderboard}
                  activeSlug={toSlug}
                  onSelect={setTo}
                  cityCount={citiesPayload.stats?.cityCount}
                  countryCount={citiesPayload.stats?.countryCount}
                />
              ) : citiesLoading ? (
                <div className="bento flex items-center gap-2 p-5 text-sm text-muted">
                  <LoadingSpinner size="sm" />
                  Loading city leaderboard…
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        copied={copied}
        shareUrl={shareUrl}
        fromName={pulse?.from.city.name ?? fromSlug}
        toName={pulse?.to.city.name ?? toSlug}
        budget={budget}
        currency={pulse?.from.city.currencyCode ?? "USD"}
        dishName={pulse?.dish?.dishName ?? "local dishes"}
        portions={pulse?.dish?.visitorUnitsApprox ?? 0}
        score={pulse?.purchasingPowerScore ?? 0}
      />
      <Toast message={toast} />
    </div>
  );
}
