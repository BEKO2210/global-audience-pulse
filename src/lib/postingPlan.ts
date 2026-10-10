// T-072 "Was & wann posten": for each platform, the next hour that is good for the selected audience (live
// score model) AND recommended by the platform studies in the audience's own local time (playbooks).
import {
  PLAYBOOKS,
  studyHours,
  type PlatformId,
  type Playbook,
  type Weekday,
} from '../data/playbooks'
import type { RegionId } from '../config/regions'
import { fastZonedParts } from './time'

export interface AudienceRegion {
  id: RegionId
  city: string
  timeZone: string
  /** normalised share of the audience (sums to 1 over the selection) */
  weight: number
}

export type PickQuality = 'gut' | 'bestes-verfuegbar'

export interface PostingPick {
  platform: PlatformId
  at: Date
  score: number
  /** share of the audience (by weight) for whom the studies recommend this local hour, 0–1 */
  support: number
  supportCities: string[]
  quality: PickQuality
}

const WEEKDAY: Record<string, Weekday> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
const HOUR_MS = 3_600_000

/** Union of all studies' recommended hours for a platform on a local weekday. */
function platformHours(playbook: Playbook, day: Weekday) {
  const hours = new Set<number>()
  for (const study of playbook.times) studyHours(study, day).forEach((h) => hours.add(h))
  return hours
}

/** Which part of the audience the studies cover at this moment, each region in its own local time. */
export function studySupport(playbook: Playbook, regions: readonly AudienceRegion[], at: Date) {
  let support = 0
  const cities: string[] = []
  for (const region of regions) {
    const parts = fastZonedParts(at, region.timeZone)
    const day = WEEKDAY[parts.weekday]
    if (day !== undefined && platformHours(playbook, day).has(parts.hour)) {
      support += region.weight
      cities.push(region.city)
    }
  }
  return { support, cities }
}

/**
 * Rule (shown to the user): the earliest full hour within `hours` where the score reaches `goodScore` and the
 * studies cover at least `minSupport` of the audience. Without such an hour: the highest score among covered
 * hours, then the best score × coverage – marked "bestes-verfuegbar".
 */
export function pickPostingTimes({
  scoreAt,
  regions,
  from,
  hours = 168,
  goodScore,
  minSupport = 0.5,
}: {
  scoreAt: (date: Date) => number
  regions: readonly AudienceRegion[]
  from: Date
  hours?: number
  goodScore: number
  minSupport?: number
}): PostingPick[] {
  if (!regions.length) return []
  const first = Math.ceil(from.getTime() / HOUR_MS) * HOUR_MS
  const slots = Array.from({ length: hours }, (_, i) => {
    const at = new Date(first + i * HOUR_MS)
    return { at, score: Math.round(scoreAt(at)) }
  })
  const picks: PostingPick[] = []
  for (const playbook of PLAYBOOKS) {
    if (!playbook.times.length) continue
    const rated = slots.map((slot) => ({ ...slot, ...studySupport(playbook, regions, slot.at) }))
    const covered = rated.filter((s) => s.support >= minSupport - 1e-9)
    const good = covered.find((s) => s.score >= goodScore)
    const fallback =
      [...covered].sort((a, b) => b.score - a.score || a.at.getTime() - b.at.getTime())[0] ??
      [...rated].sort(
        (a, b) => b.score * b.support - a.score * a.support || a.at.getTime() - b.at.getTime(),
      )[0]
    const pick = good ?? fallback
    if (!pick) continue
    picks.push({
      platform: playbook.id,
      at: pick.at,
      score: pick.score,
      support: pick.support,
      supportCities: pick.cities,
      quality: good ? 'gut' : 'bestes-verfuegbar',
    })
  }
  return picks
}
