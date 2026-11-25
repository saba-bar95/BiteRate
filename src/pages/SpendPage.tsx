import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SpendCompareResult } from '@shared/features'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { usePageTitle } from '../hooks/usePageTitle'
import { fetchSpend } from '../lib/api'
import { formatMoney, formatNumber } from '../lib/format'

export function SpendPage() {
  usePageTitle('Smart Spend')
  const [searchParams, setSearchParams] = useSearchParams()
  const [amount, setAmount] = useState(searchParams.get('amount') || '1000')
  const [currency, setCurrency] = useState(
    (searchParams.get('currency') || 'USD').toUpperCase(),
  )
  const [result, setResult] = useState<SpendCompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await fetchSpend(Number(amount) || 0, currency))
      const params = new URLSearchParams()
      params.set('amount', amount)
      params.set('currency', currency)
      setSearchParams(params, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare fees')
    } finally {
      setLoading(false)
    }
  }, [amount, currency, setSearchParams])

  useEffect(() => {
    if (searchParams.get('amount') || searchParams.get('currency')) {
      void run()
    }
    // Deep-link auto-run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="Smart spend"
        title="FX fee deep-dive"
        description="Compare bank, airport, multi-currency card, and mid-market transfer fees."
      />

      {error && <ErrorBanner message={error} onRetry={() => void run()} />}

      <section className="bento grid gap-3 p-5 sm:grid-cols-3">
        <label className="text-sm text-muted">
          Amount
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          />
        </label>
        <label className="text-sm text-muted">
          Currency
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-panel px-3 text-sm"
          />
        </label>
        <div className="flex items-end">
          <PrimaryButton className="w-full" loading={loading} onClick={() => void run()}>
            Compare fees
          </PrimaryButton>
        </div>
      </section>

      {result && (
        <section className="bento space-y-3 p-5">
          <p className="text-sm text-muted">
            Best option saves about{' '}
            <span className="tabular text-emerald">
              {formatMoney(result.savingsVsWorst, result.currency)}
            </span>{' '}
            vs the worst fee on {formatMoney(result.amount, result.currency)}.
          </p>
          <div className="grid gap-2">
            {result.scenarios.map((s) => (
              <div
                key={s.id}
                className={`surface flex flex-wrap items-center justify-between gap-3 p-4 ${
                  s.id === result.bestId ? 'border-emerald/35' : ''
                }`}
              >
                <div>
                  <div className="font-medium">
                    {s.name}
                    {s.id === result.bestId ? (
                      <span className="ml-2 text-xs text-emerald">Best</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted">{s.blurb}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="tabular text-coral">
                    Fee {formatMoney(s.fee, result.currency)} (
                    {formatNumber(s.feePct * 100, 2)}%)
                  </div>
                  <div className="tabular text-muted">
                    Net {formatMoney(s.net, result.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Placeholder CTAs for multi-currency cards / transfer partners can plug in here.
          </p>
        </section>
      )}
    </main>
  )
}
