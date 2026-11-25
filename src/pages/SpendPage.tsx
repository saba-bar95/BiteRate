import { useState } from 'react'
import type { SpendCompareResult } from '@shared/features'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { fetchSpend } from '../lib/api'
import { formatMoney, formatNumber } from '../lib/format'

export function SpendPage() {
  const [amount, setAmount] = useState('1000')
  const [currency, setCurrency] = useState('USD')
  const [result, setResult] = useState<SpendCompareResult | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      setResult(await fetchSpend(Number(amount) || 0, currency))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="eyebrow">Smart spend</p>
        <h1 className="display mt-1 text-3xl">FX fee deep-dive</h1>
        <p className="mt-2 text-sm text-muted">
          Compare bank, airport, multi-currency card, and mid-market transfer fees.
        </p>
      </div>

      <section className="bento grid gap-3 p-5 sm:grid-cols-3">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-panel px-3 text-sm tabular"
          placeholder="Amount"
        />
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          className="h-10 rounded-md border border-white/10 bg-panel px-3 text-sm"
          placeholder="Currency"
        />
        <button
          type="button"
          onClick={() => void run()}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 text-sm text-emerald"
        >
          {loading ? <LoadingSpinner size="sm" /> : null}
          Compare fees
        </button>
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
