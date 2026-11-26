import type { NeighborhoodTier } from "@shared/decisionMath";

const OPTIONS: { id: NeighborhoodTier; label: string; hint: string }[] = [
  { id: "budget", label: "Budget", hint: "0.75×" },
  { id: "mid", label: "Mid", hint: "1×" },
  { id: "premium", label: "Premium", hint: "1.35×" },
];

export function NeighborhoodToggle({
  value,
  onChange,
}: {
  value: NeighborhoodTier;
  onChange: (tier: NeighborhoodTier) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Neighborhood price tier"
      className="inline-flex rounded-md border border-white/10 bg-obsidian/40 p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            title={o.hint}
            onClick={() => onChange(o.id)}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${
              active
                ? "bg-white/10 text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
