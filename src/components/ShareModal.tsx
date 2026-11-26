import { useEffect, useId, useRef } from "react";
import { Check, Share2, X } from "lucide-react";
import { formatMoney, formatNumber } from "../lib/format";

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
  open: boolean;
  onClose: () => void;
  copied: boolean;
  shareUrl: string;
  fromName: string;
  toName: string;
  budget: number;
  currency: string;
  dishName: string;
  portions: number;
  score: number;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const onNativeShare = async () => {
    try {
      await navigator.share({
        title: `${fromName} → ${toName} · BiteRate`,
        text: `${formatMoney(budget, currency)} buys ~${formatNumber(portions, 2)} ${dishName} in ${toName}.`,
        url: shareUrl,
      });
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close share dialog"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-panel shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <h3 id={titleId} className="text-sm font-medium">
            Shareable comparison
          </h3>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-md border border-white/10 bg-obsidian/60 p-5">
            <div className="brand-mark text-xl text-emerald">BiteRate</div>
            <div className="display mt-2">
              {fromName} → {toName}
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatMoney(budget, currency)} buys ~{formatNumber(portions, 2)}{" "}
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

          <div className="flex flex-wrap items-center gap-2">
            {canNativeShare ? (
              <button
                type="button"
                onClick={() => void onNativeShare()}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 px-3 text-sm text-emerald"
              >
                <Share2 className="h-4 w-4" />
                Share…
              </button>
            ) : null}
            <div
              className="flex items-center gap-2 text-xs text-muted"
              role="status"
              aria-live="polite"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald" />
                  Link copied to clipboard
                </>
              ) : (
                "Copy failed — select the URL above"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
