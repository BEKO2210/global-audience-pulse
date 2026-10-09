import { MODEL_CONFIG, PHASES, STATUS_LEVELS } from '../config/model'
import type { RegionConfig, RegionId } from '../config/regions'
import type { Snapshot } from './snapshot'
import { zonedParts } from './time'

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))
const smooth = (t: number) => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2

export function baselineActivity(hour: number, weekend = false) {
  const h = ((hour % 24) + 24) % 24
  const anchors = weekend
    ? [
        [0, 23],
        [4.5, 9],
        [8, 23],
        [11, 62],
        [14, 68],
        [17, 76],
        [20.5, 96],
        [23, 50],
        [24, 23],
      ]
    : [
        [0, 18],
        [4.5, 8],
        [7, 27],
        [9.5, 64],
        [12, 69],
        [13.5, 76],
        [16.5, 68],
        [20, 100],
        [22, 70],
        [24, 18],
      ]
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i] as number[]
    const b = anchors[i + 1] as number[]
    if (h >= a[0]! && h <= b[0]!)
      return clamp(a[1]! + (b[1]! - a[1]!) * smooth((h - a[0]!) / (b[0]! - a[0]!)))
  }
  return 10
}

function interpolateProfile(profile: readonly number[], hour: number) {
  const h = ((hour % 24) + 24) % 24
  const i = Math.floor(h)
  const next = (i + 1) % 24
  return (profile[i] ?? 0) * (1 - (h - i)) + (profile[next] ?? 0) * (h - i)
}

export function regionActivity(region: RegionConfig, date: Date, snapshot: Snapshot) {
  const parts = zonedParts(date, region.timeZone)
  const hour = parts.hour + parts.minute / 60 + parts.second / 3600
  const weekend = parts.weekday === 'Sat' || parts.weekday === 'Sun'
  const baseline = baselineActivity(hour, weekend)
  const profile = snapshot.profiles[region.id]
  if (!profile) return baseline
  const measured = interpolateProfile(weekend ? profile.weekend : profile.weekday, hour)
  const blended = MODEL_CONFIG.measuredBlend * measured + MODEL_CONFIG.baselineBlend * baseline
  const liveFactor = 1 + clamp(profile.deviation ?? 0, -50, 50) / 100
  return clamp(blended * liveFactor)
}

export function normalizedWeights(ids: readonly RegionId[], snapshot: Snapshot) {
  const source = snapshot.weights[snapshot.weightingMode]
  const total = ids.reduce((sum, id) => sum + (source[id] ?? 0), 0)
  return Object.fromEntries(
    ids.map((id) => [id, total ? (source[id] ?? 0) / total : 1 / ids.length]),
  ) as Partial<Record<RegionId, number>>
}

export function globalActivity(
  regions: readonly RegionConfig[],
  selected: readonly RegionId[],
  date: Date,
  snapshot: Snapshot,
) {
  const weights = normalizedWeights(selected, snapshot)
  return selected.reduce((sum, id) => {
    const region = regions.find((item) => item.id === id)
    return sum + (region ? regionActivity(region, date, snapshot) * (weights[id] ?? 0) : 0)
  }, 0)
}

export function phaseAt(hour: number) {
  return PHASES.find((p) => hour >= p.from && hour < p.to) ?? PHASES[0]
}

export function statusFor(score: number) {
  return STATUS_LEVELS.find((s) => score >= s.min) ?? STATUS_LEVELS.at(-1)!
}

export interface PostingWindow {
  start: Date
  end: Date
  score: number
}

export function findBestWindows(
  scoreAt: (date: Date) => number,
  start: Date,
  horizonHours: number,
  lengthMinutes = MODEL_CONFIG.windowMinutes,
  count = 3,
  stepMinutes = MODEL_CONFIG.scanStepMinutes,
  minimumGapMinutes = MODEL_CONFIG.minimumWindowGapMinutes,
): PostingWindow[] {
  const candidates: PostingWindow[] = []
  // Window samples sit on a fixed grid, so neighbouring windows share most of them.
  const sampleCache = new Map<number, number>()
  const sample = (ms: number) => {
    let value = sampleCache.get(ms)
    if (value === undefined) {
      value = scoreAt(new Date(ms))
      sampleCache.set(ms, value)
    }
    return value
  }
  const stepsInWindow = Math.max(1, Math.ceil(lengthMinutes / stepMinutes))
  const endMs = start.getTime() + horizonHours * 3_600_000
  const stepMs = stepMinutes * 60_000
  const alignedStart = Math.ceil(start.getTime() / stepMs) * stepMs
  for (let time = alignedStart; time + lengthMinutes * 60_000 <= endMs; time += stepMs) {
    let sum = 0
    for (let j = 0; j < stepsInWindow; j += 1) {
      const offset = ((j + 0.5) * lengthMinutes) / stepsInWindow
      sum += sample(time + offset * 60_000)
    }
    candidates.push({
      start: new Date(time),
      end: new Date(time + lengthMinutes * 60_000),
      score: sum / stepsInWindow,
    })
  }
  const localMaxima = candidates.filter(
    (candidate, index) =>
      candidate.score >= (candidates[index - 1]?.score ?? -Infinity) &&
      candidate.score >= (candidates[index + 1]?.score ?? -Infinity),
  )
  const picked: PostingWindow[] = []
  for (const candidate of localMaxima.sort((a, b) => b.score - a.score)) {
    if (
      picked.every(
        (win) =>
          Math.abs(candidate.start.getTime() - win.start.getTime()) >= minimumGapMinutes * 60_000,
      )
    )
      picked.push(candidate)
    if (picked.length === count) break
  }
  return picked.sort((a, b) => a.start.getTime() - b.start.getTime())
}
