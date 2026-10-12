import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseInstagramCsv } from './instagram-csv'
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

  it('uses excluded paid and collaborative predecessors in same-type history', () => {
    const predecessors = [
      post('regular-1', 1, 100),
      { ...post('paid', 2, 200), boosted: true },
      { ...post('collab', 3, 300), collaborative: true },
      post('regular-2', 8, 400),
      post('regular-3', 9, 500),
    ]
    const result = residualize([...predecessors, post('candidate', 10, 600)], {
      now: new Date('2026-02-10T12:00:00Z'),
      minAgeDays: { image: 2, carousel: 2, reel: 2, story: 0, other: 2 },
    })
    expect(result.rows.map((row) => row.id)).toEqual(['candidate'])
    expect(result.rows[0]?.priorMedian).toBeCloseTo(Math.log1p(300))
  })

  it('makes fixture post p020 evaluable using boosted predecessor p017', async () => {
    const text = await readFile('scripts/validation/fixtures/instagram-synthetic.csv', 'utf8')
    const parsed = parseInstagramCsv(text, { timeZone: 'Europe/Berlin' })
    const result = residualize(parsed.posts, {
      now: new Date('2026-10-13T12:00:00Z'),
      minAgeDays: { image: 7, carousel: 7, reel: 28, story: 0, other: 7 },
    })
    expect(result.rows.some((row) => row.id === 'p020')).toBe(true)
  })

  it('keeps equal-time posts out of each other history and orders IDs deterministically', () => {
    const prior = post('prior', 1, 100)
    const publishedAt = new Date(Date.UTC(2026, 0, 2))
    const result = residualize(
      [
        { ...post('a', 2, 300), publishedAt },
        { ...prior, id: 'B', reach: 200, publishedAt },
        prior,
      ],
      {
        now: new Date('2026-03-01'),
        minAgeDays: { image: 0, carousel: 0, reel: 0, story: 0, other: 0 },
        minPrior: 2,
      },
    )
    expect(result.rows).toHaveLength(0)
    expect(result.excluded.map((entry) => entry.id)).toEqual(['prior', 'B', 'a'])
  })
})
