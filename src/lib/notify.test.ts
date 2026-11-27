import { beforeEach, describe, expect, it, vi } from "vitest";

const session = new Map<string, string>();

vi.stubGlobal("sessionStorage", {
  getItem: (k: string) => session.get(k) ?? null,
  setItem: (k: string, v: string) => {
    session.set(k, v);
  },
  removeItem: (k: string) => {
    session.delete(k);
  },
  clear: () => session.clear(),
});

vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
});

describe("alert auto-check cooldown", () => {
  beforeEach(() => {
    session.clear();
    vi.resetModules();
  });

  it("allows check before marking, then blocks until interval passes", async () => {
    const { shouldAutoCheckAlerts, markAlertsChecked } =
      await import("./notify");

    expect(shouldAutoCheckAlerts(60_000)).toBe(true);
    // Failed check path: do not mark — still allowed
    expect(shouldAutoCheckAlerts(60_000)).toBe(true);

    markAlertsChecked();
    expect(shouldAutoCheckAlerts(60_000)).toBe(false);

    const last = Number(session.get("biterate:notify:lastCheck"));
    session.set("biterate:notify:lastCheck", String(last - 61_000));
    expect(shouldAutoCheckAlerts(60_000)).toBe(true);
  });
});
