import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function ExplainMetric({
  summary = "How we got this number",
  children,
}: {
  summary?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
        />
        {summary}
      </button>
      {open ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted/90 fade-in">
          {children}
        </p>
      ) : null}
    </div>
  );
}
