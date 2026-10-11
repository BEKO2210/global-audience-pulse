// T-017: one plain sentence under each chart – "what you are looking at right now", computed from the same
// numbers the chart draws, so it is always true, also while scrubbing through time.

export interface RegionPhase {
  city: string
  phase: string
}

/** Awake = any phase but night; prime-time cities in the given order. */
export function awakeSummary(regions: readonly RegionPhase[]) {
  return {
    awake: regions.filter((r) => r.phase !== 'sleep').length,
    total: regions.length,
    prime: regions.filter((r) => r.phase === 'prime').map((r) => r.city),
  }
}

/** Highest point of a forecast curve (first one on ties), or null for an empty curve. */
export function forecastPeak(points: readonly { date: Date; score: number }[]) {
  let best: { date: Date; score: number } | null = null
  for (const p of points) if (!best || p.score > best.score) best = p
  return best ? { date: best.date, score: Math.round(best.score) } : null
}

/**
 * The full hour in which most markets are active at once (score ≥ threshold); earliest on ties.
 * Returns null when no market reaches the threshold in the period.
 */
export function overlapHour(
  hours: readonly Date[],
  ids: readonly string[],
  activityAt: (id: string, date: Date) => number,
  threshold: number,
) {
  let best: { date: Date; count: number } | null = null
  for (const date of hours) {
    const count = ids.filter((id) => activityAt(id, date) >= threshold).length
    if (count > 0 && (!best || count > best.count)) best = { date, count }
  }
  return best
}
