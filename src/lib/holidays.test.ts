import { describe, expect, it } from 'vitest'
import { holidayAt, localDate } from './holidays'

const tokyo = { id: 'east_asia' as const, timeZone: 'Asia/Tokyo' }

describe('holidayAt', () => {
  it('uses the region’s local calendar date', () => {
    // 2026-11-02 16:00 UTC is already 2026-11-03 01:00 in Tokyo (Bunka no Hi).
    const at = new Date('2026-11-02T16:00:00Z')
    expect(localDate(at, tokyo.timeZone)).toBe('2026-11-03')
    expect(
      holidayAt({ east_asia: [{ date: '2026-11-03', name: '文化の日' }] }, tokyo, at)?.name,
    ).toBe('文化の日')
    expect(holidayAt({}, tokyo, at)).toBeNull()
    expect(holidayAt(undefined, tokyo, at)).toBeNull()
  })
})
