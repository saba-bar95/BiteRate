import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { UserSyncPayload } from "@shared/features";
import { PageHeader } from "../components/PageHeader";
import { useSeo } from "../hooks/useSeo";
import { fetchMe, pullSync, pushSync } from "../lib/api";
import {
  loadLocalSync,
  mergeSyncPayloads,
  removeSaved,
  saveLocalSync,
} from "../lib/storage";
import { TRIP_RESTORE_KEY } from "../lib/tripRestore";

export function SavedPage() {
  useSeo(
    "Saved",
    "Your saved BiteRate comparisons and trips, with optional cloud sync.",
  );
  const [data, setData] = useState<UserSyncPayload>(() => loadLocalSync());
  const [me, setMe] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void fetchMe().then((m) => {
      if (m.signedIn) setMe(m.name || m.email || "Signed in");
    });
  }, []);

  const refresh = () => setData(loadLocalSync());

  const syncUp = async () => {
    try {
      const local = loadLocalSync();
      await pushSync(local);
      setStatus("Synced to your Cursor identity store.");
      refresh();
    } catch {
      setStatus("Cloud sync needs a signed-in app session.");
    }
  };

  const syncDown = async () => {
    try {
      const remote = await pullSync();
      if (remote.signedIn) {
        const local = loadLocalSync();
        const { merged, discardedLocal } = mergeSyncPayloads(
          local,
          remote.data,
        );
        const next = saveLocalSync(merged);
        setData(next);
        setStatus(
          discardedLocal
            ? "Pulled cloud sync — some older local items were kept via timestamps."
            : "Pulled cloud sync into this browser.",
        );
      } else {
        setStatus("Not signed in — showing local saves only.");
      }
    } catch {
      setStatus("Could not reach sync.");
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          eyebrow="Saved"
          title="Comparisons, trips & sync"
          description={`Stored in this browser${me ? ` · ${me}` : ""}. Optional cloud sync uses Cursor identity.`}
        />
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
      {status && (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {status}
        </p>
      )}

      <section className="bento space-y-2 p-5">
        <h2 className="display text-xl">Saved comparisons</h2>
        {data.saved.length === 0 && (
          <p className="text-sm text-muted">
            None yet — save from the Compare page.
          </p>
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
                to={`/compare/${s.fromSlug}-vs-${s.toSlug}?budget=${s.budget}${s.mode === "hourly" ? "&mode=hourly" : ""}`}
                className="cursor-pointer rounded-md border border-white/12 px-3 py-1.5 text-sm"
              >
                Open
              </Link>
              <button
                type="button"
                className="cursor-pointer rounded-md border border-white/12 px-3 py-1.5 text-sm text-coral"
                onClick={() => {
                  removeSaved(s.id);
                  refresh();
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
          <p className="text-sm text-muted">
            Save a trip from the Trip planner.
          </p>
        )}
        {data.trips.map((t) => (
          <div
            key={t.id}
            className="surface flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
          >
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted">
                {t.plan.stops
                  .map((s) => `${s.citySlug}(${s.days}d)`)
                  .join(" → ")}
              </div>
            </div>
            <Link
              to={`/trip?trip=${encodeURIComponent(t.id)}`}
              onClick={() => {
                try {
                  sessionStorage.setItem(TRIP_RESTORE_KEY, JSON.stringify(t));
                } catch {
                  // ignore
                }
              }}
              className="cursor-pointer rounded-md border border-emerald/30 bg-emerald/10 px-3 py-1.5 text-sm text-emerald"
            >
              Open in Trip
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}
