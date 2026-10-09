import { describe, expect, it } from 'vitest'
import { REGIONS } from '../config/regions'
import { buildScoreGrid } from './model'
import { FALLBACK_SNAPSHOT } from './snapshot'
import { buildOffsetTable, fastZonedParts, zonedParts } from './time'

const comparable = (parts: ReturnType<typeof zonedParts>) =>
  `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}-${parts.weekday}`

describe('arithmetic timezone offset tables', () => {
  it('matches Intl for all regions through the European and US 2026 transitions', () => {
    for (const center of ['2026-10-25T00:00:00Z', '2026-11-01T00:00:00Z']) {
      const start = new Date(new Date(center).getTime() - 36 * 3_600_000)
      const end = new Date(new Date(center).getTime() + 36 * 3_600_000)
      for (const region of REGIONS) {
        const table = buildOffsetTable(region.timeZone, start, end)
        for (let time = start.getTime(); time <= end.getTime(); time += 15 * 60_000) {
          const date = new Date(time)
          expect(comparable(fastZonedParts(date, region.timeZone, table))).toBe(
            comparable(zonedParts(date, region.timeZone)),
          )
        }
      }
    }
  })

  it('matches Intl for every region at every hour of 2026', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date('2027-01-01T00:00:00Z')
    for (const region of REGIONS) {
      const table = buildOffsetTable(region.timeZone, start, end)
      for (let time = start.getTime(); time < end.getTime(); time += 3_600_000) {
        const date = new Date(time)
        expect(comparable(fastZonedParts(date, region.timeZone, table))).toBe(
          comparable(zonedParts(date, region.timeZone)),
        )
      }
    }
  })
})

describe('score-grid performance budget', () => {
  it('builds the complete -12 h through +7 d grid in under 30 ms', () => {
    const anchor = new Date('2026-10-09T12:00:00Z')
    buildScoreGrid(REGIONS, FALLBACK_SNAPSHOT, anchor)
    const durations = Array.from({ length: 3 }, () => {
      const started = performance.now()
      const grid = buildScoreGrid(REGIONS, FALLBACK_SNAPSHOT, anchor)
      expect(grid.size).toBe(721)
      return performance.now() - started
    })
    expect(Math.min(...durations)).toBeLessThan(30)
  })
})
