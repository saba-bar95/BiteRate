import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import type { PurchasingPowerScore } from '@shared/types'
import { formatMoney, formatNumber, formatPct } from '../lib/format'

type SortKey = 'score' | 'fxGain30d' | 'dishValueUsd'

const PAGE_SIZE = 18

export function Leaderboard({
  rows,
  activeSlug,
  onSelect,
  cityCount,
  countryCount,
}: {
  rows: PurchasingPowerScore[]
  activeSlug: string
  onSelect: (slug: string) => void
  cityCount?: number
  countryCount?: number
}) {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter((row) => {
      if (country !== 'all' && row.country !== country) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.country.toLowerCase().includes(q) ||
        row.currencyCode.toLowerCase().includes(q)
      )
    })
    return [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (sortKey === 'dishValueUsd') return av - bv
      return bv - av
    })
  }, [rows, query, country, sortKey])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, country, sortKey, rows])

  const visible = filtered.slice(0, visibleCount)
  const remaining = Math.max(0, filtered.length - visibleCount)
  const nextBatch = Math.min(PAGE_SIZE, remaining)

  return (
    <section className="bento fade-in p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Global explorer</p>
          <h2 className="display mt-1 text-2xl">Purchasing power leaderboard</h2>
          <p className="mt-1 text-sm text-muted">
            {cityCount ?? rows.length} cities
            {countryCount != null ? ` · ${countryCount} countries` : ''}
            {' · '}
            showing {visible.length}
            {filtered.length !== visible.length ? ` of ${filtered.length}` : ''}
            . Multiple cities per country included.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['score', 'PP Score'],
              ['fxGain30d', '30D FX'],
              ['dishValueUsd', 'Dish Value'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                sortKey === key
                  ? 'border-white/15 bg-white/8 text-ink'
                  : 'border-white/8 text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter cities, countries, currencies…"
            className="h-10 w-full rounded-md border border-white/10 bg-obsidian/50 pr-3 pl-10 text-sm outline-none transition focus:border-emerald/50"
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-10 cursor-pointer rounded-md border border-white/10 bg-obsidian/50 px-3 text-sm outline-none transition focus:border-emerald/50 sm:w-56"
        >
          <option value="all">All countries</option>
          {countries.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((row, index) => {
          const active = row.slug === activeSlug
          return (
            <button
              key={row.slug}
              type="button"
              onClick={() => onSelect(row.slug)}
              className={`cursor-pointer rounded-md border p-4 text-left transition hover:border-white/18 ${
                active
                  ? 'border-emerald/35 bg-emerald/8'
                  : 'border-white/8 bg-obsidian/35'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs tabular text-muted">#{index + 1}</div>
                  <div className="mt-0.5 font-medium">{row.name}</div>
                  <div className="text-xs text-muted">
                    {row.country} · {row.currencyCode}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-panel px-2 py-1 text-right">
                  <div className="text-xs text-muted">Score</div>
                  <div className="text-sm font-medium tabular text-emerald">
                    {formatNumber(row.score, 0)}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted">30D FX</div>
                  <div
                    className={`tabular ${
                      (row.fxGain30d ?? 0) <= 0 ? 'text-emerald' : 'text-coral'
                    }`}
                  >
                    {formatPct(row.fxGain30d)}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Dish USD</div>
                  <div className="tabular">
                    {formatMoney(row.dishValueUsd, 'USD')}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Salary USD</div>
                  <div className="tabular">
                    {formatMoney(row.salaryUsd, 'USD')}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Rent USD</div>
                  <div className="tabular">{formatMoney(row.rentUsd, 'USD')}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {remaining > 0 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/12 bg-panel px-4 py-2.5 text-sm font-medium text-ink transition hover:border-emerald/40 hover:text-emerald"
          >
            Show {nextBatch} more
            <ChevronDown className="h-4 w-4" />
            <span className="text-xs text-muted">({remaining} left)</span>
          </button>
        </div>
      )}
    </section>
  )
}
