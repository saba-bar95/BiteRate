import { Link } from "react-router-dom";
import { COMPARE_PRESETS } from "@shared/decisionMath";

export function PresetChips() {
  return (
    <div className="fade-in">
      <p className="eyebrow mb-2">Try a preset</p>
      <div className="flex flex-wrap gap-2">
        {COMPARE_PRESETS.map((p) => {
          const to = `/compare/${p.from}-vs-${p.to}?budget=${p.budget}&mode=${p.mode}`;
          return (
            <Link
              key={p.id}
              to={to}
              title={p.description}
              className="rounded-md border border-white/10 bg-panel px-3 py-1.5 text-sm text-muted transition hover:border-emerald/35 hover:text-ink"
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
