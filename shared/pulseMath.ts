import type {
  BasketItem,
  City,
  DishPurchasingPower,
  WikiDishSummary,
} from "./types.ts";

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return amount;
  const usdFrom = a === "USD" ? 1 : rates[a];
  const usdTo = b === "USD" ? 1 : rates[b];
  if (!usdFrom || !usdTo) return amount;
  return (amount / usdFrom) * usdTo;
}

export function buildDishPower(
  city: City,
  budgetInLocal: number,
  wiki: WikiDishSummary | null,
): DishPurchasingPower {
  const price = city.signatureDish.localPrice;
  const portions = price > 0 ? budgetInLocal / price : 0;
  const wagePortions =
    price > 0 ? city.localBaselinePrices.avgMonthlyNetSalary / price : 0;
  return {
    dishName: city.signatureDish.name,
    unitLabel: city.signatureDish.unitLabel,
    localPrice: price,
    visitorPortions: portions,
    visitorUnitsApprox: Math.round(portions * 10) / 10,
    localWagePortions: wagePortions,
    caloriesPerBudget: portions * city.signatureDish.caloriesApprox,
    wiki,
  };
}

export function buildBasket(
  from: City,
  to: City,
  homeCurrency: string,
  usdRates: Record<string, number>,
): BasketItem[] {
  const keys: Array<{
    key: keyof City["localBaselinePrices"];
    label: string;
  }> = [
    { key: "burgerMeal", label: "Casual Meal / Burger" },
    { key: "cappuccino", label: "Cappuccino" },
    { key: "transitTicket", label: "1-Way Transit" },
    { key: "oneBedRentCenter", label: "1BR City-Center Rent" },
    { key: "avgMonthlyNetSalary", label: "Median Net Monthly Wage" },
  ];

  return keys.map(({ key, label }) => {
    const fromLocal = from.localBaselinePrices[key];
    const toLocal = to.localBaselinePrices[key];
    const fromInHome = convertAmount(
      fromLocal,
      from.currencyCode,
      homeCurrency,
      usdRates,
    );
    const toInHome = convertAmount(
      toLocal,
      to.currencyCode,
      homeCurrency,
      usdRates,
    );
    const deltaPct =
      fromInHome === 0 ? 0 : ((fromInHome - toInHome) / fromInHome) * 100;
    return {
      key,
      label,
      fromLocal,
      toLocal,
      fromInHomeCurrency: fromInHome,
      toInHomeCurrency: toInHome,
      deltaPct,
    };
  });
}

export function purchasingPowerScore(
  city: City,
  usdRates: Record<string, number>,
): number {
  const salaryUsd = convertAmount(
    city.localBaselinePrices.avgMonthlyNetSalary,
    city.currencyCode,
    "USD",
    usdRates,
  );
  const rentUsd = convertAmount(
    city.localBaselinePrices.oneBedRentCenter,
    city.currencyCode,
    "USD",
    usdRates,
  );
  const mealUsd = convertAmount(
    city.localBaselinePrices.burgerMeal,
    city.currencyCode,
    "USD",
    usdRates,
  );
  const dishUsd = convertAmount(
    city.signatureDish.localPrice,
    city.currencyCode,
    "USD",
    usdRates,
  );
  const disposable = Math.max(salaryUsd - rentUsd, 1);
  const affordability = disposable / Math.max(mealUsd + dishUsd, 1);
  return Math.round(
    Math.min(100, Math.max(0, Math.log10(affordability + 1) * 40 + 20)),
  );
}

export function localTimeFor(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}
