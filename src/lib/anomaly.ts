// T-019: one unusual thing worth a glance, from the hourly report's facts – only real anomalies, never filler.
import type { AnalysisFacts } from '../components/report/types'

/** Live-signal deviation (Wikipedia views vs. the usual for this hour) that counts as unusual. */
export const ANOMALY_PERCENT = 25

export type Anomaly =
  | { kind: 'signal'; ort: string; percent: number }
  | { kind: 'holiday'; ort: string; name: string; nameEn?: string }

/** Strongest live deviation beyond ±25 %, else a public holiday today, else nothing. */
export function anomalyOf(facts: AnalysisFacts | undefined): Anomaly | null {
  const signal = (facts?.liveSignale ?? [])
    .filter((s) => Math.abs(s.abweichungProzent) > ANOMALY_PERCENT)
    .sort((a, b) => Math.abs(b.abweichungProzent) - Math.abs(a.abweichungProzent))[0]
  if (signal)
    return { kind: 'signal', ort: signal.ort, percent: Math.round(signal.abweichungProzent) }
  const holiday = facts?.feiertage?.find((h) => h.wann === 'heute')
  if (holiday)
    return { kind: 'holiday', ort: holiday.ort, name: holiday.name, nameEn: holiday.nameEn }
  return null
}
