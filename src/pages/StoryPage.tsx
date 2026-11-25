import { useMemo, useState } from 'react'
import { listCities } from '@shared/cities'
import type { FxStoryResult } from '@shared/features'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { fetchStory } from '../lib/api'
import { formatNumber } from '../lib/format'

export function StoryPage() {
  const cities = useMemo(() => listCities(), [])
  const [fromSlug, setFrom] = useState('new-york')
  const [toSlug, setTo] = useState('tbilisi')
  const [budget, setBudget] = useState('100')
  const [story, setStory] = useState<FxStoryResult | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      setStory(await fetchStory(fromSlug, toSlug, Number(budget) || 100))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="eyebrow">Inflation & FX story</p>
        <h1 className="display mt-1 text-3xl">What your money bought over time</h1>
      </div>

      <section className="bento grid gap-3 p-5 sm:grid-cols-4">
        <select
          value={fromSlug}
          onChange={(e) => setFrom(e.target.value)}
          className="h-10 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              From {c.name}
            </option>
          ))}
        </select>
        <select
          value={toSlug}
          onChange={(e) => setTo(e.target.value)}
          className="h-10 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm"
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              In {c.name}
            </option>
          ))}
        </select>
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          placeholder="Budget"
        />
        <button
          type="button"
          onClick={() => void run()}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 text-sm text-emerald"
        >
          {loading ? <LoadingSpinner size="sm" /> : null}
          Build story
        </button>
      </section>

      {story && (
        <section className="bento space-y-4 p-5">
          <h2 className="display text-xl">
            {story.budget} {story.fromCurrency} → {story.dishName} in {story.cityName}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={story.points}>
                <XAxis dataKey="label" stroke="#9a968c" fontSize={11} />
                <YAxis stroke="#9a968c" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#151513',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <Bar dataKey="dishPortions" fill="#3d9b78" radius={4} />
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
  )
}
