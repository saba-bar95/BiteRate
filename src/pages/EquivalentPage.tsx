import { useMemo, useState } from 'react'
import { listCities } from '@shared/cities'
import type { WageEquivalentResult } from '@shared/features'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { fetchEquivalent } from '../lib/api'
import { formatMoney, formatNumber } from '../lib/format'

export function EquivalentPage() {
  const cities = useMemo(() => listCities(), [])
  const [fromSlug, setFrom] = useState('tbilisi')
  const [toSlug, setTo] = useState('berlin')
  const [wage, setWage] = useState('1800')
  const [result, setResult] = useState<WageEquivalentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(
        await fetchEquivalent({
          fromSlug,
          toSlug,
          monthlyNetWage: Number(wage) || 0,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="eyebrow">Wage → lifestyle</p>
        <h1 className="display mt-1 text-3xl">Purchasing-power equivalent</h1>
        <p className="mt-2 text-sm text-muted">
          What monthly net wage matches your lifestyle when you move cities?
        </p>
      </div>

      <section className="bento grid gap-3 p-5 sm:grid-cols-4">
        <label className="text-xs text-muted sm:col-span-1">
          From
          <select
            value={fromSlug}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 h-10 w-full cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted sm:col-span-1">
          To
          <select
            value={toSlug}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 h-10 w-full cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted sm:col-span-1">
          Monthly net wage
          <input
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void run()}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 text-sm text-emerald"
          >
            {loading ? <LoadingSpinner size="sm" /> : null}
            Calculate
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-coral">{error}</p>}

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
                {formatNumber(result.dishPortionsFrom, 1)} →{' '}
                {formatNumber(result.dishPortionsTo, 1)}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted">
            Rent burden {formatNumber(result.rentBurdenFrom * 100, 1)}% →{' '}
            {formatNumber(result.rentBurdenTo * 100, 1)}% of wage.
          </p>
        </section>
      )}
    </main>
  )
}
