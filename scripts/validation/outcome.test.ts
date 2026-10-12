import { describe, expect, it } from 'vitest'
import { residualize, type PostRecord } from './outcome'

const post = (id: string, day: number, reach: number): PostRecord => ({
  id,
  type: 'image',
  reach,
  publishedAt: new Date(Date.UTC(2026, 0, day)),
})

describe('residualize', () => {
  it('sorts first and never uses a later post in a residual', () => {
    const input = [
      post('late', 7, 700),
      post('first', 1, 100),
      post('sixth', 6, 600),
      post('second', 2, 200),
      post('fifth', 5, 500),
      post('third', 3, 300),
      post('fourth', 4, 400),
    ]
    const result = residualize(input, {
      now: new Date('2026-03-01'),
      minAgeDays: { image: 0, carousel: 0, reel: 0, story: 0, other: 0 },
    })
    expect(result.rows.map((row) => row.id)).toEqual(['sixth', 'late'])
    expect(result.rows[0]?.priorMedian).toBeCloseTo(Math.log1p(300))
  })

  it('excludes stories, paid content, and immature posts with reasons', () => {
    const base = post('base', 1, 1)
    const result = residualize(
      [
        { ...base, id: 'story', type: 'story' },
        { ...base, id: 'paid', boosted: true },
        { ...base, id: 'young', publishedAt: new Date('2026-10-12') },
      ],
      {
        now: new Date('2026-10-13'),
        minAgeDays: { image: 7, carousel: 7, reel: 28, story: 0, other: 7 },
      },
    )
    expect(result.excluded.map((entry) => entry.reason).sort()).toEqual(
      ['Story (getrennter Datensatz)', 'beworben', 'Mindestalter nicht erreicht'].sort(),
    )
  })
})
