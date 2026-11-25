/** Always show fixed decimals for money so 1 reads as 1.00 */
export function formatMoney(
  value: number,
  currency: string,
  fractionDigits = 2,
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(fractionDigits)}`;
  }
}

/** Fixed decimal places (defaults to 2 for consistency across the UI). */
export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPct(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function deltaTone(value: number): "up" | "down" | "flat" {
  if (value > 0.5) return "up";
  if (value < -0.5) return "down";
  return "flat";
}

/**
 * Cost rows: cheaper at home (−) = green, dearer at home (+) = red.
 * Wage row: higher wage at home (+) = green, lower (−) = red.
 */
export function basketDeltaClass(deltaPct: number, key: string): string {
  const tone = deltaTone(deltaPct);
  if (tone === "flat") return "text-muted";
  const wage = key === "avgMonthlyNetSalary";
  if (tone === "down") return wage ? "text-coral" : "text-emerald";
  return wage ? "text-emerald" : "text-coral";
}
