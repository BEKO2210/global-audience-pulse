import { describe, expect, it } from 'vitest'
import { buildIcs, foldLine, icsText, icsUtc } from './ics'

const start = new Date(Date.UTC(2026, 9, 11, 18, 0))
const end = new Date(Date.UTC(2026, 9, 11, 19, 30))

describe('ics (T-080)', () => {
  it('writes UTC times and the required fields with CRLF line ends', () => {
    const ics = buildIcs(
      { start, end, summary: 'Posting-Fenster' },
      new Date(Date.UTC(2026, 9, 11, 8)),
    )
    expect(icsUtc(start)).toBe('20261011T180000Z')
    expect(ics).toContain('DTSTART:20261011T180000Z\r\n')
    expect(ics).toContain('DTEND:20261011T193000Z\r\n')
    expect(ics).toContain('DTSTAMP:20261011T080000Z\r\n')
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n[\s\S]*END:VCALENDAR\r\n$/)
    expect(ics).not.toMatch(/[^\r]\n/)
    expect(ics).not.toContain('TZID')
  })

  it('escapes text values', () => {
    expect(icsText('Score 74, jetzt; posten\\\nok')).toBe('Score 74\\, jetzt\\; posten\\\\\\nok')
  })

  it('folds long lines at 75 octets without splitting characters', () => {
    const line = `DESCRIPTION:${'ü'.repeat(60)}`
    const folded = foldLine(line)
    const parts = folded.split('\r\n ')
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.every((p) => new TextEncoder().encode(p).length <= 75)).toBe(true)
    expect(parts.join('')).toBe(line)
  })
})
