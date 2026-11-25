import type { CityCatalogItem } from "../lib/api";

export function CitySelect({
  label,
  value,
  cities,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  cities: CityCatalogItem[];
  onChange: (slug: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-sm text-muted">
      {label}
      <select
        value={value}
        disabled={disabled || cities.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full cursor-pointer rounded-md border border-white/10 bg-panel px-3 text-sm text-ink outline-none transition focus:border-emerald/50 disabled:cursor-wait disabled:opacity-60"
      >
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name} · {c.country}
          </option>
        ))}
      </select>
    </label>
  );
}
