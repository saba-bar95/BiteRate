import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserSyncPayload } from '@shared/features'
import { fetchMe, pullSync, pushSync } from '../lib/api'
import { loadLocalSync, removeSaved, saveLocalSync } from '../lib/storage'

export function SavedPage() {
  const [data, setData] = useState<UserSyncPayload>(() => loadLocalSync())
  const [me, setMe] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void fetchMe().then((m) => {
      if (m.signedIn) setMe(m.name || m.email || 'Signed in')
    })
  }, [])

  const refresh = () => setData(loadLocalSync())

  const syncUp = async () => {
    try {
      const local = loadLocalSync()
      await pushSync(local)
      setStatus('Synced to your Cursor identity store.')
      refresh()
    } catch {
      setStatus('Cloud sync needs a signed-in app session.')
    }
  }

  const syncDown = async () => {
    const remote = await pullSync()
    if (remote.signedIn) {
      const merged = saveLocalSync({
        saved: remote.data.saved.length ? remote.data.saved : loadLocalSync().saved,
        alerts: remote.data.alerts.length ? remote.data.alerts : loadLocalSync().alerts,
        trips: remote.data.trips.length ? remote.data.trips : loadLocalSync().trips,
        updatedAt: new Date().toISOString(),
      })
      setData(merged)
      setStatus('Pulled cloud sync into this browser.')
    } else {
      setStatus('Not signed in — showing local saves only.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Saved</p>
          <h1 className="display mt-1 text-3xl">Comparisons, trips & sync</h1>
          <p className="mt-2 text-sm text-muted">
            Stored in this browser{me ? ` · ${me}` : ''}. Optional cloud sync uses Cursor identity.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void syncDown()}
            className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
          >
            Pull sync
          </button>
          <button
            type="button"
            onClick={() => void syncUp()}
            className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald"
          >
            Push sync
          </button>
        </div>
      </div>
      {status && <p className="text-sm text-muted">{status}</p>}

      <section className="bento space-y-2 p-5">
        <h2 className="display text-xl">Saved comparisons</h2>
        {data.saved.length === 0 && (
          <p className="text-sm text-muted">None yet — save from the Compare page.</p>
        )}
        {data.saved.map((s) => (
          <div
            key={s.id}
            className="surface flex flex-wrap items-center justify-between gap-2 p-3"
          >
            <div>
              <div className="font-medium">{s.label}</div>
              <div className="text-xs text-muted">
                {s.fromSlug} → {s.toSlug} · budget {s.budget}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/compare/${s.fromSlug}-vs-${s.toSlug}?budget=${s.budget}${s.mode === 'hourly' ? '&mode=hourly' : ''}`}
                className="cursor-pointer rounded-md border border-white/12 px-3 py-1.5 text-xs"
              >
                Open
              </Link>
              <button
                type="button"
                className="cursor-pointer rounded-md border border-white/12 px-3 py-1.5 text-xs text-coral"
                onClick={() => {
                  removeSaved(s.id)
                  refresh()
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="bento space-y-2 p-5">
        <h2 className="display text-xl">Saved trips</h2>
        {data.trips.length === 0 && (
          <p className="text-sm text-muted">Save a trip from the Trip planner.</p>
        )}
        {data.trips.map((t) => (
          <div key={t.id} className="surface p-3 text-sm">
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-muted">
              {t.plan.stops.map((s) => `${s.citySlug}(${s.days}d)`).join(' → ')}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
