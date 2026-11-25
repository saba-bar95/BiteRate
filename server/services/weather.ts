import type { SourceStatus, WeatherSnapshot } from '../../shared/types.ts'
import { cachedFetch, TTL } from './cache.ts'

const WMO: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
    wind_speed_10m?: number
  }
}

export async function getWeather(
  lat: number,
  lon: number,
): Promise<{ weather: WeatherSnapshot | null; status: SourceStatus }> {
  const key = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`
  try {
    const { data, fromCache } = await cachedFetch(key, TTL.weather, async () => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json = (await res.json()) as OpenMeteoResponse
      const current = json.current
      if (!current) throw new Error('No current weather')
      const code = current.weather_code ?? 0
      return {
        temperatureC: current.temperature_2m ?? 0,
        weatherCode: code,
        windSpeedKmh: current.wind_speed_10m ?? 0,
        description: WMO[code] ?? 'Unknown',
      } satisfies WeatherSnapshot
    })
    return { weather: data, status: fromCache ? 'cached' : 'ok' }
  } catch {
    return { weather: null, status: 'unavailable' }
  }
}
