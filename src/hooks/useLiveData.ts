import { useEffect, useState } from 'react'
import { MODEL_CONFIG } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import type { Snapshot } from '../lib/snapshot'
import { zonedParts } from '../lib/time'

export interface LiveMeasure { lastMeasuredAt: string; deviation: number }
type LiveMeasures = Partial<Record<RegionId, LiveMeasure>>
const key = 'gap-live-measures-v1'

function readCache(): { at: number; data: LiveMeasures } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null')
    return parsed && typeof parsed.at === 'number' ? parsed : null
  } catch { return null }
}

export function useLiveData(snapshot: Snapshot) {
  const [live, setLive] = useState<LiveMeasures>(() => readCache()?.data ?? {})
  useEffect(() => {
    const cached = readCache()
    if (cached && Date.now() - cached.at < MODEL_CONFIG.runtimeCacheMinutes * 60_000) return
    const controller = new AbortController()
    const run = async () => {
      const end = new Date(Date.now() - 3_600_000); end.setUTCMinutes(0, 0, 0)
      const start = new Date(end.getTime() - 48 * 3_600_000)
      const stamp = (d: Date) => d.toISOString().replace(/[-:T]/g, '').slice(0, 10)
      const entries = await Promise.all(REGIONS.filter((r) => r.project).map(async (region) => {
        try {
          const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${region.project}/all-access/user/hourly/${stamp(start)}/${stamp(end)}`
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) throw new Error(String(response.status))
          const body = await response.json() as { items?: { timestamp: string; views: number }[] }
          const items = body.items ?? []; const latest = items.at(-1)
          if (!latest) return null
          const hour = zonedParts(new Date(`${latest.timestamp.slice(0,4)}-${latest.timestamp.slice(4,6)}-${latest.timestamp.slice(6,8)}T${latest.timestamp.slice(8,10)}:00:00Z`), region.timeZone).hour
          const values = items.filter((item) => zonedParts(new Date(`${item.timestamp.slice(0,4)}-${item.timestamp.slice(4,6)}-${item.timestamp.slice(6,8)}T${item.timestamp.slice(8,10)}:00:00Z`), region.timeZone).hour === hour).map((item) => item.views)
          const typical = values.length > 1 ? values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1) : latest.views
          const at = new Date(`${latest.timestamp.slice(0,4)}-${latest.timestamp.slice(4,6)}-${latest.timestamp.slice(6,8)}T${latest.timestamp.slice(8,10)}:00:00Z`).toISOString()
          return [region.id, { lastMeasuredAt: at, deviation: typical ? (latest.views / typical - 1) * 100 : 0 }] as const
        } catch { return null }
      }))
      const data = Object.fromEntries(entries.filter((x): x is NonNullable<typeof x> => Boolean(x))) as LiveMeasures
      if (Object.keys(data).length) {
        setLive(data)
        try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })) } catch { /* Cache may be unavailable. */ }
      }
    }
    void run()
    return () => controller.abort()
  }, [snapshot])
  return live
}
