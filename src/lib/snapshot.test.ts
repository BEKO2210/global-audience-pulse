import { describe, expect, it } from 'vitest'
import { FALLBACK_SNAPSHOT, parseSnapshot } from './snapshot'

describe('parseSnapshot', () => {
  it('fällt bei fehlenden Feldern ehrlich auf Defaults zurück', () => {
    const parsed = parseSnapshot({ generatedAt: '2026-01-01T00:00:00Z', weights: { india: .5 } })
    expect(parsed.generatedAt).toBe('2026-01-01T00:00:00Z')
    expect(parsed.profiles).toEqual({})
    expect(Object.values(parsed.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
  it('akzeptiert keine ungültige Eingabe', () => expect(parseSnapshot(null)).toEqual(FALLBACK_SNAPSHOT))
})
