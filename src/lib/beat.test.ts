import { describe, expect, it } from 'vitest'
import { beatSeconds } from './beat'

describe('beatSeconds', () => {
  it('maps the score to a 6 s → 2.4 s beat in 0.4 s steps', () => {
    expect(beatSeconds(0)).toBeCloseTo(6)
    expect(beatSeconds(100)).toBeCloseTo(2.4)
    expect(beatSeconds(60)).toBeCloseTo(4) // raw 3.84 s → nearest 0.4 s step
    expect(beatSeconds(150)).toBeCloseTo(2.4)
    expect(beatSeconds(undefined)).toBe(4)
    expect(beatSeconds(Number.NaN)).toBe(4)
  })
})
