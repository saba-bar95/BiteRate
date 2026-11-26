import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
});

describe("overrides storage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("round-trips city overrides and ignores junk", async () => {
    const {
      setCityOverrides,
      getCityOverrides,
      clearCityOverrides,
      hasOverrides,
    } = await import("./overrides");

    setCityOverrides("tbilisi", {
      dishPrice: 20,
      burgerMeal: -5,
      cappuccino: Number.NaN,
    });
    expect(getCityOverrides("tbilisi")).toEqual({ dishPrice: 20 });
    expect(hasOverrides("tbilisi")).toBe(true);
    clearCityOverrides("tbilisi");
    expect(getCityOverrides("tbilisi")).toBeNull();
  });
});

describe("shortlist storage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("adds, orders, and removes without crashing", async () => {
    const {
      addToShortlist,
      removeFromShortlist,
      setShortlistOrder,
      loadShortlist,
      isOnShortlist,
    } = await import("./shortlist");

    addToShortlist("tbilisi", "home base");
    addToShortlist("lisbon");
    expect(isOnShortlist("tbilisi")).toBe(true);
    setShortlistOrder(["lisbon", "tbilisi", "ghost"]);
    const state = loadShortlist();
    expect(state.slugs[0]).toBe("lisbon");
    removeFromShortlist("lisbon");
    expect(loadShortlist().slugs).not.toContain("lisbon");
  });
});
