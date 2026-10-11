import { CalendarPlus } from '@phosphor-icons/react'
import { downloadIcs, type CalendarEvent } from '../lib/ics'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import { SITE_URL, type Messages } from '../i18n/locale'
import './CalendarButton.css'

const DE = {
  label: 'In Kalender',
  file: 'posting-fenster.ics',
  description: (detail: string) => `${detail}\nBerechnet von Global Audience Pulse`,
}
const EN: typeof DE = {
  label: 'Add to calendar',
  file: 'posting-window.ics',
  description: (detail) => `${detail}\nCalculated by Global Audience Pulse`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

/** T-080: "add to calendar" right where a time is shown; one .ics with the window in UTC. */
export function CalendarButton({
  start,
  end,
  summary,
  detail,
  ort,
  accessibleLabel,
  compact = false,
}: {
  start: Date
  end: Date
  summary: string
  detail: string
  ort: 'hero' | 'frage' | 'plan'
  /** full name for screen readers when the visible text is short, e.g. "Instagram: …" */
  accessibleLabel?: string
  compact?: boolean
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const event: CalendarEvent = {
    start,
    end,
    summary,
    description: t.description(detail),
    url: locale === 'de' ? SITE_URL : `${SITE_URL}?lang=en`,
  }
  return (
    <button
      type="button"
      className={`calendar-button${compact ? ' is-compact' : ''}`}
      aria-label={accessibleLabel ? `${accessibleLabel}: ${t.label}` : undefined}
      title={compact ? t.label : undefined}
      onClick={() => {
        downloadIcs(event, t.file)
        track('Kalender', { ort })
      }}
    >
      <CalendarPlus size={16} aria-hidden="true" />
      {!compact && t.label}
    </button>
  )
}
