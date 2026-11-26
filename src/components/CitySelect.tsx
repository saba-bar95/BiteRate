import { useMemo } from "react";
import type { CityCatalogItem } from "../lib/api";
import { FieldSelect } from "./Select";

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
  const options = useMemo(
    () =>
      cities.map((c) => ({
        value: c.slug,
        label: `${c.name} · ${c.country}`,
      })),
    [cities],
  );

  return (
    <FieldSelect
      label={label}
      value={value}
      options={options}
      disabled={disabled || cities.length === 0}
      onChange={onChange}
      searchable
    />
  );
}
