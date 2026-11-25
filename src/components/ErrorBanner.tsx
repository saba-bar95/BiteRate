export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-md border border-coral/40 bg-coral/15 px-3 py-1.5 text-sm font-medium text-coral transition hover:bg-coral/25"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
