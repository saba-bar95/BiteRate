import { useEffect, useMemo, useState } from 'react'
import { listCities } from '@shared/cities'
import type { TripPlanResult } from '@shared/features'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { fetchTrip } from '../lib/api'
import { formatMoney, formatNumber } from '../lib/format'
import { loadLocalSync, saveLocalSync, uid } from '../lib/storage'

export function TripPage() {
  const cities = useMemo(() => listCities(), [])
  const [homeCurrency, setHomeCurrency] = useState('USD')
  const [stops, setStops] = useState([
    { citySlug: 'tbilisi', days: 4 },
    { citySlug: 'yerevan', days: 3 },
    { citySlug: 'istanbul', days: 3 },
  ])
  const [result, setResult] = useState<TripPlanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tripName, setTripName] = useState('Caucasus & Bosphorus')

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrip({ homeCurrency, stops })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveTrip = () => {
    const data = loadLocalSync()
    saveLocalSync({
      ...data,
      trips: [
        {
          id: uid('trip'),
          name: tripName,
          plan: { homeCurrency, stops },
          savedAt: new Date().toISOString(),
        },
        ...data.trips,
      ].slice(0, 20),
    })
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="eyebrow">Trip budget planner</p>
        <h1 className="display mt-1 text-3xl">Multi-city itinerary cost</h1>
        <p className="mt-2 text-sm text-muted">
          Estimate meals, transit, lodging, and signature-dish spend across stops.
        </p>
      </div>

      <section className="bento space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Trip name
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm"
            />
          </label>
          <label className="text-xs text-muted">
            Home currency
            <input
              value={homeCurrency}
              onChange={(e) => setHomeCurrency(e.target.value.toUpperCase())}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
            />
          </label>
        </div>

        {stops.map((stop, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <select
              value={stop.citySlug}
              onChange={(e) => {
                const next = [...stops]
                next[i] = { ...stop, citySlug: e.target.value }
                setStops(next)
              }}
              className="h-10 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
            >
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={stop.days}
              onChange={(e) => {
                const next = [...stops]
                next[i] = { ...stop, days: Number(e.target.value) || 1 }
                setStops(next)
              }}
              className="h-10 rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
            />
            <button
              type="button"
              className="h-10 cursor-pointer rounded-md border border-white/10 px-3 text-xs text-muted hover:text-coral"
              onClick={() => setStops(stops.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
            onClick={() => setStops([...stops, { citySlug: 'lisbon', days: 3 }])}
          >
            Add stop
          </button>
          <button
            type="button"
            onClick={() => void run()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald"
          >
            {loading ? <LoadingSpinner size="sm" /> : null}
            Recalculate
          </button>
          <button
            type="button"
            onClick={saveTrip}
            className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
          >
            Save trip locally
          </button>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
      </section>

      {result && (
        <section className="bento space-y-3 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="display text-xl">Estimate</h2>
            <div className="text-right">
              <div className="text-xs text-muted">{result.totalDays} days</div>
              <div className="text-lg font-semibold tabular text-emerald">
                {formatMoney(result.total, result.homeCurrency)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {result.stops.map((s) => (
              <div key={s.city.slug + s.days} className="surface p-3 text-sm">
                <div className="font-medium">
                  {s.city.name} · {s.days}d · {s.city.signatureDish.name}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
                  <span>Meals {formatMoney(s.meals, result.homeCurrency)}</span>
                  <span>Transit {formatMoney(s.transit, result.homeCurrency)}</span>
                  <span>Lodging {formatMoney(s.estimatedLodging, result.homeCurrency)}</span>
                  <span>
                    Dish culture {formatNumber(s.dishPortions, 1)} ·{' '}
                    {formatMoney(s.dishCost, result.homeCurrency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">{result.fxNote}</p>
        </section>
      )}
    </main>
  )
}
