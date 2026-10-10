// Shared domain labels in both languages (regions, cities, phases, status levels, presets).
import type { RegionId } from '../config/regions'
import type { Locale } from './locale'

const REGION_NAME: Record<RegionId, Record<Locale, string>> = {
  us_west: { de: 'USA West', en: 'US West' },
  us_east: { de: 'USA Ost', en: 'US East' },
  latam: { de: 'Lateinamerika', en: 'Latin America' },
  eu_uk: { de: 'UK & Irland', en: 'UK & Ireland' },
  eu_central: { de: 'Europa Zentral', en: 'Central Europe' },
  mena: { de: 'Nahost & Nordafrika', en: 'Middle East & North Africa' },
  india: { de: 'Südasien', en: 'South Asia' },
  east_asia: { de: 'Ostasien', en: 'East Asia' },
}
const CITY: Partial<Record<RegionId, Record<Locale, string>>> = {
  east_asia: { de: 'Tokio', en: 'Tokyo' },
}
const PHASE: Record<string, Record<Locale, string>> = {
  sleep: { de: 'Nachtruhe', en: 'Night' },
  morning: { de: 'Morgen', en: 'Morning' },
  day: { de: 'Aktiver Tag', en: 'Active day' },
  prime: { de: 'Primetime', en: 'Prime time' },
  late: { de: 'Spätabend', en: 'Late evening' },
}
const STATUS: Record<string, Record<Locale, { label: string; verdict: string }>> = {
  strong: {
    de: { label: 'Hochphase', verdict: 'Jetzt posten' },
    en: { label: 'Peak', verdict: 'Post now' },
  },
  good: {
    de: { label: 'Gutes Momentum', verdict: 'Guter Moment' },
    en: { label: 'Good momentum', verdict: 'Good moment' },
  },
  medium: {
    de: { label: 'Im Aufbau', verdict: 'Noch etwas warten' },
    en: { label: 'Building', verdict: 'Wait a little' },
  },
  quiet: {
    de: { label: 'Ruhephase', verdict: 'Später posten' },
    en: { label: 'Quiet', verdict: 'Post later' },
  },
}
const PRESET: Record<string, Record<Locale, string>> = {
  Transatlantik: { de: 'Transatlantik', en: 'Transatlantic' },
  'USA coast-to-coast': { de: 'USA coast-to-coast', en: 'US coast to coast' },
  'Ost-Welle': { de: 'Ost-Welle', en: 'Eastern wave' },
}

export const regionName = (id: RegionId, locale: Locale) => REGION_NAME[id][locale]
export const cityName = (id: RegionId, city: string, locale: Locale) => CITY[id]?.[locale] ?? city
export const phaseName = (id: string, fallback: string, locale: Locale) =>
  PHASE[id]?.[locale] ?? fallback
export const statusText = (tone: string, locale: Locale) =>
  STATUS[tone]?.[locale] ?? STATUS.quiet![locale]
export const presetName = (name: string, locale: Locale) => PRESET[name]?.[locale] ?? name
