const KEY = "biterate:last-compare";

export type LastCompare = {
  fromSlug: string;
  toSlug: string;
  budget: number;
  mode: "flat" | "hourly";
};

export function getLastCompare(): LastCompare | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastCompare;
    if (!parsed?.fromSlug || !parsed?.toSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getLastCompareFrom(): string | null {
  return getLastCompare()?.fromSlug ?? null;
}

export function setLastCompare(next: LastCompare) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function comparePath(fallbackBudget = 100): string {
  const last = getLastCompare();
  if (!last) return `/compare/new-york-vs-tbilisi?budget=${fallbackBudget}`;
  const qs = new URLSearchParams({
    budget: String(last.budget || fallbackBudget),
  });
  if (last.mode === "hourly") qs.set("mode", "hourly");
  return `/compare/${last.fromSlug}-vs-${last.toSlug}?${qs}`;
}
