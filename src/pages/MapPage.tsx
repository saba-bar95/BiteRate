import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { fetchMap } from '../lib/api'
import { formatNumber } from '../lib/format'

type Point = {
  slug: string
  name: string
  country: string
  score: number
  lat: number
  lon: number
  dish: string
}

function project(lat: number, lon: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w
  const y = ((90 - lat) / 180) * h
  return { x, y }
}

export function MapPage() {
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Point | null>(null)
  const w = 960
  const h = 480

  useEffect(() => {
    fetchMap()
      .then((d) => setPoints(d.points))
      .finally(() => setLoading(false))
  }, [])

  const max = useMemo(
    () => Math.max(...points.map((p) => p.score), 1),
    [points],
  )

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="eyebrow">Map explorer</p>
        <h1 className="display mt-1 text-3xl">Purchasing power around the world</h1>
      </div>

      <section className="bento overflow-hidden p-3 sm:p-5">
        {loading ? (
          <div className="flex h-72 items-center justify-center gap-2 text-sm text-muted">
            <LoadingSpinner /> Loading map…
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${w} ${h}`} className="min-w-full rounded-md bg-[#10100e]">
              <rect width={w} height={h} fill="#10100e" />
              {[...Array(12)].map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={(w / 12) * i}
                  x2={(w / 12) * i}
                  y1={0}
                  y2={h}
                  stroke="rgba(255,255,255,0.04)"
                />
              ))}
              {[...Array(6)].map((_, i) => (
                <line
                  key={`h${i}`}
                  y1={(h / 6) * i}
                  y2={(h / 6) * i}
                  x1={0}
                  x2={w}
                  stroke="rgba(255,255,255,0.04)"
                />
              ))}
              {points.map((p) => {
                const { x, y } = project(p.lat, p.lon, w, h)
                const r = 3 + (p.score / max) * 7
                return (
                  <circle
                    key={p.slug}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={p === active ? '#c9923a' : '#3d9b78'}
                    fillOpacity={0.85}
                    className="cursor-pointer"
                    onClick={() => setActive(p)}
                  >
                    <title>
                      {p.name}: score {p.score}
                    </title>
                  </circle>
                )
              })}
            </svg>
          </div>
        )}

        {active && (
          <div className="mt-4 surface flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-medium">
                {active.name}, {active.country}
              </div>
              <div className="text-sm text-muted">
                Score {formatNumber(active.score, 0)} · {active.dish}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/city/${active.slug}`}
                className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
              >
                City page
              </Link>
              <Link
                to={`/compare/new-york-vs-${active.slug}?budget=100`}
                className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-2 text-sm text-emerald"
              >
                Compare
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
