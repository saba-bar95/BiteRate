import type { SourceStatus } from "@shared/types";

const LABEL: Record<SourceStatus, string> = {
  ok: "Live",
  cached: "Cached",
  degraded: "Degraded",
  unavailable: "Offline",
};

const TONE: Record<SourceStatus, string> = {
  ok: "text-emerald border-emerald/25 bg-emerald/8",
  cached: "text-amber border-amber/25 bg-amber/8",
  degraded: "text-amber border-amber/25 bg-amber/8",
  unavailable: "text-coral border-coral/25 bg-coral/8",
};

export function StatusPill({
  label,
  status,
}: {
  label: string;
  status: SourceStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${TONE[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-sm ${
          status === "ok"
            ? "bg-emerald pulse-dot"
            : status === "unavailable"
              ? "bg-coral"
              : "bg-amber"
        }`}
      />
      {label} · {LABEL[status]}
    </span>
  );
}
