import type { UserSyncPayload } from "../../shared/features.ts";

/**
 * In-process sync only. On Vercel serverless this is ephemeral (lost on cold
 * start / instance hop). UI treats unsigned sessions as local-only.
 */
const store = new Map<string, UserSyncPayload>();
const MAX_USERS = 2_000;

export function getSync(userKey: string): UserSyncPayload | null {
  if (!userKey || userKey.length > 200) return null;
  return store.get(userKey) ?? null;
}

export function putSync(
  userKey: string,
  payload: UserSyncPayload,
): UserSyncPayload {
  if (!userKey || userKey.length > 200) {
    throw new Error("Invalid sync key");
  }
  if (store.size >= MAX_USERS && !store.has(userKey)) {
    // Evict oldest-updated entry under memory pressure
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, value] of store) {
      const t = Date.parse(value.updatedAt) || 0;
      if (t < oldestAt) {
        oldestAt = t;
        oldestKey = key;
      }
    }
    if (oldestKey) store.delete(oldestKey);
  }
  const next: UserSyncPayload = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  store.set(userKey, next);
  return next;
}

export function emptySync(): UserSyncPayload {
  return {
    saved: [],
    alerts: [],
    trips: [],
    updatedAt: new Date().toISOString(),
  };
}
