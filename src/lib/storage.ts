import type {
  PriceAlert,
  SavedComparison,
  UserSyncPayload,
} from "@shared/features";

const KEY = "biterate:v1";
const MAX_BYTES = 80_000;

function empty(): UserSyncPayload {
  return {
    saved: [],
    alerts: [],
    trips: [],
    updatedAt: new Date().toISOString(),
  };
}

function clampPayload(data: UserSyncPayload): UserSyncPayload {
  return {
    saved: Array.isArray(data.saved) ? data.saved.slice(0, 40) : [],
    alerts: Array.isArray(data.alerts) ? data.alerts.slice(0, 20) : [],
    trips: Array.isArray(data.trips) ? data.trips.slice(0, 20) : [],
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
  };
}

function read(): UserSyncPayload {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > MAX_BYTES) return empty();
    const parsed = JSON.parse(raw) as UserSyncPayload;
    return clampPayload(parsed);
  } catch {
    return empty();
  }
}

function write(data: UserSyncPayload) {
  const next = clampPayload({ ...data, updatedAt: new Date().toISOString() });
  const serialized = JSON.stringify(next);
  if (serialized.length > MAX_BYTES) {
    // Drop oldest saved items until under budget
    while (next.saved.length > 5 && JSON.stringify(next).length > MAX_BYTES) {
      next.saved.pop();
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — keep in-memory shape for this session
  }
  return next;
}

export function loadLocalSync(): UserSyncPayload {
  return read();
}

export function saveLocalSync(data: UserSyncPayload): UserSyncPayload {
  return write(data);
}

export function upsertSaved(item: SavedComparison) {
  const data = read();
  const saved = [item, ...data.saved.filter((s) => s.id !== item.id)].slice(
    0,
    40,
  );
  return write({ ...data, saved });
}

export function removeSaved(id: string) {
  const data = read();
  return write({ ...data, saved: data.saved.filter((s) => s.id !== id) });
}

export function upsertAlert(alert: PriceAlert) {
  const data = read();
  const alerts = [alert, ...data.alerts.filter((a) => a.id !== alert.id)].slice(
    0,
    20,
  );
  return write({ ...data, alerts });
}

export function removeAlert(id: string) {
  const data = read();
  return write({ ...data, alerts: data.alerts.filter((a) => a.id !== id) });
}

export function replaceAlerts(alerts: PriceAlert[]) {
  const data = read();
  return write({ ...data, alerts: alerts.slice(0, 20) });
}

export function upsertTrip(trip: UserSyncPayload["trips"][number]) {
  const data = read();
  const trips = [trip, ...data.trips.filter((t) => t.id !== trip.id)].slice(
    0,
    20,
  );
  return write({ ...data, trips });
}

export function uid(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function mergeById<
  T extends { id: string; createdAt?: string; savedAt?: string },
>(local: T[], remote: T[]): T[] {
  const map = byId(local);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    const localTs =
      Date.parse(existing.savedAt ?? existing.createdAt ?? "") || 0;
    const remoteTs = Date.parse(item.savedAt ?? item.createdAt ?? "") || 0;
    if (remoteTs >= localTs) map.set(item.id, item);
  }
  return [...map.values()];
}

/** Merge cloud + local sync by item id and timestamps (not wholesale replace). */
export function mergeSyncPayloads(
  local: UserSyncPayload,
  remote: UserSyncPayload,
): { merged: UserSyncPayload; discardedLocal: boolean } {
  const saved = mergeById(local.saved, remote.saved);
  const alerts = mergeById(local.alerts, remote.alerts);
  const trips = mergeById(
    local.trips as Array<{ id: string; savedAt?: string }>,
    remote.trips as Array<{ id: string; savedAt?: string }>,
  ) as UserSyncPayload["trips"];
  const localNewer =
    Date.parse(local.updatedAt || "") > Date.parse(remote.updatedAt || "");
  const discardedLocal =
    local.saved.some((s) => !saved.find((x) => x.id === s.id && x === s)) ||
    local.alerts.some((a) => !alerts.find((x) => x.id === a.id && x === a)) ||
    local.trips.some((t) => !trips.find((x) => x.id === t.id && x === t));
  return {
    merged: {
      saved: saved.slice(0, 40),
      alerts: alerts.slice(0, 20),
      trips: trips.slice(0, 20),
      updatedAt: localNewer
        ? local.updatedAt
        : remote.updatedAt || new Date().toISOString(),
    },
    discardedLocal,
  };
}
