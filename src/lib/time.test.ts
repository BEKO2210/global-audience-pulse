import { describe, expect, it } from 'vitest'
import { circularMean, formatDecimalHour, startOfNextZonedDay, zonedParts } from './time'

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
  it('findet den nächsten Berliner Kalendertag auch über die Zeitumstellung', () => {
    expect(
      startOfNextZonedDay(new Date('2026-10-24T20:30:00Z'), 'Europe/Berlin').toISOString(),
    ).toBe('2026-10-24T22:00:00.000Z')
    expect(
      startOfNextZonedDay(new Date('2026-10-25T22:30:00Z'), 'Europe/Berlin').toISOString(),
    ).toBe('2026-10-25T23:00:00.000Z')
  })
})

it('berechnet das zirkuläre Mittel über Mitternacht', () => {
  const result = circularMean([23, 1])
  expect(result < 0.001 || result > 23.999).toBe(true)
})

it('rundet Dezimalstunden vor dem Aufteilen', () => {
  expect(formatDecimalHour(17 + 59.6 / 60)).toBe('18:00')
  expect(formatDecimalHour(23 + 59.6 / 60)).toBe('00:00')
})
