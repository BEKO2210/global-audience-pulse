import { describe, expect, it } from 'vitest'
import { subsolarPoint } from './solar'

describe('subsolarPoint', () => {
  it('liegt zur Tagundnachtgleiche nahe am Äquator', () => expect(Math.abs(subsolarPoint(new Date('2026-03-20T14:46:00Z')).latitude)).toBeLessThan(1))
  it('liegt zur Juni-Sonnenwende bei etwa 23,4° Nord', () => expect(subsolarPoint(new Date('2026-06-21T08:00:00Z')).latitude).toBeCloseTo(23.4, 0))
})
