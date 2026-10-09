export type RegionId =
  'us_east' | 'us_west' | 'eu_central' | 'eu_uk' | 'latam' | 'mena' | 'india' | 'east_asia'

export interface RegionConfig {
  id: RegionId
  name: string
  city: string
  flagUrl: string
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
    flagUrl: usFlag,
    timeZone: 'America/New_York',
    coordinates: [-74.006, 40.713],
    countries: ['USA'],
    usShare: 0.62,
  },
  {
    id: 'us_west',
    name: 'USA West',
    city: 'Los Angeles',
    flagUrl: usFlag,
    timeZone: 'America/Los_Angeles',
    coordinates: [-118.244, 34.052],
    countries: ['USA'],
    usShare: 0.38,
  },
  {
    id: 'eu_central',
    name: 'Europa Zentral',
    city: 'Berlin',
    flagUrl: euFlag,
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
    flagUrl: gbFlag,
    timeZone: 'Europe/London',
    coordinates: [-0.128, 51.507],
    countries: ['GBR', 'IRL'],
  },
  {
    id: 'latam',
    name: 'Lateinamerika',
    city: 'São Paulo',
    flagUrl: brFlag,
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
    flagUrl: aeFlag,
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
    flagUrl: inFlag,
    timeZone: 'Asia/Kolkata',
    coordinates: [72.878, 19.076],
    countries: ['IND', 'PAK', 'BGD', 'LKA', 'NPL'],
    project: 'hi.wikipedia',
  },
  {
    id: 'east_asia',
    name: 'Ostasien',
    city: 'Tokio',
    flagUrl: jpFlag,
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
import usFlag from 'flag-icons/flags/4x3/us.svg?url'
import euFlag from 'flag-icons/flags/4x3/eu.svg?url'
import gbFlag from 'flag-icons/flags/4x3/gb.svg?url'
import brFlag from 'flag-icons/flags/4x3/br.svg?url'
import aeFlag from 'flag-icons/flags/4x3/ae.svg?url'
import inFlag from 'flag-icons/flags/4x3/in.svg?url'
import jpFlag from 'flag-icons/flags/4x3/jp.svg?url'
