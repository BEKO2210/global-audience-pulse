import { describe, expect, it } from 'vitest'
import { PLAYBOOKS } from '../data/playbooks'
import { pickPostingTimes, studySupport, type AudienceRegion } from './postingPlan'

const berlin: AudienceRegion = {
  id: 'eu_central',
  city: 'Berlin',
  timeZone: 'Europe/Berlin',
  weight: 0.6,
}
const ny: AudienceRegion = {
  id: 'us_east',
  city: 'New York',
  timeZone: 'America/New_York',
  weight: 0.4,
}
const x = PLAYBOOKS.find((p) => p.id === 'x')!

describe('studySupport', () => {
  it('checks each region in its own local time', () => {
    // Tue 2026-10-13 13:00 UTC = 15:00 Berlin (Sprout X window Tue 12–18) and 09:00 New York (Buffer X top slot).
    const at = new Date('2026-10-13T13:00:00Z')
    const { support, cities } = studySupport(x, [berlin, ny], at)
    expect(cities).toEqual(['Berlin', 'New York'])
    expect(support).toBeCloseTo(1)
    // Tue 03:00 UTC: 05:00 Berlin, 23:00 Mon New York – no study hour for X.
    expect(studySupport(x, [berlin, ny], new Date('2026-10-13T03:00:00Z')).support).toBe(0)
  })
})

describe('pickPostingTimes', () => {
  const from = new Date('2026-10-12T22:10:00Z') // Monday night UTC

  it('takes the earliest hour that is good by score and covered by the studies', () => {
    const picks = pickPostingTimes({
      scoreAt: () => 70,
      regions: [berlin, ny],
      from,
      goodScore: 62,
    })
    const pick = picks.find((p) => p.platform === 'x')!
    expect(pick.quality).toBe('gut')
    expect(pick.at.getTime() % 3_600_000).toBe(0)
    expect(pick.at.getTime()).toBeGreaterThan(from.getTime())
    expect(pick.support).toBeGreaterThanOrEqual(0.5)
    expect(picks.some((p) => p.platform === 'hackernews')).toBe(false) // no study times
  })

  it('falls back to the best covered hour when the score never reaches the bar', () => {
    const scoreAt = (d: Date) => (d.getUTCHours() === 13 ? 55 : 30)
    const pick = pickPostingTimes({ scoreAt, regions: [berlin, ny], from, goodScore: 62 }).find(
      (p) => p.platform === 'x',
    )!
    expect(pick.quality).toBe('bestes-verfuegbar')
    expect(pick.score).toBe(55)
    expect(pick.at.getUTCHours()).toBe(13)
  })

  it('returns nothing without an audience', () => {
    expect(pickPostingTimes({ scoreAt: () => 80, regions: [], from, goodScore: 62 })).toEqual([])
  })
})
