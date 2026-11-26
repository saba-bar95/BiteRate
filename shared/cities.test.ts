import { describe, expect, it } from "vitest";
import { CITIES, cityStats, getCity, listCities } from "./cities.ts";

describe("city catalog", () => {
  it("is well equipped with unique slugs", () => {
    const stats = cityStats();
    expect(stats.cityCount).toBeGreaterThanOrEqual(200);
    expect(stats.countryCount).toBeGreaterThanOrEqual(80);
    expect(stats.currencyCount).toBeGreaterThanOrEqual(60);

    const slugs = CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every city has required seed fields", () => {
    for (const city of listCities()) {
      expect(city.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(city.name.length).toBeGreaterThan(0);
      expect(city.currencyCode).toMatch(/^[A-Z]{3}$/);
      expect(city.iso2).toMatch(/^[A-Z]{2}$/);
      expect(city.iso3).toMatch(/^[A-Z]{3}$/);
      expect(Number.isFinite(city.lat)).toBe(true);
      expect(Number.isFinite(city.lon)).toBe(true);
      expect(city.signatureDish.localPrice).toBeGreaterThan(0);
      expect(city.localBaselinePrices.burgerMeal).toBeGreaterThan(0);
      expect(city.localBaselinePrices.oneBedRentCenter).toBeGreaterThan(0);
      expect(getCity(city.slug)?.slug).toBe(city.slug);
    }
  });
});
