import { Clock3, Landmark, Languages } from "lucide-react";
import type { CityPulse } from "@shared/types";
import { formatCompact, formatNumber } from "../lib/format";
import { weatherIcon } from "../lib/weatherIcon";

function PulseTile({ pulse, label }: { pulse: CityPulse; label: string }) {
  const { city, weather, country, macro, localTime } = pulse;
  const WeatherIcon = weather ? weatherIcon(weather.weatherCode) : null;

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="eyebrow">{label}</p>
          <h3 className="display mt-1 text-xl">
            {country?.flagEmoji ? `${country.flagEmoji} ` : ""}
            {city.name}
          </h3>
          <p className="text-sm text-muted">
            {city.country}
            {country?.capital ? ` · ${country.capital}` : ""}
          </p>
        </div>
        {country?.flagPng && (
          <img
            src={country.flagPng}
            alt=""
            className="h-7 w-11 rounded-sm object-cover ring-1 ring-white/10"
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 text-muted" />
          <div>
            <div className="text-xs text-muted">Local time</div>
            <div className="tabular">{localTime}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {WeatherIcon ? (
            <WeatherIcon className="mt-0.5 h-3.5 w-3.5 text-muted" />
          ) : (
            <Clock3 className="mt-0.5 h-3.5 w-3.5 text-muted" />
          )}
          <div>
            <div className="text-xs text-muted">Weather</div>
            <div className="tabular">
              {weather
                ? `${formatNumber(weather.temperatureC, 1)}°C · ${weather.description}`
                : "—"}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Languages className="mt-0.5 h-3.5 w-3.5 text-muted" />
          <div>
            <div className="text-xs text-muted">Languages</div>
            <div className="line-clamp-2">
              {country?.languages?.length ? country.languages.join(", ") : "—"}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Landmark className="mt-0.5 h-3.5 w-3.5 text-muted" />
          <div>
            <div className="text-xs text-muted">GDP / capita</div>
            <div className="tabular">
              {macro?.gdpPerCapitaUsd != null
                ? `$${formatCompact(macro.gdpPerCapitaUsd)}${macro.year ? ` (${macro.year})` : ""}`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {country?.population != null && (
        <p className="mt-3 text-xs text-muted">
          Population {formatCompact(country.population)} · {city.currencyCode}
          {country.currencySymbol ? ` (${country.currencySymbol})` : ""}
        </p>
      )}
    </div>
  );
}

export function CityPulseStrip({
  from,
  to,
}: {
  from: CityPulse;
  to: CityPulse;
}) {
  return (
    <section className="bento fade-in-delay-2 p-5 sm:p-6">
      <div className="mb-4">
        <p className="eyebrow">Live city pulse</p>
        <h2 className="display mt-1 text-2xl">Time, weather & macro context</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <PulseTile pulse={from} label="Home" />
        <PulseTile pulse={to} label="Target" />
      </div>
    </section>
  );
}
