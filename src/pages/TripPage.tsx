import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TripPlanResult } from "@shared/features";
import { BookingHandoff } from "../components/BookingHandoff";
import { CatalogErrorBanner } from "../components/CatalogErrorBanner";
import { CitySelect } from "../components/CitySelect";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { TripPrintSheet } from "../components/TripPrintSheet";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { useSeo } from "../hooks/useSeo";
import { fetchTrip } from "../lib/api";
import { formatMoney, formatNumber } from "../lib/format";
import { loadLocalSync, saveLocalSync, uid } from "../lib/storage";
import { TRIP_RESTORE_KEY } from "../lib/tripRestore";

export function TripPage() {
  useSeo(
    "Trip planner",
    "Estimate multi-city trip spend for meals, transit, lodging, and local dishes.",
  );
  const {
    cities,
    loading: catalogLoading,
    error: catalogError,
    reload,
  } = useCitiesCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [homeCurrency, setHomeCurrency] = useState(
    searchParams.get("currency") || "USD",
  );
  const [stops, setStops] = useState([
    {
      citySlug: searchParams.get("s0") || "tbilisi",
      days: Number(searchParams.get("d0")) || 4,
    },
    {
      citySlug: searchParams.get("s1") || "yerevan",
      days: Number(searchParams.get("d1")) || 3,
    },
    {
      citySlug: searchParams.get("s2") || "istanbul",
      days: Number(searchParams.get("d2")) || 3,
    },
  ]);
  const [result, setResult] = useState<TripPlanResult | null>(null);
  const [tripName, setTripName] = useState(
    searchParams.get("name") || "Caucasus & Bosphorus",
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const tripId = searchParams.get("trip");
    if (!tripId) return;
    try {
      const raw = sessionStorage.getItem(TRIP_RESTORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          id: string;
          name: string;
          plan: {
            homeCurrency: string;
            stops: Array<{ citySlug: string; days: number }>;
          };
        };
        if (parsed.id === tripId) {
          setTripName(parsed.name);
          setHomeCurrency(parsed.plan.homeCurrency);
          setStops(parsed.plan.stops);
        }
      } else {
        const saved = loadLocalSync().trips.find((t) => t.id === tripId);
        if (saved) {
          setTripName(saved.name);
          setHomeCurrency(saved.plan.homeCurrency);
          setStops(saved.plan.stops);
        }
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("currency", homeCurrency);
    params.set("name", tripName);
    stops.forEach((s, i) => {
      params.set(`s${i}`, s.citySlug);
      params.set(`d${i}`, String(s.days));
    });
    const tripId = searchParams.get("trip");
    if (tripId) params.set("trip", tripId);
    setSearchParams(params, { replace: true });
  }, [homeCurrency, searchParams, setSearchParams, stops, tripName]);

  const { loading, error, run } = useAsyncAction(
    async () => {
      setResult(await fetchTrip({ homeCurrency, stops }));
      syncUrl();
    },
    "Failed",
    [homeCurrency, stops, syncUrl],
  );

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTrip = () => {
    const data = loadLocalSync();
    saveLocalSync({
      ...data,
      trips: [
        {
          id: uid("trip"),
          name: tripName,
          plan: { homeCurrency, stops },
          savedAt: new Date().toISOString(),
        },
        ...data.trips,
      ].slice(0, 20),
    });
    setToast("Trip saved locally");
    window.setTimeout(() => setToast(null), 2000);
  };

  return (
    <main className="page-shell mx-auto max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Trip budget planner"
        title="Multi-city itinerary cost"
        description="Estimate meals, transit, lodging, and signature-dish spend across stops."
      />

      <CatalogErrorBanner
        pageError={error}
        catalogError={catalogError}
        onReloadCatalog={reload}
        onRetryPage={() => void run()}
      />
      {toast && (
        <p className="text-sm text-emerald" role="status">
          {toast}
        </p>
      )}

      <section className="bento space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field">
            Trip name
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="field-control"
            />
          </label>
          <label className="field">
            Home currency
            <input
              value={homeCurrency}
              onChange={(e) => setHomeCurrency(e.target.value.toUpperCase())}
              className="field-control tabular"
            />
          </label>
        </div>

        {stops.map((stop, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <CitySelect
              label={`Stop ${i + 1}`}
              value={stop.citySlug}
              cities={cities}
              disabled={catalogLoading}
              onChange={(slug) => {
                const next = [...stops];
                next[i] = { ...stop, citySlug: slug };
                setStops(next);
              }}
            />
            <label className="field">
              Days
              <input
                type="number"
                min={1}
                value={stop.days}
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...stop, days: Number(e.target.value) || 1 };
                  setStops(next);
                }}
                className="field-control tabular"
              />
            </label>
            <button
              type="button"
              className="h-10 self-end cursor-pointer rounded-md border border-white/10 px-3 text-sm text-muted hover:text-coral"
              onClick={() => setStops(stops.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
            onClick={() =>
              setStops([
                ...stops,
                { citySlug: cities[0]?.slug || "lisbon", days: 3 },
              ])
            }
          >
            Add stop
          </button>
          <PrimaryButton loading={loading} onClick={() => void run()}>
            Recalculate
          </PrimaryButton>
          <button
            type="button"
            onClick={saveTrip}
            className="cursor-pointer rounded-md border border-white/12 px-3 py-2 text-sm"
          >
            Save trip locally
          </button>
        </div>
      </section>

      {result && (
        <section className="bento space-y-3 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="display display-sm">Estimate</h2>
            <div className="text-right">
              <div className="text-xs text-muted">{result.totalDays} days</div>
              <div className="text-lg font-semibold tabular text-emerald">
                {formatMoney(result.total, result.homeCurrency)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {result.stops.map((s) => (
              <div key={s.city.slug + s.days} className="surface p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-medium">
                    {s.city.name} · {s.days}d · {s.city.signatureDish.name}
                  </div>
                  <BookingHandoff
                    cityName={s.city.name}
                    country={s.city.country}
                    compact
                  />
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
                  <span>Meals {formatMoney(s.meals, result.homeCurrency)}</span>
                  <span>
                    Transit {formatMoney(s.transit, result.homeCurrency)}
                  </span>
                  <span>
                    Lodging{" "}
                    {formatMoney(s.estimatedLodging, result.homeCurrency)}
                  </span>
                  <span>
                    Dish culture {formatNumber(s.dishPortions, 1)} ·{" "}
                    {formatMoney(s.dishCost, result.homeCurrency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">{result.fxNote}</p>
          <TripPrintSheet name={tripName} result={result} />
        </section>
      )}
    </main>
  );
}
