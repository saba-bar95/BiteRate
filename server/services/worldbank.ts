import type { MacroContext, SourceStatus } from "../../shared/types.ts";
import { cachedFetch, TTL } from "./cache.ts";

type WbResponse = [
  { page?: number; pages?: number } | undefined,
  Array<{ value: number | null; date: string } | null> | undefined,
];

export async function getMacroContext(
  iso3: string,
): Promise<{ macro: MacroContext | null; status: SourceStatus }> {
  const code = iso3.toUpperCase();
  const key = `wb:gdp:${code}`;
  try {
    const { data, fromCache } = await cachedFetch(key, TTL.meta, async () => {
      const url =
        `https://api.worldbank.org/v2/country/${code}/indicator/NY.GDP.PCAP.CD` +
        `?format=json&per_page=10&mrnev=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`World Bank ${res.status}`);
      const json = (await res.json()) as WbResponse;
      const rows = (json[1] ?? []).filter(
        (r): r is { value: number | null; date: string } =>
          !!r && r.value != null,
      );
      const latest = rows[0];
      return {
        gdpPerCapitaUsd: latest?.value ?? null,
        year: latest ? Number(latest.date) : null,
        inflationHint: null,
      } satisfies MacroContext;
    });
    return { macro: data, status: fromCache ? "cached" : "ok" };
  } catch {
    return { macro: null, status: "unavailable" };
  }
}
