import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
  Calculator,
  Compass,
  Globe2,
  LineChart,
  Map as MapIcon,
  PiggyBank,
  Plane,
  Bookmark,
} from 'lucide-react'

const LINKS = [
  { to: '/compare/new-york-vs-tbilisi?budget=100', label: 'Compare', icon: Compass, match: '/compare' },
  { to: '/trip', label: 'Trip', icon: Plane, match: '/trip' },
  { to: '/equivalent', label: 'Wage PP', icon: Calculator, match: '/equivalent' },
  { to: '/story', label: 'FX Story', icon: LineChart, match: '/story' },
  { to: '/map', label: 'Map', icon: MapIcon, match: '/map' },
  { to: '/spend', label: 'Spend', icon: PiggyBank, match: '/spend' },
  { to: '/saved', label: 'Saved', icon: Bookmark, match: '/saved' },
  { to: '/alerts', label: 'Alerts', icon: Bell, match: '/alerts' },
]

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/8 bg-obsidian/95">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:px-6">
          <NavLink
            to="/compare/new-york-vs-tbilisi?budget=100"
            className="flex shrink-0 items-center gap-2.5 text-ink"
          >
            <Globe2 className="h-5 w-5 text-emerald" />
            <span className="brand-mark text-xl sm:text-2xl">BiteRate</span>
          </NavLink>
          <nav className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {LINKS.map(({ to, label, icon: Icon, match }) => {
              const active = pathname.startsWith(match)
              return (
                <NavLink
                  key={match}
                  to={to}
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
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
