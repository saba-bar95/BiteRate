import { useEffect, useMemo, useState } from 'react'
import { listCities } from '@shared/cities'
import type { PriceAlert } from '@shared/features'
import { LoadingSpinner } from '../components/LoadingSpinner'
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
  const cities = useMemo(() => listCities(), [])
  const currencies = useMemo(
    () => [...new Set(cities.map((c) => c.currencyCode))].sort(),
    [cities],
  )
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadLocalSync().alerts)
  const [fromCurrency, setFrom] = useState('USD')
  const [toCurrency, setTo] = useState('GEL')
  const [threshold, setThreshold] = useState('-2')
  const [label, setLabel] = useState('GEL getting cheaper')
  const [loading, setLoading] = useState(false)

  const persist = (next: PriceAlert[]) => {
    setAlerts(next)
    replaceAlerts(next)
  }

  const runCheck = async () => {
    setLoading(true)
    try {
      const { alerts: checked } = await checkAlerts(alerts)
      persist(checked)
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
      <div>
        <p className="eyebrow">FX alerts</p>
        <h1 className="display mt-1 text-3xl">Watch currency moves</h1>
        <p className="mt-2 text-sm text-muted">
          Alerts are stored locally (and syncable). They evaluate when you open this page —
          email/push can plug in later.
        </p>
      </div>

      <section className="bento grid gap-3 p-5 sm:grid-cols-2">
        <select
          value={fromCurrency}
          onChange={(e) => setFrom(e.target.value)}
          className="h-10 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              From {c}
            </option>
          ))}
        </select>
        <select
          value={toCurrency}
          onChange={(e) => setTo(e.target.value)}
          className="h-10 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              To {c}
            </option>
          ))}
        </select>
        <input
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          placeholder="Threshold % (e.g. -2)"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-panel px-3 text-sm"
          placeholder="Label"
        />
        <button
          type="button"
          className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald sm:col-span-2"
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
          }}
        >
          Create alert
        </button>
      </section>

      <section className="bento space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="display text-xl">Your alerts</h2>
          <button
            type="button"
            onClick={() => void runCheck()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/12 px-3 py-1.5 text-xs"
          >
            {loading ? <LoadingSpinner size="sm" /> : null}
            Check now
          </button>
        </div>
        {alerts.length === 0 && (
          <p className="text-sm text-muted">No alerts yet.</p>
        )}
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
