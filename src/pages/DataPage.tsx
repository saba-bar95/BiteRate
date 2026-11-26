import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useSeo } from "../hooks/useSeo";

export function DataPage() {
  useSeo(
    "Data & methodology",
    "How BiteRate builds purchasing-power comparisons: curated city baselines, live FX, weather, and optional COL enrichment.",
  );

  return (
    <main className="page-shell mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Transparency"
        title="Data & methodology"
        description="BiteRate is a personal tool. Numbers are directional — useful for comparing cities, not a bank quote or visa decision."
      />

      <section className="bento space-y-3 p-5">
        <h2 className="display display-sm">What is curated vs live</h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-ink">Seed baselines</span> — dish prices,
            burger meals, rent, and wage anchors live in curated city data. There
            is no free, keyless global API that covers every signature dish.
          </li>
          <li>
            <span className="text-ink">Live enrichment</span> — FX rates,
            weather, Wikipedia dish blurbs, country metadata, and World Bank GDP
            context refresh through the API when available.
          </li>
          <li>
            <span className="text-ink">Optional Numbeo</span> — if{" "}
            <code className="tabular text-ink">NUMBEO_API_KEY</code> is set on
            the server, COL snapshots can overlay seed prices; otherwise seed
            remains the source of truth.
          </li>
          <li>
            <span className="text-ink">Your overrides</span> — local price
            overrides stay in this browser unless you export/sync them.
          </li>
        </ul>
      </section>

      <section className="bento space-y-3 p-5">
        <h2 className="display display-sm">Freshness & fallbacks</h2>
        <p className="text-sm leading-relaxed text-muted">
          Compare views show freshness badges for FX and cost baselines. If the
          API is unreachable, the UI can fall back to client-side math using the
          same seed catalog so the app stays usable offline-ish — with clearly
          degraded live inputs.
        </p>
      </section>

      <section className="bento space-y-3 p-5">
        <h2 className="display display-sm">Privacy & sync</h2>
        <p className="text-sm leading-relaxed text-muted">
          Saves, shortlists, overrides, and alerts default to{" "}
          <span className="text-ink">local browser storage</span>. Cloud sync is
          optional and only available when a signed-in Cursor identity session
          is present. On typical Vercel-only deploys, treat cloud sync as
          unavailable and keep local backups.
        </p>
      </section>

      <section className="bento space-y-3 p-5">
        <h2 className="display display-sm">External booking links</h2>
        <p className="text-sm leading-relaxed text-muted">
          Flight and stay buttons open public search pages (Google Flights,
          Booking.com). They are convenience handoffs — not affiliate
          partnerships unless labeled otherwise.
        </p>
      </section>

      <p className="text-sm text-muted">
        Start with a{" "}
        <Link className="text-emerald hover:underline" to="/compare/new-york-vs-tbilisi">
          comparison
        </Link>{" "}
        or explore the{" "}
        <Link className="text-emerald hover:underline" to="/map">
          map
        </Link>
        .
      </p>
    </main>
  );
}
