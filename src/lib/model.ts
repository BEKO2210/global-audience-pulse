import { MODEL_CONFIG, PHASES, STATUS_LEVELS } from '../config/model'
import type { RegionConfig, RegionId } from '../config/regions'
import type { Snapshot } from './snapshot'
import { fastZonedParts, getOffsetTable, type OffsetTable } from './time'

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

function activityFromParts(
  region: RegionConfig,
  parts: ReturnType<typeof fastZonedParts>,
  snapshot: Snapshot,
) {
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

export function regionActivity(region: RegionConfig, date: Date, snapshot: Snapshot) {
  return activityFromParts(region, fastZonedParts(date, region.timeZone), snapshot)
}

export interface ScoreGrid {
  start: number
  end: number
  stepMs: number
  size: number
  byRegion: Record<RegionId, Float32Array>
  activityAt: (id: RegionId, date: Date) => number
  globalAt: (ids: readonly RegionId[], date: Date) => number
  points: (ids: readonly RegionId[], from: Date, hours: number) => { date: Date; score: number }[]
}

export interface ScoreGridData {
  start: number
  end: number
  stepMs: number
  size: number
  byRegion: Record<RegionId, Float32Array>
}

export function createScoreGrid(data: ScoreGridData, snapshot: Snapshot): ScoreGrid {
  const { start, stepMs, size, byRegion } = data
  const activityAt = (id: RegionId, date: Date) => {
    const position = Math.min(size - 1, Math.max(0, (date.getTime() - start) / stepMs))
    const lower = Math.floor(position)
    const fraction = position - lower
    const values = byRegion[id]
    return (
      (values?.[lower] ?? 0) * (1 - fraction) +
      (values?.[Math.min(size - 1, lower + 1)] ?? 0) * fraction
    )
  }
  const globalAt = (ids: readonly RegionId[], date: Date) => {
    if (!ids.length) return 0
    const weights = normalizedWeights(ids, snapshot)
    return ids.reduce((sum, id) => sum + activityAt(id, date) * (weights[id] ?? 0), 0)
  }
  const points = (ids: readonly RegionId[], from: Date, hours: number) =>
    Array.from({ length: Math.floor((hours * 60) / MODEL_CONFIG.scanStepMinutes) + 1 }, (_, i) => {
      const date = new Date(from.getTime() + i * stepMs)
      return { date, score: globalAt(ids, date) }
    })
  return { ...data, activityAt, globalAt, points }
}

/**
 * One immutable 15-minute grid shared by every visualization. Intl is used only
 * while retrieving the cached offset tables, never inside the sample loop.
 */
export function buildScoreGrid(
  regions: readonly RegionConfig[],
  snapshot: Snapshot,
  anchor: Date,
  beforeHours = 12,
  afterHours = 24 * 7,
): ScoreGrid {
  return createScoreGrid(
    buildScoreGridData(regions, snapshot, anchor, beforeHours, afterHours),
    snapshot,
  )
}

export function buildScoreGridData(
  regions: readonly RegionConfig[],
  snapshot: Snapshot,
  anchor: Date,
  beforeHours = 12,
  afterHours = 24 * 7,
): ScoreGridData {
  const stepMs = MODEL_CONFIG.scanStepMinutes * 60_000
  const start = Math.floor((anchor.getTime() - beforeHours * 3_600_000) / stepMs) * stepMs
  const end = Math.ceil((anchor.getTime() + afterHours * 3_600_000) / stepMs) * stepMs
  const size = Math.round((end - start) / stepMs) + 1
  const tables = Object.fromEntries(
    regions.map((region) => [region.id, getOffsetTable(region.timeZone, anchor)]),
  ) as Record<RegionId, OffsetTable>
  const byRegion = {} as Record<RegionId, Float32Array>
  for (const region of regions) {
    const values = new Float32Array(size)
    const table = tables[region.id]
    for (let i = 0; i < size; i += 1) {
      const date = new Date(start + i * stepMs)
      values[i] = activityFromParts(region, fastZonedParts(date, region.timeZone, table), snapshot)
    }
    byRegion[region.id] = values
  }
  return { start, end, stepMs, size, byRegion }
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
  const regionById = new Map(regions.map((region) => [region.id, region]))
  return selected.reduce((sum, id) => {
    const region = regionById.get(id)
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
