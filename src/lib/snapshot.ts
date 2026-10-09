import type { RegionId } from '../config/regions'

export type WeightingMode = 'reach' | 'value'
export interface Profile {
  weekday: number[]
  weekend: number[]
  lastMeasuredAt?: string
  deviation?: number
}
export interface SourceMeta {
  fetchedAt: string
  urls: string[]
}
export interface Snapshot {
  generatedAt: string
  sources: { worldBank: SourceMeta; wikimedia: SourceMeta }
  weights: Record<WeightingMode, Record<RegionId, number>>
  weightingMode: WeightingMode
  profiles: Partial<Record<RegionId, Profile>>
  dataYears: Record<string, number>
}

const fallbackReach = {
  us_east: 0.067,
  us_west: 0.041,
  eu_central: 0.121,
  eu_uk: 0.024,
  latam: 0.173,
  mena: 0.095,
  india: 0.428,
  east_asia: 0.051,
}
const fallbackValue = {
  us_east: 0.24,
  us_west: 0.15,
  eu_central: 0.25,
  eu_uk: 0.07,
  latam: 0.08,
  mena: 0.07,
  india: 0.06,
  east_asia: 0.08,
}
const sourceFallback = { fetchedAt: '', urls: [] as string[] }

export const FALLBACK_SNAPSHOT: Snapshot = {
  generatedAt: '',
  sources: { worldBank: sourceFallback, wikimedia: sourceFallback },
  weights: { reach: fallbackReach, value: fallbackValue },
  weightingMode: 'value',
  profiles: {},
  dataYears: {},
}

function normalizedWeights(input: unknown, fallback: Record<RegionId, number>) {
  const raw = input && typeof input === 'object' ? (input as Partial<Record<RegionId, number>>) : {}
  const values = { ...fallback, ...raw }
  const total = Object.values(values).reduce(
    (sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0),
    0,
  )
  if (!total) return fallback
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, Number.isFinite(value) ? value / total : 0]),
  ) as Record<RegionId, number>
}

function validProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<Profile>
  return [profile.weekday, profile.weekend].every(
    (series) => Array.isArray(series) && series.length === 24 && series.every(Number.isFinite),
  )
}

export function parseSnapshot(input: unknown): Snapshot {
  if (!input || typeof input !== 'object') return FALLBACK_SNAPSHOT
  const raw = input as Partial<Snapshot> & { weights?: unknown }
  const weightObject =
    raw.weights && typeof raw.weights === 'object' ? (raw.weights as Record<string, unknown>) : {}
  const legacyWeights = !('reach' in weightObject) ? raw.weights : undefined
  const profiles = Object.fromEntries(
    Object.entries(raw.profiles ?? {}).filter((entry): entry is [string, Profile] =>
      validProfile(entry[1]),
    ),
  ) as Partial<Record<RegionId, Profile>>
  return {
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
    sources: {
      worldBank: { ...sourceFallback, ...raw.sources?.worldBank },
      wikimedia: { ...sourceFallback, ...raw.sources?.wikimedia },
    },
    weights: {
      reach: normalizedWeights(weightObject.reach ?? legacyWeights, fallbackReach),
      value: normalizedWeights(weightObject.value, fallbackValue),
    },
    weightingMode: raw.weightingMode === 'reach' ? 'reach' : 'value',
    profiles,
    dataYears: raw.dataYears && typeof raw.dataYears === 'object' ? raw.dataYears : {},
  }
}

export async function loadSnapshot(base = import.meta.env.BASE_URL, fresh = false) {
  try {
    const response = await fetch(
      `${base}data/snapshot.json${fresh ? `?refresh=${Date.now()}` : ''}`,
      {
        cache: fresh ? 'no-store' : 'default',
      },
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return parseSnapshot(await response.json())
  } catch {
    return FALLBACK_SNAPSHOT
  }
}
