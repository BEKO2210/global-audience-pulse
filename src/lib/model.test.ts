import { describe, expect, it } from 'vitest'
import { baselineActivity, findBestWindows } from './model'

describe('baselineActivity', () => {
  it('bleibt im Wertebereich und ist minutenweise kontinuierlich', () => {
    let previous = baselineActivity(0)
    for (let minute = 1; minute <= 24 * 60; minute += 1) {
      const value = baselineActivity(minute / 60)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
      expect(Math.abs(value - previous)).toBeLessThan(1)
      previous = value
    }
  })
})

describe('findBestWindows', () => {
  it('liefert geordnete, nicht überlappende Fenster korrekter Länge', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const windows = findBestWindows(
      (date) => (date.getUTCHours() === 12 || date.getUTCHours() === 18 ? 100 : 10),
      start,
      24,
      90,
      3,
      15,
    )
    expect(windows).toHaveLength(3)
    expect(windows).toEqual([...windows].sort((a, b) => a.start.getTime() - b.start.getTime()))
    for (const window of windows)
      expect(window.end.getTime() - window.start.getTime()).toBe(90 * 60_000)
    for (let i = 1; i < windows.length; i += 1)
      expect(windows[i]!.start.getTime()).toBeGreaterThanOrEqual(windows[i - 1]!.end.getTime())
    for (const window of windows) expect(window.start.getUTCMinutes() % 15).toBe(0)
    for (let i = 1; i < windows.length; i += 1)
      expect(windows[i]!.start.getTime() - windows[i - 1]!.start.getTime()).toBeGreaterThanOrEqual(
        3 * 3_600_000,
      )
  })
})

describe('Feiertage im Modell', () => {
  it('rechnet einen bundesweiten Feiertag wie einen Sonntag', async () => {
    const { regionActivity } = await import('./model')
    const { FALLBACK_SNAPSHOT } = await import('./snapshot')
    const { REGION_BY_ID } = await import('../config/regions')
    const berlin = REGION_BY_ID.eu_central
    // Thursday 2026-12-24 12:00 Berlin (a weekday) vs. the same moment marked as a holiday.
    const at = new Date('2026-12-24T11:00:00Z')
    const workday = regionActivity(berlin, at, FALLBACK_SNAPSHOT)
    const holiday = regionActivity(berlin, at, {
      ...FALLBACK_SNAPSHOT,
      holidays: { eu_central: [{ date: '2026-12-24', name: 'Test' }] },
    })
    const sunday = regionActivity(berlin, new Date('2026-12-27T11:00:00Z'), FALLBACK_SNAPSHOT)
    expect(holiday).not.toBe(workday)
    expect(holiday).toBeCloseTo(sunday, 5)
    // Another region's holiday changes nothing for Berlin.
    expect(
      regionActivity(berlin, at, {
        ...FALLBACK_SNAPSHOT,
        holidays: { us_east: [{ date: '2026-12-24', name: 'Test' }] },
      }),
    ).toBe(workday)
  })
})
