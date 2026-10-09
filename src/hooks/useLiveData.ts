import { useEffect, useState } from 'react'
import { MODEL_CONFIG } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import type { Snapshot } from '../lib/snapshot'
import { fastZonedParts } from '../lib/time'

export interface LiveMeasure {
  lastMeasuredAt: string
  deviation: number
}
type LiveMeasures = Partial<Record<RegionId, LiveMeasure>>
const key = 'gap-live-measures-v1'

function readCache(): { at: number; data: LiveMeasures } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null')
    return parsed && typeof parsed.at === 'number' ? parsed : null
  } catch {
    return null
  }
}

export function useLiveData(snapshot: Snapshot) {
  const initialCache = readCache()
  const [live, setLive] = useState<LiveMeasures>(() => initialCache?.data ?? {})
  const [status, setStatus] = useState<'loading' | 'live' | 'fallback'>(() =>
    initialCache && Object.keys(initialCache.data).length ? 'live' : 'loading',
  )
  const generatedAt = snapshot.generatedAt
  useEffect(() => {
    const cached = readCache()
    const controller = new AbortController()
    const run = async () => {
      const end = new Date(Date.now() - 3_600_000)
      end.setUTCMinutes(0, 0, 0)
      const start = new Date(end.getTime() - 48 * 3_600_000)
      const stamp = (d: Date) => d.toISOString().replace(/[-:T]/g, '').slice(0, 10)
      const entries = await Promise.all(
        REGIONS.filter((r) => r.project).map(async (region) => {
          try {
            const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${region.project}/all-access/user/hourly/${stamp(start)}/${stamp(end)}`
            const response = await fetch(url, { signal: controller.signal })
            if (!response.ok) throw new Error(String(response.status))
            const body = (await response.json()) as {
              items?: { timestamp: string; views: number }[]
            }
            const items = (body.items ?? []).map((item) => {
              const date = new Date(
                `${item.timestamp.slice(0, 4)}-${item.timestamp.slice(4, 6)}-${item.timestamp.slice(6, 8)}T${item.timestamp.slice(8, 10)}:00:00Z`,
              )
              return { ...item, date, parts: fastZonedParts(date, region.timeZone) }
            })
            const latest = items.at(-1)
            if (!latest) return null
            const hour = latest.parts.hour
            const values = items
              .slice(0, -1)
              .filter((item) => item.parts.hour === hour)
              .map((item) => item.views)
            const sorted = [...values].sort((a, b) => a - b)
            const middle = Math.floor(sorted.length / 2)
            const typical = sorted.length
              ? sorted.length % 2
                ? sorted[middle]!
                : (sorted[middle - 1]! + sorted[middle]!) / 2
              : latest.views
            const at = latest.date.toISOString()
            return [
              region.id,
              { lastMeasuredAt: at, deviation: typical ? (latest.views / typical - 1) * 100 : 0 },
            ] as const
          } catch {
            return null
          }
        }),
      )
      const data = Object.fromEntries(
        entries.filter((x): x is NonNullable<typeof x> => Boolean(x)),
      ) as LiveMeasures
      if (!controller.signal.aborted && Object.keys(data).length) {
        setStatus('live')
        setLive((previous) => {
          const merged = { ...previous, ...data }
          return JSON.stringify(previous) === JSON.stringify(merged) ? previous : merged
        })
        try {
          const previous = readCache()?.data ?? {}
          localStorage.setItem(
            key,
            JSON.stringify({ at: Date.now(), data: { ...previous, ...data } }),
          )
        } catch {
          /* Cache may be unavailable. */
        }
      } else if (!controller.signal.aborted) {
        setStatus('fallback')
      }
    }
    if (!cached || Date.now() - cached.at >= MODEL_CONFIG.runtimeCacheMinutes * 60_000) void run()
    const interval = window.setInterval(() => {
      void run()
    }, MODEL_CONFIG.liveRefreshMinutes * 60_000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [generatedAt])
  return { live, status }
}
