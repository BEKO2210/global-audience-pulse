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
})
