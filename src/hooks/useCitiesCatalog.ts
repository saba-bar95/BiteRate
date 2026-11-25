import { useEffect, useState } from 'react'
import { fetchCitiesCatalog, type CityCatalogItem } from '../lib/api'

type CatalogState = {
  cities: CityCatalogItem[]
  byCountry: Record<string, Array<{ slug: string; name: string }>>
  loading: boolean
  error: string | null
  reload: () => void
}

export function useCitiesCatalog(): CatalogState {
  const [cities, setCities] = useState<CityCatalogItem[]>([])
  const [byCountry, setByCountry] = useState<
    Record<string, Array<{ slug: string; name: string }>>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    fetchCitiesCatalog(ac.signal)
      .then((data) => {
        setCities(data.cities)
        setByCountry(data.byCountry)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load cities')
        setLoading(false)
      })
    return () => ac.abort()
  }, [tick])

  return {
    cities,
    byCountry,
    loading,
    error,
    reload: () => setTick((n) => n + 1),
  }
}
