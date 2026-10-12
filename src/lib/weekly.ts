import type { AnalysisReportBody } from '../components/report/types'

/** weekly.json from the data branch (scripts/analysis/weekly.ts), written on Sunday evenings. */
export interface WeeklyPayload {
  woche: string
  generatedAt: string
  source: 'llm' | 'template'
  sourceEn?: 'llm' | 'template'
  facts: {
    tage: { datum: string; hoch: number; hochUm: string; mittel: number }[]
    besteStunden: { stunde: string; mittel: number }[]
    wochenmittel: number
  }
  report: AnalysisReportBody
  reportEn?: AnalysisReportBody
}

/** Shown for eight days, so a review never outlives the following Sunday by more than a day. */
export const SHOW_DAYS = 8

export function isWeekly(value: unknown): value is WeeklyPayload {
  const v = value as Partial<WeeklyPayload> | null
  return Boolean(v?.woche && v.report?.schlagzeile && Array.isArray(v.facts?.tage))
}

/** A review worth showing: well-formed and not older than SHOW_DAYS. */
export function isCurrentWeekly(value: unknown, now = Date.now()): value is WeeklyPayload {
  return isWeekly(value) && now - Date.parse(value.generatedAt) <= SHOW_DAYS * 86_400_000
}
