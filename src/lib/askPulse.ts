// T-016 "Frag den Pulse": the common question "when do I post for …?" answered live from the same model as the
// rest of the page. Audience names match the hourly report's zielgruppen, so its checked verdict can be quoted.
import { MODEL_CONFIG, STATUS_LEVELS } from '../config/model'
import { PRESETS, REGIONS, type RegionId } from '../config/regions'
import { findBestWindows, type PostingWindow } from './model'

export const ASK_AUDIENCES = [
  { id: 'global', name: 'Global', ids: REGIONS.map((r) => r.id) },
  { id: 'dach', name: 'DACH & Europa', ids: ['eu_central'] },
  { id: 'usa', name: 'USA', ids: ['us_east', 'us_west'] },
  ...PRESETS.filter((p) => p.ids.length > 2).map((p) => ({
    id: p.name.toLowerCase().replace(/[^a-z]+/g, '-'),
    name: p.name,
    ids: [...p.ids],
  })),
] as const satisfies readonly { id: string; name: string; ids: readonly RegionId[] }[]

export type AskAudienceId = (typeof ASK_AUDIENCES)[number]['id']

export interface AskAnswer {
  nowScore: number
  best: PostingWindow | null
  /** posting now is as good as it gets in the next 24 h (inside the best window or within 2 points) */
  postNow: boolean
  /** the best window reaches the "good" level */
  good: boolean
}

export function askPulse(scoreAt: (date: Date) => number, now: Date, hours = 24): AskAnswer {
  const nowScore = Math.round(scoreAt(now))
  const best =
    [...findBestWindows(scoreAt, now, hours, MODEL_CONFIG.windowMinutes, 3)].sort(
      (a, b) => b.score - a.score,
    )[0] ?? null
  const postNow = best ? (now >= best.start && now < best.end) || nowScore >= best.score - 2 : true
  return { nowScore, best, postNow, good: (best?.score ?? nowScore) >= STATUS_LEVELS[1].min }
}
