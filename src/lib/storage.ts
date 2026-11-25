import type { PriceAlert, SavedComparison, UserSyncPayload } from '@shared/features'

const KEY = 'biterate:v1'
const MAX_BYTES = 80_000

function empty(): UserSyncPayload {
  return { saved: [], alerts: [], trips: [], updatedAt: new Date().toISOString() }
}

function clampPayload(data: UserSyncPayload): UserSyncPayload {
  return {
    saved: Array.isArray(data.saved) ? data.saved.slice(0, 40) : [],
    alerts: Array.isArray(data.alerts) ? data.alerts.slice(0, 20) : [],
    trips: Array.isArray(data.trips) ? data.trips.slice(0, 20) : [],
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  }
}

function read(): UserSyncPayload {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw || raw.length > MAX_BYTES) return empty()
    const parsed = JSON.parse(raw) as UserSyncPayload
    return clampPayload(parsed)
  } catch {
    return empty()
  }
}

function write(data: UserSyncPayload) {
  const next = clampPayload({ ...data, updatedAt: new Date().toISOString() })
  const serialized = JSON.stringify(next)
  if (serialized.length > MAX_BYTES) {
    // Drop oldest saved items until under budget
    while (next.saved.length > 5 && JSON.stringify(next).length > MAX_BYTES) {
      next.saved.pop()
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Quota / private mode — keep in-memory shape for this session
  }
  return next
}

export function loadLocalSync(): UserSyncPayload {
  return read()
}

export function saveLocalSync(data: UserSyncPayload): UserSyncPayload {
  return write(data)
}

export function upsertSaved(item: SavedComparison) {
  const data = read()
  const saved = [item, ...data.saved.filter((s) => s.id !== item.id)].slice(0, 40)
  return write({ ...data, saved })
}

export function removeSaved(id: string) {
  const data = read()
  return write({ ...data, saved: data.saved.filter((s) => s.id !== id) })
}

export function upsertAlert(alert: PriceAlert) {
  const data = read()
  const alerts = [alert, ...data.alerts.filter((a) => a.id !== alert.id)].slice(0, 20)
  return write({ ...data, alerts })
}

export function removeAlert(id: string) {
  const data = read()
  return write({ ...data, alerts: data.alerts.filter((a) => a.id !== id) })
}

export function replaceAlerts(alerts: PriceAlert[]) {
  const data = read()
  return write({ ...data, alerts: alerts.slice(0, 20) })
}

export function uid(prefix: string) {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `${prefix}_${rand}`
}
