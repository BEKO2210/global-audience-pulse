import { describe, expect, it } from 'vitest'
import { localParts } from './fetch-data.mjs'

describe('Wikimedia-Zeitstempel', () => {
  it('ordnet ein bekanntes API-Format DST-korrekt der lokalen Stunde zu', () => {
    expect(localParts('2026102500', 'Europe/Berlin').hour).toBe(2)
    expect(localParts('2026102502', 'Europe/Berlin').hour).toBe(3)
  })

  it('weist abweichende Formate zurück', () => {
    expect(() => localParts('2026-10-25', 'Europe/Berlin')).toThrow(/Zeitstempel/)
  })
})
