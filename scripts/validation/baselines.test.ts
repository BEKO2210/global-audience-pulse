import { expect, it } from 'vitest'
import { constant, pastHourMean, studyHoursBaseline } from './baselines'

it('computes causal local-hour and study baselines', () => {
  const prior = [
    { publishedAt: new Date('2026-10-12T08:00:00Z'), residual: 1 },
    { publishedAt: new Date('2026-10-11T08:30:00Z'), residual: 3 },
    { publishedAt: new Date('2026-10-11T09:00:00Z'), residual: 20 },
  ]
  expect(pastHourMean(new Date('2026-10-13T08:15:00Z'), prior, 'UTC')).toBe(2)
  expect(studyHoursBaseline(new Date('2026-10-12T17:00:00Z'), 'Europe/Berlin')).toBeGreaterThan(0)
  expect(constant()).toBe(0)
})
