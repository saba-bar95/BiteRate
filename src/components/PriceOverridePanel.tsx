import { useEffect, useState } from "react";
import type { CityPriceOverrides } from "@shared/decisionMath";
import {
  clearCityOverrides,
  getCityOverrides,
  setCityOverrides,
} from "../lib/overrides";

export function PriceOverridePanel({
  slug,
  defaults,
  onChange,
}: {
  slug: string;
  defaults: {
    dishPrice: number;
    burgerMeal: number;
    oneBedRentCenter: number;
  };
  onChange?: (overrides: CityPriceOverrides | null) => void;
}) {
  const existing = getCityOverrides(slug);
  const [dish, setDish] = useState(
    String(existing?.dishPrice ?? defaults.dishPrice),
  );
  const [burger, setBurger] = useState(
    String(existing?.burgerMeal ?? defaults.burgerMeal),
  );
  const [rent, setRent] = useState(
    String(existing?.oneBedRentCenter ?? defaults.oneBedRentCenter),
  );
  const [active, setActive] = useState(Boolean(existing));

  useEffect(() => {
    const o = getCityOverrides(slug);
    setDish(String(o?.dishPrice ?? defaults.dishPrice));
    setBurger(String(o?.burgerMeal ?? defaults.burgerMeal));
    setRent(String(o?.oneBedRentCenter ?? defaults.oneBedRentCenter));
    setActive(Boolean(o));
  }, [slug, defaults.dishPrice, defaults.burgerMeal, defaults.oneBedRentCenter]);

  const apply = () => {
    const next: CityPriceOverrides = {};
    const d = Number(dish);
    const b = Number(burger);
    const r = Number(rent);
    if (Number.isFinite(d) && d > 0) next.dishPrice = d;
    if (Number.isFinite(b) && b > 0) next.burgerMeal = b;
    if (Number.isFinite(r) && r > 0) next.oneBedRentCenter = r;
    setCityOverrides(slug, next);
    setActive(Object.keys(next).length > 0);
    onChange?.(Object.keys(next).length ? next : null);
  };

  const reset = () => {
    clearCityOverrides(slug);
    setDish(String(defaults.dishPrice));
    setBurger(String(defaults.burgerMeal));
    setRent(String(defaults.oneBedRentCenter));
    setActive(false);
    onChange?.(null);
  };

  return (
    <section className="surface fade-in space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Your prices</p>
          <p className="mt-1 text-sm text-muted">
            Override seed baselines for this city. Local only.
          </p>
        </div>
        {active ? (
          <span className="rounded-md border border-amber/30 bg-amber/10 px-2 py-0.5 text-[11px] text-amber">
            Using your prices
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="field text-xs">
          Dish
          <input
            type="number"
            min={0.01}
            step="any"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            className="field-control tabular"
          />
        </label>
        <label className="field text-xs">
          Burger meal
          <input
            type="number"
            min={0.01}
            step="any"
            value={burger}
            onChange={(e) => setBurger(e.target.value)}
            className="field-control tabular"
          />
        </label>
        <label className="field text-xs">
          1BR rent
          <input
            type="number"
            min={0.01}
            step="any"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            className="field-control tabular"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={apply}
          className="rounded-md bg-emerald/90 px-3 py-1.5 text-sm font-medium text-obsidian transition hover:bg-emerald"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-muted transition hover:text-ink"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
