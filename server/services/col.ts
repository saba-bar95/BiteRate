import type { City } from '../../shared/types.ts'
import type { ColSnapshot } from '../../shared/features.ts'
import { cachedFetch, TTL } from './cache.ts'

function seedSnapshot(city: City, note: string): ColSnapshot {
  return {
    source: 'seed',
    available: true,
    note,
    burgerMeal: city.localBaselinePrices.burgerMeal,
    cappuccino: city.localBaselinePrices.cappuccino,
    transitTicket: city.localBaselinePrices.transitTicket,
    oneBedRentCenter: city.localBaselinePrices.oneBedRentCenter,
  }
}

/**
 * Optional Numbeo-backed cost snapshot.
 * Without NUMBEO_API_KEY, returns curated seed prices (always works).
 * The API key never leaves the server and is never logged.
 */
export async function getColSnapshot(city: City): Promise<ColSnapshot> {
  const key = process.env.NUMBEO_API_KEY?.trim()
  if (!key) {
    return seedSnapshot(
      city,
      'Using curated BiteRate seed prices. Add NUMBEO_API_KEY for live cost-of-living enrichment.',
    )
  }

  try {
    const cacheKey = `col:numbeo:${city.slug}`
    const { data } = await cachedFetch(cacheKey, TTL.meta, async () => {
      const url = new URL('https://www.numbeo.com/api/city_prices')
      url.searchParams.set('api_key', key)
      url.searchParams.set('query', `${city.name}, ${city.country}`)

      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Numbeo upstream ${res.status}`)
      const json = (await res.json()) as {
        prices?: Array<{ item_name?: string; average_price?: number }>
      }
      const prices = json.prices ?? []
      const find = (re: RegExp) =>
        prices.find((p) => re.test(p.item_name ?? ''))?.average_price

      return {
        source: 'numbeo' as const,
        available: true,
        note: 'Live cost-of-living prices from Numbeo.',
        burgerMeal: find(/meal.*mcdonald|combo meal|burger/i) ?? city.localBaselinePrices.burgerMeal,
        cappuccino: find(/cappuccino/i) ?? city.localBaselinePrices.cappuccino,
        transitTicket:
          find(/one-way ticket|local transport/i) ?? city.localBaselinePrices.transitTicket,
        oneBedRentCenter:
          find(/apartment.*1 bedroom.*centre|apartment \(1 bedroom\) in city centre/i) ??
          city.localBaselinePrices.oneBedRentCenter,
      } satisfies ColSnapshot
    })
    return data
  } catch {
    return seedSnapshot(city, 'Numbeo unavailable — falling back to curated seed prices.')
  }
}
