import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoadingPane } from "./components/LoadingSpinner";

function lazyPage<M extends Record<string, ComponentType>>(
  load: () => Promise<M>,
  exportName: keyof M & string,
) {
  return lazy(() =>
    load().then((m) => ({ default: m[exportName] as ComponentType })),
  );
}

const HomePage = lazyPage(() => import("./pages/HomePage"), "HomePage");
const CityPage = lazyPage(() => import("./pages/CityPage"), "CityPage");
const TripPage = lazyPage(() => import("./pages/TripPage"), "TripPage");
const EquivalentPage = lazyPage(
  () => import("./pages/EquivalentPage"),
  "EquivalentPage",
);
const StoryPage = lazyPage(() => import("./pages/StoryPage"), "StoryPage");
const MapPage = lazyPage(() => import("./pages/MapPage"), "MapPage");
const SpendPage = lazyPage(() => import("./pages/SpendPage"), "SpendPage");
const SavedPage = lazyPage(() => import("./pages/SavedPage"), "SavedPage");
const AlertsPage = lazyPage(() => import("./pages/AlertsPage"), "AlertsPage");
const DecidePage = lazyPage(() => import("./pages/DecidePage"), "DecidePage");
const ShortlistPage = lazyPage(
  () => import("./pages/ShortlistPage"),
  "ShortlistPage",
);
const DataPage = lazyPage(() => import("./pages/DataPage"), "DataPage");

function PageFallback() {
  return (
    <LoadingPane
      label="Loading…"
      className="flex min-h-[40vh] items-center justify-center text-sm text-muted"
    />
  );
}

function page(node: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>;
}

const DEFAULT_COMPARE = "/compare/new-york-vs-tbilisi?budget=100";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to={DEFAULT_COMPARE} replace />} />
        <Route path="/compare/:compare" element={page(<HomePage />)} />
        <Route path="/city/:slug" element={page(<CityPage />)} />
        <Route path="/trip" element={page(<TripPage />)} />
        <Route path="/equivalent" element={page(<EquivalentPage />)} />
        <Route path="/story" element={page(<StoryPage />)} />
        <Route path="/map" element={page(<MapPage />)} />
        <Route path="/spend" element={page(<SpendPage />)} />
        <Route path="/saved" element={page(<SavedPage />)} />
        <Route path="/alerts" element={page(<AlertsPage />)} />
        <Route path="/decide" element={page(<DecidePage />)} />
        <Route path="/shortlist" element={page(<ShortlistPage />)} />
        <Route path="/data" element={page(<DataPage />)} />
        <Route path="*" element={<Navigate to={DEFAULT_COMPARE} replace />} />
      </Route>
    </Routes>
  );
}
