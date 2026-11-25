export interface SignatureDish {
  name: string;
  wikiSlug: string;
  unitLabel: string;
  /** Price in local currency for one order/portion */
  localPrice: number;
  caloriesApprox: number;
}

export interface LocalBaselinePrices {
  burgerMeal: number;
  cappuccino: number;
  transitTicket: number;
  oneBedRentCenter: number;
  avgMonthlyNetSalary: number;
}

export interface City {
  slug: string;
  name: string;
  country: string;
  iso2: string;
  iso3: string;
  currencyCode: string;
  lat: number;
  lon: number;
  timezone: string;
  signatureDish: SignatureDish;
  /** Optional cultural companion dish (shown as a chip). */
  alsoTry?: { name: string; wikiSlug: string };
  localBaselinePrices: LocalBaselinePrices;
}

export type SourceStatus = "ok" | "degraded" | "unavailable" | "cached";

export interface SourcesStatus {
  fx: SourceStatus;
  weather: SourceStatus;
  wikipedia: SourceStatus;
  countries: SourceStatus;
  worldBank: SourceStatus;
}

export interface FxQuote {
  from: string;
  to: string;
  rate: number;
  inverse: number;
  asOf: string;
  provider: "frankfurter" | "fawaz";
  history30d: { date: string; rate: number }[];
  change30dPct: number | null;
}

export interface WeatherSnapshot {
  temperatureC: number;
  weatherCode: number;
  windSpeedKmh: number;
  description: string;
}

export interface WikiDishSummary {
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  pageUrl: string | null;
}

export interface CountryMeta {
  name: string;
  flagEmoji: string;
  flagPng: string | null;
  population: number | null;
  languages: string[];
  currencyName: string | null;
  currencySymbol: string | null;
  capital: string | null;
}

export interface MacroContext {
  gdpPerCapitaUsd: number | null;
  year: number | null;
  inflationHint: string | null;
}

export interface BasketItem {
  key: string;
  label: string;
  fromLocal: number;
  toLocal: number;
  fromInHomeCurrency: number;
  toInHomeCurrency: number;
  deltaPct: number;
}

export interface DishPurchasingPower {
  dishName: string;
  unitLabel: string;
  localPrice: number;
  visitorPortions: number;
  visitorUnitsApprox: number;
  localWagePortions: number;
  caloriesPerBudget: number;
  wiki: WikiDishSummary | null;
}

export interface CityPulse {
  city: City;
  localTime: string;
  weather: WeatherSnapshot | null;
  country: CountryMeta | null;
  macro: MacroContext | null;
}

export interface PurchasingPowerScore {
  slug: string;
  name: string;
  country: string;
  currencyCode: string;
  score: number;
  fxGain30d: number | null;
  dishValueUsd: number;
  salaryUsd: number;
  rentUsd: number;
}

export interface PulseResponse {
  from: CityPulse;
  to: CityPulse;
  budget: number;
  budgetMode: "flat" | "hourly";
  hourlyWage: number | null;
  fx: FxQuote | null;
  basket: BasketItem[];
  dish: DishPurchasingPower | null;
  homeDish: DishPurchasingPower | null;
  purchasingPowerScore: number;
  affiliate: {
    bankFeePct: number;
    estimatedBankFee: number;
    estimatedMultiCurrencyFee: number;
    savings: number;
    savingsPct: number;
  };
  sourcesStatus: SourcesStatus;
  generatedAt: string;
}

export interface CitiesListResponse {
  cities: City[];
  leaderboard: PurchasingPowerScore[];
  stats: {
    cityCount: number;
    countryCount: number;
    currencyCount: number;
    matchedCount: number;
  };
  sourcesStatus: Pick<SourcesStatus, "fx">;
  generatedAt: string;
}
