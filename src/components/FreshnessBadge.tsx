import type { FreshnessBadge as Badge } from "@shared/decisionMath";

const toneClass = {
  ok: "border-emerald/30 bg-emerald/10 text-emerald",
  warn: "border-amber/30 bg-amber/10 text-amber",
  muted: "border-white/10 bg-white/5 text-muted",
} as const;

export function FreshnessBadges({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Data freshness">
      {badges.map((b) => (
        <span
          key={b.id}
          title={b.detail}
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${toneClass[b.tone]}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
