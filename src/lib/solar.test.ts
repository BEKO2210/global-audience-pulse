import { describe, expect, it } from 'vitest'
import { antipode, solarElevation, subsolarPoint } from './solar'

describe('subsolarPoint', () => {
  it('liegt zur Tagundnachtgleiche nahe am Äquator', () =>
    expect(Math.abs(subsolarPoint(new Date('2026-03-20T14:46:00Z')).latitude)).toBeLessThan(1))
  it('liegt zur Juni-Sonnenwende bei etwa 23,4° Nord', () =>
    expect(subsolarPoint(new Date('2026-06-21T08:00:00Z')).latitude).toBeCloseTo(23.4, 0))
  it('ordnet Berlin dem Tag und Tokio der Nacht zu', () => {
    const date = new Date('2026-10-09T14:37:00Z')
    expect(solarElevation(52.52, 13.405, date)).toBeGreaterThan(0)
    expect(solarElevation(35.69, 139.692, date)).toBeLessThan(0)
  })
  it('setzt das Nachtzentrum 180 Grad vom subsolaren Längengrad entfernt', () => {
    const sun = subsolarPoint(new Date('2026-10-09T14:37:00Z'))
    const night = antipode(sun)
    const separation = Math.abs(((night.longitude - sun.longitude + 540) % 360) - 180)
    expect(separation).toBeCloseTo(180, 6)
  })
})
