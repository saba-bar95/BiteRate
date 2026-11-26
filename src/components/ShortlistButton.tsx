import { useState } from "react";
import { ListPlus, ListX } from "lucide-react";
import {
  addToShortlist,
  isOnShortlist,
  removeFromShortlist,
} from "../lib/shortlist";

export function ShortlistButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(() => isOnShortlist(slug));

  const toggle = () => {
    if (on) {
      removeFromShortlist(slug);
      setOn(false);
    } else {
      addToShortlist(slug);
      setOn(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${
        on
          ? "border-emerald/35 bg-emerald/10 text-emerald"
          : "border-white/10 text-muted hover:text-ink"
      }`}
    >
      {on ? <ListX className="h-3.5 w-3.5" /> : <ListPlus className="h-3.5 w-3.5" />}
      {on ? "On shortlist" : "Shortlist"}
    </button>
  );
}
