import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PriceAlert } from '@shared/features'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useCitiesCatalog } from '../hooks/useCitiesCatalog'
import { usePageTitle } from '../hooks/usePageTitle'
import { checkAlerts } from '../lib/api'
import { formatPct } from '../lib/format'
import {
  loadLocalSync,
  removeAlert,
  replaceAlerts,
  uid,
  upsertAlert,
} from '../lib/storage'

export function AlertsPage() {
  usePageTitle('FX Alerts')
  const { cities, error: catalogError, reload } = useCitiesCatalog()
  const currencies = useMemo(
    () => [...new Set(cities.map((c) => c.currencyCode))].sort(),
    [cities],
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadLocalSync().alerts)
  const [fromCurrency, setFrom] = useState(searchParams.get('from') || 'USD')
  const [toCurrency, setTo] = useState(searchParams.get('to') || 'GEL')
  const [threshold, setThreshold] = useState(searchParams.get('threshold') || '-2')
  const [label, setLabel] = useState(searchParams.get('label') || 'GEL getting cheaper')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const persist = (next: PriceAlert[]) => {
    setAlerts(next)
    replaceAlerts(next)
  }

  const runCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const { alerts: checked } = await checkAlerts(alerts)
      persist(checked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (alerts.length) void runCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="FX alerts"
        title="Watch currency moves"
        description="Alerts are stored locally (and syncable). They evaluate when you open this page — email/push can plug in later."
      />

      {(error || catalogError) && (
        <ErrorBanner
          message={error || catalogError || ''}
          onRetry={() => (catalogError ? reload() : void runCheck())}
        />
      )}

      <section className="bento grid gap-3 p-5 sm:grid-cols-2">
        <label className="text-sm text-muted">
          From currency
          <select
            value={fromCurrency}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 h-10 w-full cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          To currency
          <select
            value={toCurrency}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 h-10 w-full cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          Threshold %
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
            placeholder="e.g. -2"
          />
        </label>
        <label className="text-sm text-muted">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm"
          />
        </label>
        <PrimaryButton
          className="sm:col-span-2"
          onClick={() => {
            const alert: PriceAlert = {
              id: uid('alert'),
              fromCurrency,
              toCurrency,
              thresholdPct: Number(threshold) || 0,
              label,
              createdAt: new Date().toISOString(),
            }
            upsertAlert(alert)
            persist([alert, ...alerts])
            setSearchParams(
              {
                from: fromCurrency,
                to: toCurrency,
                threshold,
                label,
              },
              { replace: true },
            )
          }}
        >
          Create alert
        </PrimaryButton>
      </section>

      <section className="bento space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="display text-xl">Your alerts</h2>
          <button
            type="button"
            onClick={() => void runCheck()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/12 px-3 py-1.5 text-sm"
          >
            {loading ? <LoadingSpinner size="sm" /> : null}
            Check now
          </button>
        </div>
        {alerts.length === 0 && <p className="text-sm text-muted">No alerts yet.</p>}
        {alerts.map((a) => (
          <div key={a.id} className="surface flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">
                {a.label}{' '}
                {a.triggered ? (
                  <span className="text-xs text-emerald">Triggered</span>
                ) : (
                  <span className="text-xs text-muted">Watching</span>
                )}
              </div>
              <div className="text-xs text-muted">
                {a.fromCurrency}/{a.toCurrency} ≤ {formatPct(a.thresholdPct)} · last{' '}
                {formatPct(a.lastChange30dPct)}
              </div>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-md border border-white/12 px-3 py-1.5 text-xs text-coral"
              onClick={() => {
                removeAlert(a.id)
                persist(alerts.filter((x) => x.id !== a.id))
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </section>
    </main>
  )
}
