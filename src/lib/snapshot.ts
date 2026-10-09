import type { RegionId } from '../config/regions'

export interface Profile { weekday: number[]; weekend: number[]; lastMeasuredAt?: string; deviation?: number }
export interface Snapshot {
  generatedAt: string
  sources: { worldBank: { fetchedAt: string; urls: string[] }; wikimedia: { fetchedAt: string; urls: string[] } }
  weights: Record<RegionId, number>
  profiles: Partial<Record<RegionId, Profile>>
  dataYears: Record<string, number>
}

const fallbackWeights = { us_east: .12, us_west: .08, eu_central: .18, eu_uk: .04, latam: .16, mena: .09, india: .2, east_asia: .13 }
const sourceFallback = { fetchedAt: new Date(0).toISOString(), urls: [] as string[] }

export const FALLBACK_SNAPSHOT: Snapshot = {
  generatedAt: new Date(0).toISOString(),
  sources: { worldBank: sourceFallback, wikimedia: sourceFallback },
  weights: fallbackWeights,
  profiles: {},
  dataYears: {},
}

export function parseSnapshot(input: unknown): Snapshot {
  if (!input || typeof input !== 'object') return FALLBACK_SNAPSHOT
  const raw = input as Partial<Snapshot>
  const weights = { ...fallbackWeights, ...(raw.weights ?? {}) }
  const total = Object.values(weights).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
  return {
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : FALLBACK_SNAPSHOT.generatedAt,
    sources: {
      worldBank: { ...sourceFallback, ...raw.sources?.worldBank },
      wikimedia: { ...sourceFallback, ...raw.sources?.wikimedia },
    },
    weights: Object.fromEntries(Object.entries(weights).map(([id, value]) => [id, (Number.isFinite(value) ? value : 0) / (total || 1)])) as Record<RegionId, number>,
    profiles: raw.profiles && typeof raw.profiles === 'object' ? raw.profiles : {},
    dataYears: raw.dataYears && typeof raw.dataYears === 'object' ? raw.dataYears : {},
  }
}

export async function loadSnapshot(base = import.meta.env.BASE_URL) {
  try {
    const response = await fetch(`${base}data/snapshot.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return parseSnapshot(await response.json())
  } catch { return FALLBACK_SNAPSHOT }
}
