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

export const REGIONS: readonly RegionConfig[] = [
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
    id: 'eu_uk',
    name: 'UK & Irland',
    city: 'London',
    flag: 'gb',
    timeZone: 'Europe/London',
    coordinates: [-0.128, 51.507],
    countries: ['GBR', 'IRL'],
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

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<
  RegionId,
  RegionConfig
>

export const PRESETS = [
  { name: 'Transatlantik', ids: ['eu_central', 'eu_uk', 'us_east'] },
  { name: 'USA coast-to-coast', ids: ['us_east', 'us_west'] },
  { name: 'Ost-Welle', ids: ['india', 'east_asia', 'mena', 'eu_central'] },
] as const satisfies readonly { name: string; ids: readonly RegionId[] }[]
