import { ArrowUpRight, BedDouble, Plane } from "lucide-react";

function flightsUrl(cityName: string) {
  const q = encodeURIComponent(`Flights to ${cityName}`);
  return `https://www.google.com/travel/flights?q=${q}`;
}

function staysUrl(cityName: string, country: string) {
  const dest = encodeURIComponent(`${cityName}, ${country}`);
  return `https://www.booking.com/searchresults.html?ss=${dest}`;
}

export function BookingHandoff({
  cityName,
  country,
  compact = false,
}: {
  cityName: string;
  country: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "surface flex flex-wrap items-center gap-2 p-3"
      }
    >
      {!compact ? (
        <p className="mr-auto text-xs text-muted">
          Search flights &amp; stays (not affiliate links)
        </p>
      ) : null}
      <a
        href={flightsUrl(cityName)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-muted transition hover:border-emerald/40 hover:text-ink"
      >
        <Plane className="h-3.5 w-3.5" />
        Flights
        <ArrowUpRight className="h-3 w-3" />
      </a>
      <a
        href={staysUrl(cityName, country)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-muted transition hover:border-amber/40 hover:text-ink"
      >
        <BedDouble className="h-3.5 w-3.5" />
        Stays
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}
