import type { FxQuote, SourceStatus } from "../../shared/types.ts";
import { cachedFetch, TTL } from "./cache.ts";

const FRANKFURTER_CURRENCIES = new Set([
  "AUD",
  "BGN",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "USD",
  "ZAR",
]);

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`FX fetch failed ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

interface FrankfurterLatest {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface FrankfurterSeries {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

async function frankfurterQuote(from: string, to: string): Promise<FxQuote> {
  const base = from.toUpperCase();
  const quote = to.toUpperCase();

  if (base === quote) {
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: daysAgoIso(29 - i),
      rate: 1,
    }));
    return {
      from: base,
      to: quote,
      rate: 1,
      inverse: 1,
      asOf: new Date().toISOString().slice(0, 10),
      provider: "frankfurter",
      history30d: history,
      change30dPct: 0,
    };
  }

  const start = daysAgoIso(30);
  const [latest, series] = await Promise.all([
    fetchJson<FrankfurterLatest>(
      `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`,
    ),
    fetchJson<FrankfurterSeries>(
      `https://api.frankfurter.dev/v1/${start}..?base=${base}&symbols=${quote}`,
    ),
  ]);

  const rate = latest.rates[quote];
  if (!rate) throw new Error(`Frankfurter missing rate ${base}->${quote}`);

  const history30d = Object.entries(series.rates)
    .map(([date, rates]) => ({ date, rate: rates[quote] }))
    .filter((p) => typeof p.rate === "number")
    .sort((a, b) => a.date.localeCompare(b.date));

  const first = history30d[0]?.rate;
  const last = history30d[history30d.length - 1]?.rate ?? rate;
  const change30dPct =
    first && first !== 0 ? ((last - first) / first) * 100 : null;

  return {
    from: base,
    to: quote,
    rate,
    inverse: 1 / rate,
    asOf: latest.date,
    provider: "frankfurter",
    history30d,
    change30dPct,
  };
}

interface FawazPayload {
  date?: string;
  [key: string]: unknown;
}

async function fawazUsdRates(): Promise<{
  date: string;
  rates: Record<string, number>;
}> {
  const urls = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
  ];

  let lastError: unknown;
  for (const url of urls) {
    try {
      const raw = await fetchJson<FawazPayload>(url);
      const usd = raw.usd as Record<string, number> | undefined;
      if (!usd || typeof usd !== "object")
        throw new Error("Invalid Fawaz payload");
      return {
        date:
          typeof raw.date === "string"
            ? raw.date
            : new Date().toISOString().slice(0, 10),
        rates: Object.fromEntries(
          Object.entries(usd).map(([k, v]) => [k.toUpperCase(), Number(v)]),
        ),
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Fawaz FX unavailable");
}

async function fawazHistoryRate(
  from: string,
  to: string,
  date: string,
): Promise<number | null> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${from.toLowerCase()}.json`,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${from.toLowerCase()}.min.json`,
  ];
  for (const url of urls) {
    try {
      const raw = await fetchJson<FawazPayload>(url);
      const bag = raw[from.toLowerCase()] as Record<string, number> | undefined;
      const rate = bag?.[to.toLowerCase()];
      if (typeof rate === "number" && Number.isFinite(rate)) return rate;
    } catch {
      // try next
    }
  }
  return null;
}

async function fawazQuote(from: string, to: string): Promise<FxQuote> {
  const base = from.toUpperCase();
  const quote = to.toUpperCase();

  if (base === quote) {
    return frankfurterQuote(base, quote);
  }

  const { date, rates } = await fawazUsdRates();
  const usdToBase = base === "USD" ? 1 : rates[base];
  const usdToQuote = quote === "USD" ? 1 : rates[quote];
  if (!usdToBase || !usdToQuote) {
    throw new Error(`Fawaz missing currency ${base} or ${quote}`);
  }

  // rates are "1 USD = X currency", so base->quote = usdToQuote / usdToBase
  const rate = usdToQuote / usdToBase;

  const sampleDates = [30, 25, 20, 15, 10, 5, 0].map((d) => daysAgoIso(d));
  const historyPoints = await Promise.all(
    sampleDates.map(async (d) => {
      const r = await fawazHistoryRate(base, quote, d);
      return r === null ? null : { date: d, rate: r };
    }),
  );
  const history30d = historyPoints.filter(
    (p): p is { date: string; rate: number } => p !== null,
  );
  if (!history30d.some((p) => p.date === date)) {
    history30d.push({ date, rate });
  }
  history30d.sort((a, b) => a.date.localeCompare(b.date));

  const first = history30d[0]?.rate;
  const change30dPct =
    first && first !== 0 ? ((rate - first) / first) * 100 : null;

  return {
    from: base,
    to: quote,
    rate,
    inverse: 1 / rate,
    asOf: date,
    provider: "fawaz",
    history30d,
    change30dPct,
  };
}

const CURRENCY_RE = /^[A-Z]{3}$/;

function normalizeCurrency(code: string): string | null {
  const upper = code.trim().toUpperCase();
  return CURRENCY_RE.test(upper) ? upper : null;
}

export async function getFxQuote(
  from: string,
  to: string,
): Promise<{ quote: FxQuote; status: SourceStatus }> {
  const base = normalizeCurrency(from);
  const quote = normalizeCurrency(to);
  if (!base || !quote) {
    return {
      quote: {
        from: from.toUpperCase().slice(0, 3),
        to: to.toUpperCase().slice(0, 3),
        rate: 1,
        inverse: 1,
        asOf: new Date().toISOString().slice(0, 10),
        provider: "fawaz",
        history30d: [],
        change30dPct: null,
      },
      status: "unavailable",
    };
  }

  const key = `fx:${base}:${quote}`;
  try {
    const { data, fromCache } = await cachedFetch(key, TTL.fx, async () => {
      const frankfurterOk =
        FRANKFURTER_CURRENCIES.has(base) && FRANKFURTER_CURRENCIES.has(quote);
      if (frankfurterOk) {
        try {
          return await frankfurterQuote(base, quote);
        } catch {
          return await fawazQuote(base, quote);
        }
      }
      return await fawazQuote(base, quote);
    });
    return { quote: data, status: fromCache ? "cached" : "ok" };
  } catch {
    return {
      quote: {
        from: base,
        to: quote,
        rate: 1,
        inverse: 1,
        asOf: new Date().toISOString().slice(0, 10),
        provider: "fawaz",
        history30d: [],
        change30dPct: null,
      },
      status: "unavailable",
    };
  }
}

/** Convert `amount` in `fromCurrency` into `toCurrency`. */
export { convertAmount } from "../../shared/pulseMath.ts";

export async function getUsdRateMap(): Promise<{
  rates: Record<string, number>;
  status: SourceStatus;
}> {
  try {
    const { data, fromCache } = await cachedFetch(
      "fx:usd-map",
      TTL.fx,
      async () => {
        try {
          const latest = await fetchJson<FrankfurterLatest>(
            "https://api.frankfurter.dev/v1/latest?base=USD",
          );
          const rates: Record<string, number> = { USD: 1, ...latest.rates };
          // Fill gaps with Fawaz for non-Frankfurter currencies
          try {
            const fawaz = await fawazUsdRates();
            for (const [code, rate] of Object.entries(fawaz.rates)) {
              if (!rates[code]) rates[code] = rate;
            }
          } catch {
            // ok — Frankfurter alone is enough for many cities
          }
          return rates;
        } catch {
          const fawaz = await fawazUsdRates();
          return { USD: 1, ...fawaz.rates };
        }
      },
    );
    return { rates: data, status: fromCache ? "cached" : "ok" };
  } catch {
    return { rates: { USD: 1 }, status: "unavailable" };
  }
}
