import { describe, expect, it } from 'vitest'
import { localParts, pickHolidays } from './fetch-data.mjs'

describe('Wikimedia-Zeitstempel', () => {
  it('ordnet ein bekanntes API-Format DST-korrekt der lokalen Stunde zu', () => {
    expect(localParts('2026102500', 'Europe/Berlin').hour).toBe(2)
    expect(localParts('2026102502', 'Europe/Berlin').hour).toBe(3)
  })

  it('weist abweichende Formate zurück', () => {
    expect(() => localParts('2026-10-25', 'Europe/Berlin')).toThrow(/Zeitstempel/)
  })
})

describe('Feiertage', () => {
  it('übernimmt nur bundesweite gesetzliche Feiertage', () => {
    const items = [
      {
        date: '2026-10-03',
        localName: 'Tag der Deutschen Einheit',
        global: true,
        types: ['Public'],
      },
      { date: '2026-10-31', localName: 'Reformationstag', global: false, types: ['Public'] },
      { date: '2026-12-24', localName: 'Heiligabend', global: true, types: ['Observance'] },
    ]
    expect(pickHolidays(items)).toEqual([{ date: '2026-10-03', name: 'Tag der Deutschen Einheit' }])
  })

  it('behält den englischen Namen, wenn er vom lokalen abweicht', () => {
    const items = [
      { date: '2026-10-12', localName: 'スポーツの日', name: 'Sports Day', global: true },
      { date: '2026-07-04', localName: 'Independence Day', name: 'Independence Day', global: true },
    ]
    expect(pickHolidays(items)).toEqual([
      { date: '2026-10-12', name: 'スポーツの日', en: 'Sports Day' },
      { date: '2026-07-04', name: 'Independence Day' },
    ])
  })

  it('zählt Stunden eines Feiertags zum Wochenendprofil', () => {
    // Saturday 2026-10-03 is a weekend anyway; Thursday 2026-12-24 12:00 Berlin is a weekday unless listed.
    expect(localParts('2026122411', 'Europe/Berlin').weekend).toBe(false)
    expect(localParts('2026122411', 'Europe/Berlin', new Set(['2026-12-24'])).weekend).toBe(true)
  })
})
