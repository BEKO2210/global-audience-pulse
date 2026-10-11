import type { RegionId } from '../config/regions'
import { fastZonedParts } from './time'

export interface Holiday {
  /** local calendar date, YYYY-MM-DD */
  date: string
  /** local name, as the country writes it */
  name: string
  /** English name, when it differs from the local one */
  en?: string
}

/** Any letter outside Latin script (e.g. スポーツの日): German readers then also get the English name. */
const NON_LATIN = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u

/** Display name: English edition uses the English name; German keeps the local one, plus English if unreadable. */
export function holidayLabel(holiday: Holiday, locale: 'de' | 'en') {
  if (locale === 'en') return holiday.en ?? holiday.name
  return holiday.en && NON_LATIN.test(holiday.name)
    ? `${holiday.name} (${holiday.en})`
    : holiday.name
}

/** Nationwide public holidays per region (from Nager.Date at build time; mena/india are not covered). */
export type Holidays = Partial<Record<RegionId, readonly Holiday[]>>

/** Calendar date in a time zone, YYYY-MM-DD. */
export function localDate(date: Date, timeZone: string) {
  const p = fastZonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** The holiday a region has on this moment's local date, if any. */
export function holidayAt(
  holidays: Holidays | undefined,
  region: { id: RegionId; timeZone: string },
  date: Date,
): Holiday | null {
  const list = holidays?.[region.id]
  if (!list?.length) return null
  const day = localDate(date, region.timeZone)
  return list.find((h) => h.date === day) ?? null
}
