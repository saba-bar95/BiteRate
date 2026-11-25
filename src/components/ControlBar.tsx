import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Copy, Wallet } from 'lucide-react'
import type { City } from '@shared/types'
import { LoadingSpinner } from './LoadingSpinner'

const BUDGET_DEBOUNCE_MS = 800

export function ControlBar({
  cities,
  fromSlug,
  toSlug,
  budget,
  mode,
  fxLabel,
  fxLive,
  loading,
  onFromChange,
  onToChange,
  onBudgetChange,
  onModeChange,
  onSwap,
  onShare,
  onSave,
}: {
  cities: City[]
  fromSlug: string
  toSlug: string
  budget: number
  mode: 'flat' | 'hourly'
  fxLabel: string
  fxLive: boolean
  loading?: boolean
  onFromChange: (slug: string) => void
  onToChange: (slug: string) => void
  onBudgetChange: (value: number) => void
  onModeChange: (mode: 'flat' | 'hourly') => void
  onSwap: () => void
  onShare: () => void
  onSave?: () => void
}) {
  const [budgetDraft, setBudgetDraft] = useState(String(budget))
  const focusedRef = useRef(false)
  const debounceRef = useRef<number | null>(null)

  // Sync from URL/parent only when the field isn't being edited
  useEffect(() => {
    if (!focusedRef.current) {
      setBudgetDraft(String(budget))
    }
  }, [budget])

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current)
    }
  }, [])

  const commitBudget = (raw: string) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBudgetDraft(String(budget))
      return
    }
    // Avoid redundant URL updates / fetches for the same value
    if (parsed === budget) {
      setBudgetDraft(String(parsed))
      return
    }
    setBudgetDraft(String(parsed))
    onBudgetChange(parsed)
  }

  const scheduleCommit = (raw: string) => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      commitBudget(raw)
    }, BUDGET_DEBOUNCE_MS)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-obsidian/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex w-full max-w-5xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted">
            Home city
            <select
              disabled={loading || cities.length === 0}
              className="h-11 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-base text-ink outline-none transition focus:border-emerald/50 disabled:cursor-wait disabled:opacity-60"
              value={fromSlug}
              onChange={(e) => onFromChange(e.target.value)}
            >
              {cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name} · {city.currencyCode}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onSwap}
            disabled={loading}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center self-center rounded-md border border-white/10 bg-panel text-muted transition hover:border-emerald/40 hover:text-emerald disabled:cursor-wait disabled:opacity-60 sm:mb-0 sm:self-end"
            aria-label="Swap cities"
          >
            {loading ? <LoadingSpinner size="sm" /> : <ArrowLeftRight className="h-5 w-5" />}
          </button>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted">
            Target city
            <select
              disabled={loading || cities.length === 0}
              className="h-11 cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-base text-ink outline-none transition focus:border-emerald/50 disabled:cursor-wait disabled:opacity-60"
              value={toSlug}
              onChange={(e) => onToChange(e.target.value)}
            >
              {cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name} · {city.currencyCode}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted sm:max-w-[11rem]">
            {mode === 'hourly' ? 'Hourly wage' : 'Budget'}
            <div className="relative">
              <Wallet className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                inputMode="decimal"
                value={budgetDraft}
                onFocus={() => {
                  focusedRef.current = true
                }}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.]/g, '')
                  setBudgetDraft(next)
                  scheduleCommit(next)
                }}
                onBlur={() => {
                  focusedRef.current = false
                  if (debounceRef.current != null) {
                    window.clearTimeout(debounceRef.current)
                    debounceRef.current = null
                  }
                  commitBudget(budgetDraft)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="h-11 w-full rounded-md border border-white/10 bg-panel pr-3 pl-10 text-base tabular text-ink outline-none transition focus:border-emerald/50"
                aria-label={mode === 'hourly' ? 'Hourly wage' : 'Budget'}
              />
            </div>
          </label>

          <div className="flex flex-col gap-1.5 text-sm text-muted sm:self-end">
            Mode
            <div
              role="radiogroup"
              aria-label="Budget mode"
              className="flex h-11 overflow-hidden rounded-md border border-white/10 bg-panel"
            >
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'flat'}
                aria-pressed={mode === 'flat'}
                onClick={() => onModeChange('flat')}
                className={`cursor-pointer px-4 text-sm transition ${
                  mode === 'flat' ? 'bg-white/8 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Flat
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'hourly'}
                aria-pressed={mode === 'hourly'}
                onClick={() => onModeChange('hourly')}
                className={`cursor-pointer border-l border-white/10 px-4 text-sm transition ${
                  mode === 'hourly' ? 'bg-white/8 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                /hr
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 rounded-md border border-emerald/20 bg-emerald/8 px-3 py-2">
              <LoadingSpinner size="sm" label="Fetching…" />
            </div>
          )}
          <div className="hidden items-center gap-2 rounded-md border border-white/10 bg-panel px-3 py-2 text-sm sm:flex">
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span
                className={`h-2 w-2 rounded-sm ${fxLive ? 'bg-emerald pulse-dot' : 'bg-amber'}`}
              />
            )}
            <span className="text-muted">FX</span>
            <span className="tabular text-ink">{loading ? 'Updating…' : fxLabel}</span>
          </div>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-white/12 bg-panel px-4 text-sm font-medium text-ink transition hover:border-amber/40 hover:text-amber"
            >
              Save
            </button>
          )}
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-white/12 bg-panel px-4 text-sm font-medium text-ink transition hover:border-emerald/40 hover:text-emerald"
          >
            <Copy className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>
    </header>
  )
}
