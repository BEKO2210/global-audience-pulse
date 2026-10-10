import type { FlagCode } from './flag-codes'
export type RegionId =
  'us_east' | 'us_west' | 'eu_central' | 'eu_uk' | 'latam' | 'mena' | 'india' | 'east_asia'

export interface RegionConfig {
  id: RegionId
  name: string
  city: string
  /** flag-icons country code; URLs live in flags.ts so Node scripts can import this file. */
  flag: FlagCode
  timeZone: string
  coordinates: readonly [number, number]
  countries: readonly string[]
  project?: string
  usShare?: number
}

export const US_SPLIT_SOURCE =
  'https://www.census.gov/data/tables/time-series/demo/popest/2020s-state-total.html'

const REGION_DEFINITIONS: readonly RegionConfig[] = [
  {
    id: 'us_west',
    name: 'USA West',
    city: 'Los Angeles',
    flag: 'us',
    timeZone: 'America/Los_Angeles',
    coordinates: [-118.244, 34.052],
    countries: ['USA'],
    usShare: 0.38,
  },
  {
    id: 'us_east',
    name: 'USA Ost',
    city: 'New York',
    flag: 'us',
    timeZone: 'America/New_York',
    coordinates: [-74.006, 40.713],
    countries: ['USA'],
    usShare: 0.62,
  },
  {
    id: 'latam',
    name: 'Lateinamerika',
    city: 'São Paulo',
    flag: 'br',
    timeZone: 'America/Sao_Paulo',
    coordinates: [-46.633, -23.55],
    countries: [
      'BRA',
      'MEX',
      'ARG',
      'COL',
      'CHL',
      'PER',
      'VEN',
      'ECU',
      'GTM',
      'BOL',
      'DOM',
      'HND',
      'PRY',
      'SLV',
      'NIC',
      'CRI',
      'PAN',
      'URY',
    ],
    project: 'pt.wikipedia',
  },
  {
    id: 'eu_uk',
    name: 'UK & Irland',
    city: 'London',
    flag: 'gb',
    timeZone: 'Europe/London',
    coordinates: [-0.128, 51.507],
    countries: ['GBR', 'IRL'],
  },
  {
    id: 'eu_central',
    name: 'Europa Zentral',
    city: 'Berlin',
    flag: 'eu',
    timeZone: 'Europe/Berlin',
    coordinates: [13.405, 52.52],
    countries: [
      'DEU',
      'AUT',
      'CHE',
      'FRA',
      'NLD',
      'BEL',
      'POL',
      'ITA',
      'ESP',
      'PRT',
      'CZE',
      'DNK',
      'SWE',
      'NOR',
      'FIN',
    ],
    project: 'de.wikipedia',
  },
  {
    id: 'mena',
    name: 'Nahost & Nordafrika',
    city: 'Dubai',
    flag: 'ae',
    timeZone: 'Asia/Dubai',
    coordinates: [55.27, 25.204],
    countries: [
      'ARE',
      'SAU',
      'EGY',
      'MAR',
      'DZA',
      'TUN',
      'JOR',
      'LBN',
      'IRQ',
      'KWT',
      'QAT',
      'OMN',
      'BHR',
    ],
    project: 'ar.wikipedia',
  },
  {
    id: 'india',
    name: 'Südasien',
    city: 'Mumbai',
    flag: 'in',
    timeZone: 'Asia/Kolkata',
    coordinates: [72.878, 19.076],
    countries: ['IND', 'PAK', 'BGD', 'LKA', 'NPL'],
    project: 'hi.wikipedia',
  },
  {
    id: 'east_asia',
    name: 'Ostasien',
    city: 'Tokio',
    flag: 'jp',
    timeZone: 'Asia/Tokyo',
    coordinates: [139.692, 35.69],
    countries: ['JPN', 'KOR', 'TWN'],
    project: 'ja.wikipedia',
  },
] as const

/** Current offset keeps the west-to-east order correct across DST boundaries. */
export function currentUtcOffsetMinutes(timeZone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  const wallAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  )
  return Math.round((wallAsUtc - Math.floor(at.getTime() / 1_000) * 1_000) / 60_000)
}

/** Derives the single canonical presentation order: west to east at the given instant. */
export function regionsWestToEast(at = new Date()): readonly RegionConfig[] {
  return [...REGION_DEFINITIONS].sort(
    (a, b) =>
      currentUtcOffsetMinutes(a.timeZone, at) - currentUtcOffsetMinutes(b.timeZone, at) ||
      a.coordinates[0] - b.coordinates[0],
  )
}

export const REGIONS = regionsWestToEast()

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<
  RegionId,
  RegionConfig
>

export const PRESETS = [
  { name: 'Transatlantik', ids: ['us_east', 'eu_uk', 'eu_central'] },
  { name: 'USA coast-to-coast', ids: ['us_west', 'us_east'] },
  { name: 'Ost-Welle', ids: ['eu_central', 'mena', 'india', 'east_asia'] },
] as const satisfies readonly { name: string; ids: readonly RegionId[] }[]
