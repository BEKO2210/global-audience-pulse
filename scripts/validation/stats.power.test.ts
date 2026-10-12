import { expect, it } from 'vitest'
import { blockBootstrapCI, mulberry32, spearman } from './stats'

interface Row {
  score: number
  residual: number
  week: number
}

function normal(random: () => number) {
  return (
    Math.sqrt(-2 * Math.log(Math.max(random(), Number.EPSILON))) * Math.cos(2 * Math.PI * random())
  )
}

function trial(seed: number, effect: number) {
  const random = mulberry32(seed)
  const rows: Row[] = Array.from({ length: 200 }, (_, index) => {
    const score = normal(random)
    return {
      score,
      residual: effect * score + Math.sqrt(1 - effect ** 2) * normal(random),
      week: Math.floor(index / 10),
    }
  })
  return blockBootstrapCI(
    rows,
    (row) => row.week,
    (sample) =>
      spearman(
        sample.map((row) => row.score),
        sample.map((row) => row.residual),
      ),
    { B: 400, seed: 20_261_013 + seed, level: 0.95 },
  )
}

it('detects a real rho near 0.3 and has calibrated null coverage', () => {
  let detected = 0
  let covered = 0
  for (let seed = 0; seed < 50; seed += 1) {
    if (trial(seed, 0.32).low > 0) detected += 1
    const nullCI = trial(seed, 0)
    if (nullCI.low <= 0 && nullCI.high >= 0) covered += 1
  }
  expect(detected).toBeGreaterThanOrEqual(40)
  expect(covered).toBeGreaterThanOrEqual(45)
  expect(covered).toBeLessThanOrEqual(49)
}, 20_000)
