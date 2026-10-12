import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseInstagramCsv, zonedDate } from './instagram-csv'

describe('parseInstagramCsv', () => {
  it('parses the English RFC-4180 fixture and warns about its description column', async () => {
    const text = await readFile('scripts/validation/fixtures/instagram-synthetic.csv', 'utf8')
    const result = parseInstagramCsv(text, { timeZone: 'Europe/Berlin' })
    expect(result.posts).toHaveLength(40)
    expect(result.posts[2]?.reach).toBe(1019)
    expect(result.posts.some((post) => post.type === 'story')).toBe(true)
    expect(result.posts.some((post) => post.boosted)).toBe(true)
    expect(result.warnings).toContain('Unbekannte Spalte: "Description"')
  })

  it('parses German semicolon exports and thousands separators', async () => {
    const text = await readFile('scripts/validation/fixtures/instagram-synthetic-de.csv', 'utf8')
    const result = parseInstagramCsv(text, { timeZone: 'Europe/Berlin' })
    expect(result.posts).toHaveLength(5)
    expect(result.posts[0]?.reach).toBe(1234)
    expect(result.warnings).toHaveLength(1)
  })

  it('maps midnight and the autumn overlap deterministically to UTC', () => {
    expect(zonedDate('10/25/2026 00:05', 'Europe/Berlin').toISOString()).toBe(
      '2026-10-24T22:05:00.000Z',
    )
    expect(zonedDate('10/25/2026 02:30', 'Europe/Berlin').toISOString()).toBe(
      '2026-10-25T00:30:00.000Z',
    )
  })

  it('names missing required columns', () => {
    expect(() => parseInstagramCsv('Post ID,Reach\na,2', { timeZone: 'UTC' })).toThrow(
      'Veröffentlichungszeit',
    )
  })

  it('accepts thousands separators and skips decimal count metrics with warnings', () => {
    const text = `Post ID;Publish Time;Reach
a;07/01/2026 10:00;1,234
b;07/02/2026 10:00;1.234
c;07/03/2026 10:00;1,234,567
d;07/04/2026 10:00;1.234,56
e;07/05/2026 10:00;1,234.56
f;07/06/2026 10:00;0,5`
    const result = parseInstagramCsv(text, { timeZone: 'Europe/Berlin' })
    expect(result.posts.map((post) => post.reach)).toEqual([1234, 1234, 1234567])
    expect(result.warnings).toHaveLength(3)
    expect(result.warnings.every((warning) => warning.includes('Zeile übersprungen'))).toBe(true)
  })

  it('recognizes boost labels and conservatively excludes unknown values', () => {
    const values = [
      'beworben',
      'sponsored',
      'promoted',
      'werbung',
      'gesponsert',
      '0',
      'false',
      'no',
      'nein',
      '',
      'vielleicht',
    ]
    const rows = values.map(
      (value, index) => `p${index};07/${String(index + 1).padStart(2, '0')}/2026 10:00;10;${value}`,
    )
    const result = parseInstagramCsv(['Post ID;Publish Time;Reach;Boosted', ...rows].join('\n'), {
      timeZone: 'Europe/Berlin',
    })
    expect(result.posts.slice(0, 5).every((post) => post.boosted === true)).toBe(true)
    expect(result.posts.slice(5, 10).every((post) => post.boosted === false)).toBe(true)
    expect(result.posts[10]?.boosted).toBe(true)
    expect(result.warnings).toEqual([
      'CSV-Zeile 12: unbekannter Boost-Wert "vielleicht"; Beitrag gilt als beworben',
    ])
  })

  it('rejects out-of-range month and day before searching offsets and names the format', () => {
    expect(() => zonedDate('13/01/2026 10:00', 'Europe/Berlin')).toThrow(
      'erwartet MM/DD/YYYY HH:mm bzw. ISO',
    )
    expect(() => zonedDate('12/32/2026 10:00', 'Europe/Berlin')).toThrow(
      'erwartet MM/DD/YYYY HH:mm bzw. ISO',
    )
  })
})
