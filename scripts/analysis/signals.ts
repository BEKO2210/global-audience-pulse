/**
 * Signals that make the Lagebericht more than a paraphrase of the page:
 * - live: the latest complete hour of real Wikimedia pageviews per measured region, compared with
 *   the median of the same local hour over the previous seven days ("ungewöhnlich aktiv?");
 * - memory: a rolling seven-day history of hourly facts, for comparisons with yesterday and the week.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { REGIONS, type RegionId } from '../../src/config/regions'
import { zonedParts } from '../../src/lib/time'

const WIKI = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate'
const USER_AGENT =
  'GlobalAudiencePulse/1.0 (https://github.com/BEKO2210/global-audience-pulse; nullmesh@protonmail.com)'
const HISTORY_HOURS = 24 * 7

const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}`

const fromStamp = (s: string) =>
  new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:00:00Z`)

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface LiveSignal {
  ort: string
  letzteStundeOrtszeit: string
  aufrufe: number
  typisch: number
  abweichungProzent: number
}

export async function liveSignals(now: Date): Promise<LiveSignal[]> {
  const end = new Date(now.getTime() - 3_600_000)
  const start = new Date(now.getTime() - 8 * 24 * 3_600_000)
  const results: LiveSignal[] = []
  for (const region of REGIONS) {
    if (!region.project) continue
    try {
      const url = `${WIKI}/${region.project}/all-access/user/hourly/${stamp(start)}/${stamp(end)}`
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!response.ok) continue
      const items = ((await response.json()).items ?? []) as { timestamp: string; views: number }[]
      const latest = items.at(-1)
      if (!latest) continue
      const latestDate = fromStamp(latest.timestamp)
      const hour = zonedParts(latestDate, region.timeZone).hour
      const sameHour = items
        .slice(0, -1)
        .filter((item) => zonedParts(fromStamp(item.timestamp), region.timeZone).hour === hour)
        .map((item) => item.views)
      if (sameHour.length < 3) continue
      const typical = median(sameHour)
      results.push({
        ort: region.city,
        letzteStundeOrtszeit: `${String(hour).padStart(2, '0')}:00`,
        aufrufe: latest.views,
        typisch: Math.round(typical),
        abweichungProzent: Math.round((latest.views / typical - 1) * 100),
      })
    } catch {
      /* one region failing must not stop the report */
    }
  }
  return results
}

export interface HistoryEntry {
  t: string
  score: number
  regions: Partial<Record<RegionId, number>>
}

export async function readHistory(path: string | undefined): Promise<HistoryEntry[]> {
  if (!path) return []
  try {
    return (await readFile(path, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as HistoryEntry)
  } catch {
    return []
  }
}

export async function writeHistory(path: string, history: HistoryEntry[], entry: HistoryEntry) {
  const cutoff = Date.parse(entry.t) - HISTORY_HOURS * 3_600_000
  const kept = [...history.filter((item) => Date.parse(item.t) > cutoff), entry]
  await writeFile(path, `${kept.map((item) => JSON.stringify(item)).join('\n')}\n`)
}

/** Deterministic comparisons the model may cite (it never computes them itself). */
export function compare(history: HistoryEntry[], now: Date, score: number) {
  const near = (hoursAgo: number) => {
    const target = now.getTime() - hoursAgo * 3_600_000
    return history.find((item) => Math.abs(Date.parse(item.t) - target) <= 40 * 60_000)
  }
  const yesterday = near(24)
  const sameHourWeek = [1, 2, 3, 4, 5, 6, 7].map((d) => near(d * 24)).filter(Boolean)
  const week = history.filter(
    (item) => Date.parse(item.t) > now.getTime() - HISTORY_HOURS * 3_600_000,
  )
  return {
    stundenImGedaechtnis: history.length,
    gesternGleicheZeit: yesterday ? yesterday.score : null,
    differenzZuGestern: yesterday ? score - yesterday.score : null,
    wochenmittelGleicheStunde: sameHourWeek.length
      ? Math.round(sameHourWeek.reduce((sum, item) => sum + item!.score, 0) / sameHourWeek.length)
      : null,
    wochenhoch: week.length ? Math.max(...week.map((item) => item.score), score) : null,
    wochentief: week.length ? Math.min(...week.map((item) => item.score), score) : null,
  }
}
