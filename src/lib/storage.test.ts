import { describe, expect, it } from "vitest";
import { mergeSyncPayloads } from "./storage";
import type { UserSyncPayload } from "@shared/features";

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
  it("keeps newer item by timestamp", () => {
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
