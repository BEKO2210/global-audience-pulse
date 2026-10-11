import { describe, expect, it } from 'vitest'
import { awakeSummary, forecastPeak, overlapHour } from './captions'

describe('chart captions (T-017)', () => {
  it('counts awake markets and lists prime time', () => {
    expect(
      awakeSummary([
        { city: 'Berlin', phase: 'prime' },
        { city: 'Tokio', phase: 'sleep' },
        { city: 'Dubai', phase: 'prime' },
        { city: 'New York', phase: 'day' },
      ]),
    ).toEqual({ awake: 3, total: 4, prime: ['Berlin', 'Dubai'] })
  })

  it('finds the forecast peak, first on ties', () => {
    const at = (h: number) => new Date(Date.UTC(2026, 9, 11, h))
    expect(
      forecastPeak([
        { date: at(1), score: 40.2 },
        { date: at(2), score: 71.4 },
        { date: at(3), score: 71.4 },
      ]),
    ).toEqual({ date: at(2), score: 71 })
    expect(forecastPeak([])).toBeNull()
  })

  it('finds the hour with the most active markets', () => {
    const hours = [0, 1, 2].map((h) => new Date(Date.UTC(2026, 9, 11, h)))
    const table: Record<string, number[]> = { a: [70, 80, 30], b: [10, 65, 70], c: [0, 0, 90] }
    const at = (id: string, d: Date) => table[id]![d.getUTCHours()]!
    expect(overlapHour(hours, ['a', 'b', 'c'], at, 62)).toEqual({ date: hours[1], count: 2 })
    expect(overlapHour(hours, ['a'], () => 10, 62)).toBeNull()
  })

  // adopted from the local test writer (T-052): >= at the threshold, and the earliest hour wins a tie
  it('counts a market exactly at the threshold and keeps the earliest of equal hours', () => {
    const hours = [0, 1, 2].map((h) => new Date(Date.UTC(2026, 9, 11, h)))
    expect(overlapHour(hours, ['a', 'b'], () => 62, 62)).toEqual({ date: hours[0], count: 2 })
  })
})
