import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FxStoryResult } from '@shared/features'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CitySelect } from '../components/CitySelect'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { useCitiesCatalog } from '../hooks/useCitiesCatalog'
import { usePageTitle } from '../hooks/usePageTitle'
import { fetchStory } from '../lib/api'
import { formatNumber } from '../lib/format'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function StoryPage() {
  usePageTitle('FX Story')
  const { cities, loading: catalogLoading, error: catalogError, reload } =
    useCitiesCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [fromSlug, setFrom] = useState(searchParams.get('from') || 'new-york')
  const [toSlug, setTo] = useState(searchParams.get('to') || 'tbilisi')
  const [budget, setBudget] = useState(searchParams.get('budget') || '100')
  const [story, setStory] = useState<FxStoryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStory(await fetchStory(fromSlug, toSlug, Number(budget) || 100))
      setSearchParams(
        { from: fromSlug, to: toSlug, budget },
        { replace: true },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build story')
    } finally {
      setLoading(false)
    }
  }, [budget, fromSlug, setSearchParams, toSlug])

  useEffect(() => {
    if (searchParams.get('from') || searchParams.get('to') || searchParams.get('budget')) {
      void run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="Inflation & FX story"
        title="What your money bought over time"
      />

      {(error || catalogError) && (
        <ErrorBanner
          message={error || catalogError || ''}
          onRetry={() => (catalogError ? reload() : void run())}
        />
      )}

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
        <label className="text-sm text-muted">
          Budget
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          />
        </label>
        <div className="flex items-end">
          <PrimaryButton className="w-full" loading={loading} onClick={() => void run()}>
            Build story
          </PrimaryButton>
        </div>
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
                    background: 'var(--color-panel, #151513)',
                    border: '1px solid rgba(255,255,255,0.1)',
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
  )
}
