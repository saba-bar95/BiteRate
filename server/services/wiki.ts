import type { SourceStatus, WikiDishSummary } from '../../shared/types.ts'
import { cachedFetch, TTL } from './cache.ts'

interface WikiRestSummary {
  title?: string
  extract?: string
  content_urls?: { desktop?: { page?: string } }
  thumbnail?: { source?: string }
  originalimage?: { source?: string }
}

function truncateToSentences(text: string, max = 2): string {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
  return parts.slice(0, max).join(' ')
}

const WIKI_SLUG_RE = /^[A-Za-z0-9_(),.\-–—:%]+$/

export async function getDishSummary(
  wikiSlug: string,
): Promise<{ wiki: WikiDishSummary | null; status: SourceStatus }> {
  if (!wikiSlug || wikiSlug.length > 120 || !WIKI_SLUG_RE.test(wikiSlug)) {
    return {
      wiki: {
        title: 'Dish',
        extract: 'Cultural dish details temporarily unavailable.',
        thumbnailUrl: null,
        pageUrl: null,
      },
      status: 'unavailable',
    }
  }

  const key = `wiki:${wikiSlug}`
  try {
    const { data, fromCache } = await cachedFetch(key, TTL.meta, async () => {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiSlug)}`
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'BiteRate/1.0 (purchasing-power demo; contact@biterate.local)',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
      const json = (await res.json()) as WikiRestSummary
      return {
        title: json.title ?? wikiSlug.replace(/_/g, ' '),
        extract: truncateToSentences(json.extract ?? ''),
        thumbnailUrl: json.thumbnail?.source ?? json.originalimage?.source ?? null,
        pageUrl: json.content_urls?.desktop?.page ?? null,
      } satisfies WikiDishSummary
    })
    return { wiki: data, status: fromCache ? 'cached' : 'ok' }
  } catch {
    return {
      wiki: {
        title: wikiSlug.replace(/_/g, ' '),
        extract: 'Cultural dish details temporarily unavailable.',
        thumbnailUrl: null,
        pageUrl: null,
      },
      status: 'unavailable',
    }
  }
}
