import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoadingSpinner } from "./components/LoadingSpinner";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const CityPage = lazy(() =>
  import("./pages/CityPage").then((m) => ({ default: m.CityPage })),
);
const TripPage = lazy(() =>
  import("./pages/TripPage").then((m) => ({ default: m.TripPage })),
);
const EquivalentPage = lazy(() =>
  import("./pages/EquivalentPage").then((m) => ({ default: m.EquivalentPage })),
);
const StoryPage = lazy(() =>
  import("./pages/StoryPage").then((m) => ({ default: m.StoryPage })),
);
const MapPage = lazy(() =>
  import("./pages/MapPage").then((m) => ({ default: m.MapPage })),
);
const SpendPage = lazy(() =>
  import("./pages/SpendPage").then((m) => ({ default: m.SpendPage })),
);
const SavedPage = lazy(() =>
  import("./pages/SavedPage").then((m) => ({ default: m.SavedPage })),
);
const AlertsPage = lazy(() =>
  import("./pages/AlertsPage").then((m) => ({ default: m.AlertsPage })),
);

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
      <LoadingSpinner /> Loading…
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/"
          element={
            <Navigate to="/compare/new-york-vs-tbilisi?budget=100" replace />
          }
        />
        <Route
          path="/compare/:compare"
          element={
            <Suspense fallback={<PageFallback />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/city/:slug"
          element={
            <Suspense fallback={<PageFallback />}>
              <CityPage />
            </Suspense>
          }
        />
        <Route
          path="/trip"
          element={
            <Suspense fallback={<PageFallback />}>
              <TripPage />
            </Suspense>
          }
        />
        <Route
          path="/equivalent"
          element={
            <Suspense fallback={<PageFallback />}>
              <EquivalentPage />
            </Suspense>
          }
        />
        <Route
          path="/story"
          element={
            <Suspense fallback={<PageFallback />}>
              <StoryPage />
            </Suspense>
          }
        />
        <Route
          path="/map"
          element={
            <Suspense fallback={<PageFallback />}>
              <MapPage />
            </Suspense>
          }
        />
        <Route
          path="/spend"
          element={
            <Suspense fallback={<PageFallback />}>
              <SpendPage />
            </Suspense>
          }
        />
        <Route
          path="/saved"
          element={
            <Suspense fallback={<PageFallback />}>
              <SavedPage />
            </Suspense>
          }
        />
        <Route
          path="/alerts"
          element={
            <Suspense fallback={<PageFallback />}>
              <AlertsPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Navigate to="/compare/new-york-vs-tbilisi?budget=100" replace />
          }
        />
      </Route>
    </Routes>
  );
}
