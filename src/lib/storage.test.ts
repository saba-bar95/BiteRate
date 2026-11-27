import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSyncPayload } from "@shared/features";

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

function base(partial: Partial<UserSyncPayload> = {}): UserSyncPayload {
  return {
    saved: [],
    alerts: [],
    trips: [],
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("mergeSyncPayloads", () => {
  it("keeps newer item by timestamp", async () => {
    const { mergeSyncPayloads } = await import("./storage");
    const local = base({
      saved: [
        {
          id: "a",
          fromSlug: "new-york",
          toSlug: "tbilisi",
          budget: 100,
          mode: "flat",
          label: "local",
          createdAt: "2024-02-01T00:00:00.000Z",
        },
      ],
    });
    const remote = base({
      saved: [
        {
          id: "a",
          fromSlug: "new-york",
          toSlug: "lisbon",
          budget: 200,
          mode: "flat",
          label: "remote",
          createdAt: "2024-03-01T00:00:00.000Z",
        },
      ],
    });
    const { merged } = mergeSyncPayloads(local, remote);
    expect(merged.saved[0]?.label).toBe("remote");
  });
});

describe("upsertTrip", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("updates the same trip id instead of duplicating", async () => {
    const { upsertTrip, loadLocalSync } = await import("./storage");
    const plan = {
      homeCurrency: "USD",
      stops: [{ citySlug: "tbilisi", days: 4 }],
    };
    upsertTrip({
      id: "trip_1",
      name: "First",
      plan,
      savedAt: "2024-01-01T00:00:00.000Z",
    });
    upsertTrip({
      id: "trip_1",
      name: "Updated",
      plan: {
        homeCurrency: "EUR",
        stops: [{ citySlug: "lisbon", days: 5 }],
      },
      savedAt: "2024-02-01T00:00:00.000Z",
    });
    const trips = loadLocalSync().trips;
    expect(trips).toHaveLength(1);
    expect(trips[0]?.name).toBe("Updated");
    expect(trips[0]?.plan.homeCurrency).toBe("EUR");
  });
});
