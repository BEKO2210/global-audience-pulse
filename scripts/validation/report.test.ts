import { describe, expect, it } from 'vitest'
import { FALLBACK_SNAPSHOT } from '../../src/lib/snapshot'
import { renderValidationReport, validationVerdict, type ValidationResult } from './report'

const result: ValidationResult = {
  generatedAt: new Date('2026-10-13T12:00:00Z'),
  timeZone: 'Europe/Berlin',
  selected: ['eu_central'],
  snapshot: FALLBACK_SNAPSHOT,
  counts: { image: 100 },
  period: { from: new Date('2026-01-01'), to: new Date('2026-10-01') },
  exclusions: { 'zu wenig Vorgeschichte': 5 },
  score: { sd: 9, min: 10, max: 90, weeklyRangeShare: 11.25 },
  primary: { n: 100, rho: 0.2, ci: { low: 0.05, high: 0.35 }, p: 0.01 },
  exploratory: {
    uplift: 12,
    upliftCI: { low: 2, high: 24 },
    withoutReels: { n: 80, rho: 0.1, adjustedP: 0.2 },
    later: {
      n: 50,
      scoreRho: 0.2,
      pastHourMeanRho: 0.1,
      studyHoursRho: 0.05,
      constantRho: 0,
      adjustedPs: [0.1, 0.2, 0.3],
    },
  },
}

describe('validation report', () => {
  it('renders deterministic, privacy-safe Markdown and evaluates GO', () => {
    const first = renderValidationReport(result)
    expect(renderValidationReport(result)).toBe(first)
    expect(first).toContain('## Urteil: GO')
    expect(first).not.toContain('Permalink:')
    expect(validationVerdict(result).verdict).toBe('GO')
  })

  it('explains an unclear result', () => {
    const unclear = {
      ...result,
      score: { ...result.score, sd: 4 },
      primary: { ...result.primary, n: 40, ci: { low: -0.1, high: 0.3 } },
    }
    expect(validationVerdict(unclear).reason).toContain('Konfidenzintervall enthält 0')
    expect(validationVerdict(unclear).verdict).toBe('UNKLAR')
  })

  it('reports only data scarcity and the most frequent exclusion below n = 3', () => {
    const empty = {
      ...result,
      counts: {},
      period: undefined,
      exclusions: { 'Mindestalter nicht erreicht': 21, beworben: 2 },
      score: { sd: 0, min: Number.NaN, max: Number.NaN, weeklyRangeShare: 0 },
      primary: { n: 0, rho: Number.NaN, ci: { low: Number.NaN, high: Number.NaN }, p: 1 },
    }
    expect(validationVerdict(empty).reason).toBe(
      'keine auswertbaren Beiträge; häufigste Ausschlussursache: Mindestalter nicht erreicht (21)',
    )
    const report = renderValidationReport(empty)
    expect(report).toContain('- Standardabweichung: nicht verfügbar')
    expect(report).not.toContain('Score-SD unter 8')

    const tiny = { ...empty, primary: { ...empty.primary, n: 2 } }
    expect(validationVerdict(tiny).reason).toBe(
      'zu wenige auswertbare Beiträge; häufigste Ausschlussursache: Mindestalter nicht erreicht (21)',
    )
  })
})
