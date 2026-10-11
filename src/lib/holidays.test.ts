import { describe, expect, it } from 'vitest'
import { holidayAt, holidayLabel, localDate } from './holidays'

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

describe('holidayLabel', () => {
  const sports = { date: '2026-10-12', name: 'スポーツの日', en: 'Sports Day' }
  const einheit = { date: '2026-10-03', name: 'Tag der Deutschen Einheit', en: 'German Unity Day' }
  it('uses the English name in English', () => {
    expect(holidayLabel(sports, 'en')).toBe('Sports Day')
    expect(holidayLabel(einheit, 'en')).toBe('German Unity Day')
  })
  it('keeps Latin local names in German and adds English to non-Latin ones', () => {
    expect(holidayLabel(einheit, 'de')).toBe('Tag der Deutschen Einheit')
    expect(
      holidayLabel(
        { date: '2026-10-12', name: 'Nossa Senhora Aparecida', en: 'Our Lady of Aparecida' },
        'de',
      ),
    ).toBe('Nossa Senhora Aparecida')
    expect(holidayLabel(sports, 'de')).toBe('スポーツの日 (Sports Day)')
    expect(holidayLabel({ date: '2026-10-12', name: 'スポーツの日' }, 'de')).toBe('スポーツの日')
  })
})
