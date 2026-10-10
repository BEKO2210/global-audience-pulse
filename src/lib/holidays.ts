import type { RegionId } from '../config/regions'
import { fastZonedParts } from './time'

export interface Holiday {
  /** local calendar date, YYYY-MM-DD */
  date: string
  name: string
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
