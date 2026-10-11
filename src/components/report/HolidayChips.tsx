import { Flag } from '../Flag'
import type { AnalysisFacts } from './types'
import { useLocale, useMessages } from '../../i18n/LocaleProvider'
import type { Messages } from '../../i18n/locale'
import { cityName } from '../../i18n/labels'
import type { RegionId } from '../../config/regions'

const DE = {
  label: 'Feiertage in den Regionen',
  holiday: (when: 'heute' | 'morgen', city: string, name: string) =>
    `Feiertag ${when} in ${city}: ${name}`,
}
const EN: typeof DE = {
  label: 'Public holidays in the regions',
  holiday: (when, city, name) =>
    `Public holiday ${when === 'heute' ? 'today' : 'tomorrow'} in ${city}: ${name}`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

/** "Feiertag heute in Berlin: Tag der Deutschen Einheit" – only what the facts carry. */
export function HolidayChips({ facts }: { facts: AnalysisFacts }) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const list = facts.feiertage ?? []
  const city = (ort: string) => {
    const id = facts.regionen?.find((r) => r.ort === ort)?.id
    return id ? cityName(id as RegionId, ort, locale) : ort
  }
  if (!list.length) return null
  return (
    <div className="lr-memory lr-holidays" role="list" aria-label={t.label}>
      {list.map((h) => (
        <span key={`${h.ort}-${h.datum}`} className="lr-memory-badge lr-holiday" role="listitem">
          <Flag code={h.flagge} label="" size={16} />
          {t.holiday(h.wann, city(h.ort), locale === 'en' ? (h.nameEn ?? h.name) : h.name)}
        </span>
      ))}
    </div>
  )
}
