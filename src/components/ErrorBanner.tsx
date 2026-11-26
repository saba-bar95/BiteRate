import {
  AlertTriangle,
  CloudOff,
  RefreshCw,
  SearchX,
  ServerCrash,
  Timer,
} from "lucide-react";
import { friendlyError, type ErrorKind } from "../lib/errorCopy";

const ICONS: Record<ErrorKind, typeof AlertTriangle> = {
  network: CloudOff,
  not_found: SearchX,
  rate_limited: Timer,
  server: ServerCrash,
  generic: AlertTriangle,
};

export function ErrorBanner({
  message,
  error,
  onRetry,
  layout = "inline",
}: {
  /** Raw message string (legacy). Prefer `error` when you have the thrown value. */
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  layout?: "inline" | "page";
}) {
  const copy = friendlyError(error ?? message ?? "Something went wrong");
  const Icon = ICONS[copy.kind];

  if (layout === "page") {
    return (
      <div
        role="alert"
        className="fade-in mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-coral/25 bg-coral/10 text-coral">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <p className="eyebrow mt-5 text-coral">Error</p>
        <h2 className="display mt-2 text-ink">{copy.title}</h2>
        <p className="mt-2 text-sm text-muted">{copy.detail}</p>
        <p className="mt-1 text-xs text-muted/80">{copy.hint}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-md border border-coral/35 bg-coral/12 px-4 py-2 text-sm font-medium text-coral transition hover:bg-coral/20"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-start gap-3 rounded-md border border-coral/30 bg-coral/10 px-4 py-3 fade-in"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-coral/25 bg-coral/15 text-coral">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-coral">{copy.title}</p>
        <p className="mt-0.5 text-sm text-coral/85">{copy.detail}</p>
        <p className="mt-1 text-xs text-muted">{copy.hint}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-coral/40 bg-coral/15 px-3 py-1.5 text-sm font-medium text-coral transition hover:bg-coral/25"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Retry
        </button>
      ) : null}
    </div>
  );
}
