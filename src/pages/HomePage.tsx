import { useCallback, useEffect, useState } from 'react'
import type { CitiesListResponse, PulseResponse } from '@shared/types'
import { AffiliateStrip } from '../components/AffiliateStrip'
import { BasketCard } from '../components/BasketCard'
import { CityPulseStrip } from '../components/CityPulseStrip'
import { ControlBar } from '../components/ControlBar'
import { DishHeroCard } from '../components/DishHeroCard'
import { Leaderboard } from '../components/Leaderboard'
import { FetchOverlay, LoadingSpinner } from '../components/LoadingSpinner'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { ShareModal } from '../components/ShareModal'
import { StatusPill } from '../components/StatusPill'
import { Toast } from '../components/Toast'
import { useComparisonState } from '../hooks/useComparisonState'
import { fetchCities, fetchPulse } from '../lib/api'
import { uid, upsertSaved } from '../lib/storage'

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
  } = useComparisonState()

  const [citiesPayload, setCitiesPayload] = useState<CitiesListResponse | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [pulse, setPulse] = useState<PulseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    setCitiesLoading(true)
    fetchCities(ac.signal)
      .then((data) => {
        setCitiesPayload(data)
        setCitiesLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load cities')
        setCitiesLoading(false)
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    // Budget is already debounced in the control bar; keep a short delay for city/mode swaps
    const handle = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      fetchPulse(
        {
          from: fromSlug,
          to: toSlug,
          budget,
          mode,
          wage: mode === 'hourly' ? budget : null,
        },
        ac.signal,
      )
        .then((data) => {
          setPulse(data)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError(err instanceof Error ? err.message : 'Failed to load comparison')
          setLoading(false)
        })
    }, 150)

    return () => {
      ac.abort()
      window.clearTimeout(handle)
    }
  }, [budget, fromSlug, mode, toSlug])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(id)
  }, [toast])

  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setToast('Shareable comparison copied')
    } catch {
      setCopied(false)
    }
    setShareOpen(true)
  }, [shareUrl])

  const onSave = useCallback(() => {
    const label = `${fromSlug} vs ${toSlug}`
    upsertSaved({
      id: uid('cmp'),
      fromSlug,
      toSlug,
      budget,
      mode,
      label,
      createdAt: new Date().toISOString(),
    })
    setToast('Comparison saved locally')
  }, [budget, fromSlug, mode, toSlug])

  const cities = citiesPayload?.cities ?? []
  const busy = loading || citiesLoading
  const fxLabel = pulse?.fx
    ? `1 ${pulse.fx.from} = ${pulse.fx.rate.toFixed(2)} ${pulse.fx.to}`
    : 'Syncing…'

  return (
    <div className="min-h-screen pb-16">
      <ControlBar
        cities={cities.length ? cities : []}
        fromSlug={fromSlug}
        toSlug={toSlug}
        budget={budget}
        mode={mode}
        fxLabel={fxLabel}
        fxLive={pulse?.sourcesStatus.fx === 'ok' || pulse?.sourcesStatus.fx === 'cached'}
        loading={busy}
        onFromChange={setFrom}
        onToChange={setTo}
        onBudgetChange={setBudget}
        onModeChange={setMode}
        onSwap={swap}
        onShare={onShare}
        onSave={onSave}
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-3xl sm:text-4xl">
              How far does your money go?
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
              Live FX, local wages, weather, and cultural dish purchasing power —
              from Khinkali in Tbilisi to Ramen in Tokyo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loading && pulse && (
              <LoadingSpinner size="sm" label="Refreshing live data…" className="mr-1" />
            )}
            {pulse && (
              <>
                <StatusPill label="FX" status={pulse.sourcesStatus.fx} />
                <StatusPill label="Weather" status={pulse.sourcesStatus.weather} />
                <StatusPill label="Wiki" status={pulse.sourcesStatus.wikipedia} />
                <StatusPill label="Countries" status={pulse.sourcesStatus.countries} />
                <StatusPill label="World Bank" status={pulse.sourcesStatus.worldBank} />
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </div>
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
                loading ? 'pointer-events-none opacity-45' : ''
              }`}
              aria-busy={loading}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <BasketCard
                  fromName={pulse.from.city.name}
                  toName={pulse.to.city.name}
                  homeCurrency={pulse.from.city.currencyCode}
                  basket={pulse.basket}
                  fx={pulse.fx}
                />
                <DishHeroCard
                  cityName={pulse.to.city.name}
                  currencyCode={pulse.from.city.currencyCode}
                  dishCurrencyCode={pulse.to.city.currencyCode}
                  budget={pulse.budget}
                  budgetMode={pulse.budgetMode}
                  dish={pulse.dish}
                  alsoTry={pulse.to.city.alsoTry}
                />
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
        currency={pulse?.from.city.currencyCode ?? 'USD'}
        dishName={pulse?.dish?.dishName ?? 'local dishes'}
        portions={pulse?.dish?.visitorUnitsApprox ?? 0}
        score={pulse?.purchasingPowerScore ?? 0}
      />
      <Toast message={toast} />
    </div>
  )
}
