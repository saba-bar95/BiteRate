import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
  Calculator,
  Compass,
  Globe2,
  LineChart,
  Map as MapIcon,
  MoreHorizontal,
  PiggyBank,
  Plane,
  Bookmark,
} from 'lucide-react'
import { comparePath } from '../lib/lastCompare'

const PRIMARY = [
  { match: '/compare', label: 'Compare', icon: Compass, resolveTo: () => comparePath() },
  { match: '/trip', label: 'Trip', icon: Plane, resolveTo: () => '/trip' },
  { match: '/map', label: 'Map', icon: MapIcon, resolveTo: () => '/map' },
  { match: '/saved', label: 'Saved', icon: Bookmark, resolveTo: () => '/saved' },
] as const

const MORE = [
  { to: '/equivalent', label: 'Wage PP', icon: Calculator, match: '/equivalent' },
  { to: '/story', label: 'FX Story', icon: LineChart, match: '/story' },
  { to: '/spend', label: 'Spend', icon: PiggyBank, match: '/spend' },
  { to: '/alerts', label: 'Alerts', icon: Bell, match: '/alerts' },
] as const

export function AppShell() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreActive = MORE.some((l) => pathname.startsWith(l.match))

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/8 bg-obsidian/95">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:px-6">
          <NavLink to={comparePath()} className="flex shrink-0 items-center gap-2.5 text-ink">
            <Globe2 className="h-5 w-5 text-emerald" />
            <span className="brand-mark text-xl sm:text-2xl">BiteRate</span>
          </NavLink>
          <nav
            aria-label="Main"
            className="flex flex-1 flex-wrap items-center justify-center gap-1.5"
          >
            {PRIMARY.map(({ match, label, icon: Icon, resolveTo }) => {
              const active = pathname.startsWith(match)
              return (
                <NavLink
                  key={match}
                  to={resolveTo()}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-white/10 text-ink'
                      : 'text-muted hover:bg-white/5 hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              )
            })}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen((o) => !o)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm transition ${
                  moreActive || moreOpen
                    ? 'bg-white/10 text-ink'
                    : 'text-muted hover:bg-white/5 hover:text-ink'
                }`}
              >
                <MoreHorizontal className="h-4 w-4" />
                More
              </button>
              {moreOpen ? (
                <div
                  role="menu"
                  className="absolute top-full right-0 z-50 mt-1 min-w-[11rem] rounded-md border border-white/10 bg-panel p-1 shadow-xl"
                >
                  {MORE.map(({ to, label, icon: Icon, match }) => {
                    const active = pathname.startsWith(match)
                    return (
                      <NavLink
                        key={match}
                        role="menuitem"
                        to={to}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-white/10 text-ink'
                            : 'text-muted hover:bg-white/5 hover:text-ink'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
