import type { CountryMeta, SourceStatus } from '../../shared/types.ts'
import { cachedFetch, TTL } from './cache.ts'

interface RestCountry {
  name?: { common?: string; official?: string } | string
  flags?: { png?: string; svg?: string; emoji?: string }
  flag?: string
  population?: number
  languages?: Record<string, string> | Array<{ name?: string }>
  currencies?: Record<string, { name?: string; symbol?: string }>
  capital?: string[] | string
}

function normalizeLanguages(
  languages: RestCountry['languages'],
): string[] {
  if (!languages) return []
  if (Array.isArray(languages)) {
    return languages.map((l) => l.name).filter((n): n is string => !!n)
  }
  return Object.values(languages)
}

function normalizeName(name: RestCountry['name'], fallback: string): string {
  if (!name) return fallback
  if (typeof name === 'string') return name
  return name.common ?? name.official ?? fallback
}

function normalizeCapital(capital: RestCountry['capital']): string | null {
  if (!capital) return null
  return Array.isArray(capital) ? (capital[0] ?? null) : capital
}

function parseCountry(row: RestCountry, code: string): CountryMeta {
  const currencyEntries = Object.entries(row.currencies ?? {})
  const [, currency] = currencyEntries[0] ?? []
  const flagEmoji = row.flag ?? row.flags?.emoji ?? ''
  const flagPng =
    row.flags?.png ?? `https://flagcdn.com/w320/${code.toLowerCase()}.png`
  const name = normalizeName(row.name, code)
  if (!name || name === code) {
    // Reject deprecation stubs / empty payloads that only echo the ISO code
    if (!row.population && !row.languages && !row.currencies) {
      throw new Error('Invalid country payload')
    }
  }
  return {
    name,
    flagEmoji: flagEmoji || isoToFlagEmoji(code),
    flagPng,
    population: row.population ?? null,
    languages: normalizeLanguages(row.languages),
    currencyName: currency?.name ?? null,
    currencySymbol: currency?.symbol ?? null,
    capital: normalizeCapital(row.capital),
  }
}

function isoToFlagEmoji(iso2: string): string {
  const cc = iso2.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return ''
  return String.fromCodePoint(
    ...[...cc].map((c) => 127397 + c.charCodeAt(0)),
  )
}

async function fetchCountryRaw(code: string): Promise<RestCountry> {
  const attempts: Array<() => Promise<RestCountry>> = [
    // Official REST Countries (may require auth / be deprecated)
    async () => {
      const url = `https://restcountries.com/v3.1/alpha/${code}`
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`REST Countries ${res.status}`)
      const json = (await res.json()) as
        | RestCountry
        | RestCountry[]
        | { success?: boolean; errors?: unknown }
      if (json && typeof json === 'object' && 'success' in json && json.success === false) {
        throw new Error('REST Countries deprecated/unavailable')
      }
      const row = Array.isArray(json) ? json[0] : (json as RestCountry)
      if (!row) throw new Error('Empty REST Countries payload')
      return row
    },
    // Keyless community mirror with compatible fields
    async () => {
      const url = `https://www.apicountries.com/countries/alpha/${code}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`API Countries ${res.status}`)
      return (await res.json()) as RestCountry
    },
  ]

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Country lookup failed')
}

export async function getCountryMeta(
  iso2: string,
): Promise<{ country: CountryMeta | null; status: SourceStatus }> {
  const code = iso2.toUpperCase()
  const key = `country:v2:${code}`
  try {
    const { data, fromCache } = await cachedFetch(key, TTL.meta, async () => {
      const row = await fetchCountryRaw(code)
      return parseCountry(row, code)
    })
    return { country: data, status: fromCache ? 'cached' : 'ok' }
  } catch {
    return {
      country: {
        name: code,
        flagEmoji: isoToFlagEmoji(code),
        flagPng: `https://flagcdn.com/w320/${code.toLowerCase()}.png`,
        population: null,
        languages: [],
        currencyName: null,
        currencySymbol: null,
        capital: null,
      },
      status: 'degraded',
    }
  }
}
