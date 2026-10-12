import { PLAYBOOKS, studyHours, type Weekday } from '../../src/data/playbooks'
import { fastZonedParts } from '../../src/lib/time'

export interface BaselineRow {
  publishedAt: Date
  residual: number
}

export function pastHourMean(date: Date, prior: readonly BaselineRow[], timeZone: string) {
  const hour = fastZonedParts(date, timeZone).hour
  const matching = prior.filter((row) => fastZonedParts(row.publishedAt, timeZone).hour === hour)
  return matching.length
    ? matching.reduce((sum, row) => sum + row.residual, 0) / matching.length
    : 0
}

const JS_DAY_TO_WEEKDAY = [6, 0, 1, 2, 3, 4, 5] as const

export function studyHoursBaseline(date: Date, timeZone: string) {
  const parts = fastZonedParts(date, timeZone)
  const jsDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  const weekday = JS_DAY_TO_WEEKDAY[jsDay] as Weekday
  const instagram = PLAYBOOKS.find((playbook) => playbook.id === 'instagram')
  return (instagram?.times ?? []).reduce(
    (sum, study) => sum + (studyHours(study, weekday).has(parts.hour) ? 1 : 0),
    0,
  )
}

export function constant() {
  return 0
}
