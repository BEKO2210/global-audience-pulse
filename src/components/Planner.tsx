import { useEffect, useState } from 'react'
import { Check, DownloadSimple, Fire, ShareNetwork } from '@phosphor-icons/react'
import { REGIONS, type RegionConfig, type RegionId } from '../config/regions'
import { phaseAt, type PostingWindow } from '../lib/model'
import { formatDateTime, formatTime, localDecimalHourFast, timeZoneName } from '../lib/time'
import { AnimatedNumber } from './AnimatedNumber'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import { downloadIcs } from '../lib/ics'
import { SITE_URL } from '../i18n/locale'
import type { Locale, Messages } from '../i18n/locale'
import { cityName, phaseName } from '../i18n/labels'

const DE = {
  icsSummary: 'Optimales Posting-Fenster',
  icsFile: 'posting-fenster.ics',
  planCopied: 'Plan kopiert',
  shareTitle: 'Mein Posting-Plan',
  linkCopied: 'Link kopiert',
  title: 'Die nächsten starken Fenster',
  zoneNote: 'Kalendertage in deiner Zeitzone',
  period: 'Planungszeitraum',
  today: (n: number) => `Heute (${n})`,
  tomorrow: (n: number) => `Morgen (${n})`,
  week: (n: number) => `7 Tage (${n})`,
  until: 'bis',
  atPeak: 'Im Peak:',
  noPeak: 'Kein Kernmarkt in der Hochphase',
  download: 'Als Kalenderdatei laden',
  copiedToClipboard: 'In Zwischenablage kopiert',
  copyPlan: 'Plan kopieren',
  shareLink: 'Link teilen',
  nextDst: 'Nächste Zeitumstellung:',
}
const EN: typeof DE = {
  icsSummary: 'Optimal posting window',
  icsFile: 'posting-window.ics',
  planCopied: 'Plan copied',
  shareTitle: 'My posting plan',
  linkCopied: 'Link copied',
  title: 'The next strong windows',
  zoneNote: 'Calendar days in your time zone',
  period: 'Planning period',
  today: (n) => `Today (${n})`,
  tomorrow: (n) => `Tomorrow (${n})`,
  week: (n) => `7 days (${n})`,
  until: 'until',
  atPeak: 'At peak:',
  noPeak: 'No core market at its peak',
  download: 'Download as calendar file',
  copiedToClipboard: 'Copied to clipboard',
  copyPlan: 'Copy plan',
  shareLink: 'Share link',
  nextDst: 'Next clock change:',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const dateTimeFormats = new Map<string, Intl.DateTimeFormat>()
/** German keeps the shared formatDateTime; English gets the same fields in en-GB order. */
function formatStart(date: Date, timeZone: string, locale: Locale, intl: string) {
  if (locale === 'de') return formatDateTime(date, timeZone)
  const key = `${intl}|${timeZone}`
  let format = dateTimeFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(intl, {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    })
    dateTimeFormats.set(key, format)
  }
  return format.format(date)
}

export function Planner({
  windowSets,
  selected,
  dst,
}: {
  windowSets: {
    today: readonly PostingWindow[]
    tomorrow: readonly PostingWindow[]
    week: readonly PostingWindow[]
  }
  selected: readonly RegionId[]
  dst?: { region: RegionConfig; date: Date }
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  // O-011: "Ganze Woche planen" links to #planer and opens the 7-day view
  const [scope, setScope] = useState<keyof typeof windowSets>(() =>
    typeof window !== 'undefined' && window.location.hash === '#planer' ? 'week' : 'today',
  )
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#planer') setScope('week')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const windows = windowSets[scope]
  const zielgruppe =
    selected.length === 0 ? 'leer' : selected.length === REGIONS.length ? 'alle' : 'eigene-auswahl'
  const plan = windows
    .map(
      (w, i) =>
        `${i + 1}. ${formatStart(w.start, zone, locale, intl)}–${formatTime(w.end, zone)} (${Math.round(w.score)}/100)`,
    )
    .join('\n')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plan)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = plan
      document.body.append(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setMessage(t.planCopied)
    setCopied(true)
    track('Plan kopiert')
    window.setTimeout(() => setCopied(false), 2_200)
  }
  const share = async () => {
    const data = { title: t.shareTitle, text: plan, url: location.href }
    if (navigator.share) {
      await navigator.share(data)
      track('Link geteilt', { methode: 'native' })
    } else {
      await navigator.clipboard.writeText(location.href)
      setMessage(t.linkCopied)
      track('Link geteilt', { methode: 'zwischenablage' })
    }
  }
  return (
    <section className="panel planner" aria-labelledby="planner-title">
      <div className="section-head">
        <h2 id="planner-title">{t.title}</h2>
        <span className="micro">{timeZoneName(new Date(), zone, intl)}</span>
      </div>
      <p className="planner-zone-note">{t.zoneNote}</p>
      <div className="filter-row planner-tabs" role="tablist" aria-label={t.period}>
        <button
          role="tab"
          onClick={() => {
            setScope('today')
            track('Planer Tab', { tab: 'heute' })
          }}
          aria-selected={scope === 'today'}
        >
          {t.today(windowSets.today.length)}
        </button>
        <button
          role="tab"
          onClick={() => {
            setScope('tomorrow')
            track('Planer Tab', { tab: 'morgen' })
          }}
          aria-selected={scope === 'tomorrow'}
        >
          {t.tomorrow(windowSets.tomorrow.length)}
        </button>
        <button
          role="tab"
          onClick={() => {
            setScope('week')
            track('Planer Tab', { tab: '7-tage' })
          }}
          aria-selected={scope === 'week'}
        >
          {t.week(windowSets.week.length)}
        </button>
      </div>
      <div className="planner-list" role="tabpanel">
        {windows.map((window, i) => (
          <article key={window.start.toISOString()}>
            <span className="window-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <strong>{formatStart(window.start, zone, locale, intl)}</strong>
              <p>
                {t.until} {formatTime(window.end, zone)} · Score{' '}
                <AnimatedNumber value={window.score} />
              </p>
              <small className="window-markets">
                <Fire size={14} weight="regular" aria-hidden="true" /> {t.atPeak}{' '}
                {REGIONS.filter((region) => selected.includes(region.id))
                  .filter((region) =>
                    ['prime', 'day'].includes(
                      phaseAt(localDecimalHourFast(window.start, region.timeZone)).id,
                    ),
                  )
                  .slice(0, 4)
                  .map((region) => {
                    const phase = phaseAt(localDecimalHourFast(window.start, region.timeZone))
                    return `${cityName(region.id, region.city, locale)} (${formatTime(window.start, region.timeZone)} ${phaseName(phase.id, phase.name, locale)})`
                  })
                  .join(', ') || t.noPeak}
              </small>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                downloadIcs(
                  {
                    start: window.start,
                    end: window.end,
                    summary: t.icsSummary,
                    description: `Score ${Math.round(window.score)}`,
                    url: SITE_URL,
                  },
                  t.icsFile,
                )
                track('ICS Download', { zielgruppe })
              }}
              aria-label={t.download}
            >
              <DownloadSimple size={19} weight="regular" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
      <div className="planner-actions">
        <button className={`button primary${copied ? ' copied' : ''}`} onClick={copy}>
          {copied && <Check size={18} weight="regular" aria-hidden="true" />}{' '}
          {copied ? t.copiedToClipboard : t.copyPlan}
        </button>
        <button className="button" onClick={share}>
          <ShareNetwork size={18} weight="regular" aria-hidden="true" /> {t.shareLink}
        </button>
      </div>
      {dst && (
        <p className="dst-note">
          {t.nextDst} {cityName(dst.region.id, dst.region.city, locale)} ·{' '}
          {dst.date.toLocaleDateString(intl, { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </section>
  )
}
