import { Check, X } from 'lucide-react'
import { formatMoney, formatNumber } from '../lib/format'

export function ShareModal({
  open,
  onClose,
  copied,
  shareUrl,
  fromName,
  toName,
  budget,
  currency,
  dishName,
  portions,
  score,
}: {
  open: boolean
  onClose: () => void
  copied: boolean
  shareUrl: string
  fromName: string
  toName: string
  budget: number
  currency: string
  dishName: string
  portions: number
  score: number
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close share modal"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <h3 className="text-sm font-medium">Shareable comparison</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-md border border-white/10 bg-obsidian/60 p-5">
            <div className="brand-mark text-xl text-emerald">BiteRate</div>
            <div className="display mt-2 text-2xl">
              {fromName} → {toName}
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatMoney(budget, currency)} buys ~{formatNumber(portions, 2)}{' '}
              {dishName} in {toName}.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs">
              <span className="text-muted">Purchasing power index</span>
              <span className="tabular font-medium text-emerald">{score}</span>
            </div>
          </div>

          <div className="rounded-md border border-white/8 bg-obsidian/50 px-3 py-2 text-xs break-all text-muted">
            {shareUrl}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald" />
                Link copied to clipboard
              </>
            ) : (
              'Copy failed — select the URL above'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
