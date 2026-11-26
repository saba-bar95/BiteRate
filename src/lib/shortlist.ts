const KEY = "biterate:shortlist:v1";
const MAX = 12;

export type ShortlistState = {
  slugs: string[];
  notes: Record<string, string>;
  updatedAt: string;
};

function empty(): ShortlistState {
  return { slugs: [], notes: {}, updatedAt: new Date().toISOString() };
}

function read(): ShortlistState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<ShortlistState>;
    const slugs = Array.isArray(parsed.slugs)
      ? parsed.slugs
          .filter((s): s is string => typeof s === "string" && s.length > 0)
          .slice(0, MAX)
      : [];
    const notes: Record<string, string> = {};
    if (parsed.notes && typeof parsed.notes === "object") {
      for (const slug of slugs) {
        const n = (parsed.notes as Record<string, unknown>)[slug];
        if (typeof n === "string") notes[slug] = n.slice(0, 120);
      }
    }
    return {
      slugs: [...new Set(slugs)],
      notes,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return empty();
  }
}

function write(state: ShortlistState): ShortlistState {
  const next: ShortlistState = {
    slugs: [...new Set(state.slugs)].slice(0, MAX),
    notes: state.notes,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function loadShortlist(): ShortlistState {
  return read();
}

export function isOnShortlist(slug: string): boolean {
  return read().slugs.includes(slug);
}

export function addToShortlist(slug: string, note = ""): ShortlistState {
  const state = read();
  if (!slug) return state;
  const slugs = [slug, ...state.slugs.filter((s) => s !== slug)].slice(0, MAX);
  const notes = { ...state.notes };
  if (note) notes[slug] = note.slice(0, 120);
  return write({ ...state, slugs, notes });
}

export function removeFromShortlist(slug: string): ShortlistState {
  const state = read();
  const notes = { ...state.notes };
  delete notes[slug];
  return write({
    ...state,
    slugs: state.slugs.filter((s) => s !== slug),
    notes,
  });
}

export function setShortlistOrder(slugs: string[]): ShortlistState {
  const state = read();
  const cleaned = [...new Set(slugs.filter(Boolean))].slice(0, MAX);
  const notes: Record<string, string> = {};
  for (const slug of cleaned) {
    if (state.notes[slug]) notes[slug] = state.notes[slug]!;
  }
  return write({ slugs: cleaned, notes, updatedAt: state.updatedAt });
}

export function replaceShortlist(slugs: string[]): ShortlistState {
  return setShortlistOrder(slugs);
}
