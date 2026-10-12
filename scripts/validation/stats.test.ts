import { describe, expect, it } from 'vitest'
import {
  blockBootstrapCI,
  holm,
  mulberry32,
  nForSpearman,
  permutationP,
  spearman,
  tercileUplift,
} from './stats'

describe('statistics', () => {
  it('averages tied ranks', () => {
    expect(spearman([1, 2, 2, 4], [10, 20, 20, 40])).toBe(1)
    expect(spearman([1, 2, 3], [3, 2, 1])).toBe(-1)
  })

  it('is seeded and returns percentile intervals and permutation p-values', () => {
    expect([mulberry32(7)(), mulberry32(7)()]).toEqual([mulberry32(7)(), mulberry32(7)()])
    const rows = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: i + (i % 3),
      block: Math.floor(i / 5),
    }))
    const ci = blockBootstrapCI(
      rows,
      (row) => row.block,
      (sample) =>
        spearman(
          sample.map((row) => row.x),
          sample.map((row) => row.y),
        ),
      { B: 200, seed: 1, level: 0.95 },
    )
    expect(ci.low).toBeGreaterThan(0.9)
    expect(
      permutationP(
        rows.map((row) => row.x),
        rows.map((row) => row.y),
        { n: 200, seed: 1 },
      ),
    ).toBeLessThan(0.02)
  })

  it('computes uplift, Holm adjustment, and Fisher-z sample sizes', () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ score: i, residual: i / 10 }))
    expect(tercileUplift(rows)).toBeGreaterThan(50)
    expect(holm([0.01, 0.04, 0.03])).toEqual([0.03, 0.06, 0.06])
    expect(nForSpearman(0.3, 0.05, 0.8, 'two')).toBeGreaterThan(80)
  })
})
