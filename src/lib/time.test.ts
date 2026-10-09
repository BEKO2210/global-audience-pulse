import { describe, expect, it } from 'vitest'
import { circularMean, zonedParts } from './time'

describe('DST-sichere Ortszeiten', () => {
  it('bildet die doppelte Berliner Stunde am 25.10.2026 korrekt ab', () => {
    expect(zonedParts(new Date('2026-10-25T00:30:00Z'), 'Europe/Berlin').hour).toBe(2)
    expect(zonedParts(new Date('2026-10-25T01:30:00Z'), 'Europe/Berlin').hour).toBe(2)
    expect(zonedParts(new Date('2026-10-25T02:30:00Z'), 'Europe/Berlin').hour).toBe(3)
  })
  it('bildet die doppelte New-York-Stunde am 01.11.2026 korrekt ab', () => {
    expect(zonedParts(new Date('2026-11-01T05:30:00Z'), 'America/New_York').hour).toBe(1)
    expect(zonedParts(new Date('2026-11-01T06:30:00Z'), 'America/New_York').hour).toBe(1)
    expect(zonedParts(new Date('2026-11-01T07:30:00Z'), 'America/New_York').hour).toBe(2)
  })
})

it('berechnet das zirkuläre Mittel über Mitternacht', () => {
  const result = circularMean([23, 1])
  expect(result < .001 || result > 23.999).toBe(true)
})
