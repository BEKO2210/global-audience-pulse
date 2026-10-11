import { describe, expect, it } from 'vitest'
import type { AnalysisFacts } from '../components/report/types'
import { anomalyOf } from './anomaly'

const signal = (ort: string, abweichungProzent: number) => ({
  ort,
  letzteStundeOrtszeit: '08:00',
  aufrufe: 1000,
  typisch: 1000,
  abweichungProzent,
})
const holiday = (wann: 'heute' | 'morgen') => ({
  ort: 'Tokio',
  flagge: 'jp' as const,
  wann,
  datum: '2026-10-12',
  name: 'スポーツの日 (Sports Day)',
  nameEn: 'Sports Day',
})

describe('anomalyOf (T-019)', () => {
  it('ignores ordinary deviations and tomorrow’s holidays', () => {
    const facts: AnalysisFacts = {
      liveSignale: [signal('Berlin', -18), signal('Mumbai', 25)],
      feiertage: [holiday('morgen')],
    }
    expect(anomalyOf(facts)).toBeNull()
    expect(anomalyOf(undefined)).toBeNull()
  })

  it('picks the strongest live deviation beyond 25 %', () => {
    const facts: AnalysisFacts = {
      liveSignale: [signal('Berlin', -28.4), signal('Mumbai', 41)],
      feiertage: [holiday('heute')],
    }
    expect(anomalyOf(facts)).toEqual({ kind: 'signal', ort: 'Mumbai', percent: 41 })
  })

  it('falls back to a public holiday today', () => {
    expect(
      anomalyOf({ liveSignale: [signal('Berlin', 10)], feiertage: [holiday('heute')] }),
    ).toMatchObject({
      kind: 'holiday',
      ort: 'Tokio',
      nameEn: 'Sports Day',
    })
  })
})
