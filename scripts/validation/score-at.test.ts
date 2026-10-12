import { expect, it } from 'vitest'
import { REGIONS } from '../../src/config/regions'
import { globalActivity } from '../../src/lib/model'
import { FALLBACK_SNAPSHOT } from '../../src/lib/snapshot'
import { scoreAtPublish } from './score-at'

it('matches direct globalActivity calls at historical instants', () => {
  const selected = ['eu_central', 'us_east'] as const
  for (const iso of ['2024-01-01T00:00:00Z', '2025-06-20T12:15:00Z', '2026-10-25T00:30:00Z']) {
    const date = new Date(iso)
    expect(scoreAtPublish(date, { selected, snapshot: FALLBACK_SNAPSHOT })).toBe(
      globalActivity(REGIONS, selected, date, FALLBACK_SNAPSHOT),
    )
  }
})
