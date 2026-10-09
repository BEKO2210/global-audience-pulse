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
