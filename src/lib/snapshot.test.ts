import { describe, expect, it } from 'vitest'
import snapshotJson from '../../public/data/snapshot.json'
import { FALLBACK_SNAPSHOT, parseSnapshot } from './snapshot'

describe('parseSnapshot', () => {
  it('fällt bei fehlenden Feldern ehrlich auf Defaults zurück', () => {
    const parsed = parseSnapshot({ generatedAt: '2026-01-01T00:00:00Z', weights: { india: 0.5 } })
    expect(parsed.generatedAt).toBe('2026-01-01T00:00:00Z')
    expect(parsed.profiles).toEqual({})
    expect(Object.values(parsed.weights.reach).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(parsed.weightingMode).toBe('value')
  })
  it('verwirft unvollständige Stundenprofile', () =>
    expect(parseSnapshot({ profiles: { india: { weekday: [1], weekend: [1] } } }).profiles).toEqual(
      {},
    ))
  it('akzeptiert keine ungültige Eingabe', () =>
    expect(parseSnapshot(null)).toEqual(FALLBACK_SNAPSHOT))
  it('validiert den eingecheckten Datensnapshot', () => {
    const snapshot = parseSnapshot(snapshotJson)
    expect(snapshot.generatedAt).not.toBe('')
    expect(Object.keys(snapshot.profiles).length).toBeGreaterThan(0)
    expect(Object.values(snapshot.weights.value).every(Number.isFinite)).toBe(true)
  })
})
