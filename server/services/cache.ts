interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()
const MAX_ENTRIES = 800

function prune(now = Date.now()) {
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key)
  }
  if (store.size <= MAX_ENTRIES) return
  // Drop oldest-expiring entries first when over cap
  const ranked = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
  const drop = store.size - MAX_ENTRIES
  for (let i = 0; i < drop; i++) {
    store.delete(ranked[i]![0])
  }
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number): T {
  prune()
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
  return value
}

/**
 * TTL cache with singleflight — concurrent misses share one loader call
 * (avoids stampede on cold FX / weather / wiki keys).
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  const hit = getCached<T>(key)
  if (hit !== null) return { data: hit, fromCache: true }

  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) {
    const data = await pending
    return { data, fromCache: false }
  }

  const promise = (async () => {
    const data = await loader()
    setCached(key, data, ttlMs)
    return data
  })()

  inflight.set(key, promise)
  try {
    const data = await promise
    return { data, fromCache: false }
  } finally {
    inflight.delete(key)
  }
}

export const TTL = {
  fx: 30 * 60 * 1000,
  weather: 15 * 60 * 1000,
  meta: 24 * 60 * 60 * 1000,
  map: 10 * 60 * 1000,
  cities: 5 * 60 * 1000,
} as const
