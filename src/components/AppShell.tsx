import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  Bookmark,
  Calculator,
  Compass,
  FileText,
  Gauge,
  Globe2,
  LineChart,
  ListChecks,
  Map as MapIcon,
  PiggyBank,
  Plane,
} from "lucide-react";
import { checkAlerts } from "../lib/api";
import { comparePath } from "../lib/lastCompare";
import {
  fireAlertNotification,
  loadNotifyPrefs,
  shouldAutoCheckAlerts,
} from "../lib/notify";
import { loadLocalSync, replaceAlerts } from "../lib/storage";

const NAV = [
  {
    match: "/compare",
    label: "Compare",
    icon: Compass,
    resolveTo: () => comparePath(),
  },
  {
    match: "/decide",
    label: "Decide",
    icon: Gauge,
    resolveTo: () => "/decide",
  },
  { match: "/trip", label: "Trip", icon: Plane, resolveTo: () => "/trip" },
  { match: "/map", label: "Map", icon: MapIcon, resolveTo: () => "/map" },
  {
    match: "/shortlist",
    label: "List",
    icon: ListChecks,
    resolveTo: () => "/shortlist",
  },
  {
    match: "/saved",
    label: "Saved",
    icon: Bookmark,
    resolveTo: () => "/saved",
  },
  {
    match: "/equivalent",
    label: "Wage",
    icon: Calculator,
    resolveTo: () => "/equivalent",
  },
  {
    match: "/story",
    label: "FX",
    icon: LineChart,
    resolveTo: () => "/story",
  },
  {
    match: "/spend",
    label: "Spend",
    icon: PiggyBank,
    resolveTo: () => "/spend",
  },
  {
    match: "/alerts",
    label: "Alerts",
    icon: Bell,
    resolveTo: () => "/alerts",
  },
  {
    match: "/data",
    label: "Data",
    icon: FileText,
    resolveTo: () => "/data",
  },
] as const;

export function AppShell() {
  const { pathname } = useLocation();

  useEffect(() => {
    const prefs = loadNotifyPrefs();
    if (!prefs.enabled || !shouldAutoCheckAlerts()) return;
    const alerts = loadLocalSync().alerts;
    if (!alerts.length) return;
    void checkAlerts(alerts)
      .then(({ alerts: checked }) => {
        replaceAlerts(checked);
        for (const a of checked) {
          if (a.triggered) {
            fireAlertNotification(
              a.label || "BiteRate FX alert",
              `${a.fromCurrency}→${a.toCurrency} hit your threshold (${a.thresholdPct}%).`,
            );
          }
        }
      })
      .catch(() => {
        // quiet fail on shell mount
      });
  }, []);

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/8 bg-obsidian/95 no-print">
        <div className="page-shell mx-auto flex max-w-7xl flex-col items-center gap-2.5 !py-3 sm:flex-row sm:gap-3">
          <NavLink
            to={comparePath()}
            className="flex shrink-0 items-center gap-2.5 text-ink"
          >
            <Globe2 className="h-5 w-5 shrink-0 text-emerald" />
            <span className="brand-mark">BiteRate</span>
          </NavLink>
          <nav
            aria-label="Main"
            className="flex max-w-full flex-1 flex-wrap items-center justify-center gap-0.5 sm:justify-end"
          >
            {NAV.map(({ match, label, icon: Icon, resolveTo }) => {
              const active = pathname.startsWith(match);
              return (
                <NavLink
                  key={match}
                  to={resolveTo()}
                  className={`nav-chip inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 transition sm:gap-1.5 sm:px-2.5 ${
                    active
                      ? "bg-white/10 text-ink"
                      : "text-muted hover:bg-white/5 hover:text-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
      <Outlet />
      <footer className="no-print border-t border-white/8">
        <div className="page-shell mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 !py-3 text-xs text-muted">
          <p>
            Directional comparisons · curated baselines + live FX.{" "}
            <NavLink to="/data" className="text-emerald hover:underline">
              Methodology
            </NavLink>
          </p>
          <p>Booking links are search handoffs, not partnerships.</p>
        </div>
      </footer>
    </div>
  );
}
