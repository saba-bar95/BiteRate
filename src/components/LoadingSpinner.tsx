export function LoadingSpinner({
  size = "md",
  label,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const dim =
    size === "sm"
      ? "h-3.5 w-3.5 border"
      : size === "lg"
        ? "h-8 w-8 border-2"
        : "h-5 w-5 border-2";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`${dim} animate-spin rounded-full border-emerald/25 border-t-emerald`}
        aria-hidden
      />
      {label ? <span className="text-sm text-muted">{label}</span> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
}

export function FetchOverlay({
  show,
  label = "Updating comparison…",
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center rounded-[inherit] bg-obsidian/35 pt-16 backdrop-blur-[1px] fade-in">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-md border border-white/10 bg-panel px-3.5 py-2 shadow-lg">
        <LoadingSpinner size="sm" />
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
    </div>
  );
}
