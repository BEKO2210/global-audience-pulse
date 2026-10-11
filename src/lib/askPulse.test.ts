import { describe, expect, it } from 'vitest'
import { ASK_AUDIENCES, askPulse } from './askPulse'

const now = new Date(Date.UTC(2026, 9, 11, 8, 0))
const hour = (d: Date) => (d.getTime() - now.getTime()) / 3_600_000

describe('askPulse (T-016)', () => {
  it('lists the report audiences', () => {
    expect(ASK_AUDIENCES.map((a) => a.name)).toEqual([
      'Global',
      'DACH & Europa',
      'USA',
      'Transatlantik',
      'Ost-Welle',
    ])
  })

  it('names the best window later today', () => {
    const answer = askPulse((d) => (Math.abs(hour(d) - 10) < 1 ? 80 : 30), now)
    expect(answer.postNow).toBe(false)
    expect(answer.good).toBe(true)
    expect(hour(answer.best!.start)).toBeGreaterThan(8.5)
    expect(hour(answer.best!.start)).toBeLessThan(10.5)
  })

  it('says post now when now is the peak', () => {
    const answer = askPulse((d) => 80 - Math.abs(hour(d)) * 2, now)
    expect(answer.postNow).toBe(true)
  })
})
