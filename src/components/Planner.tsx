import { useState } from 'react'
import { Check, DownloadSimple, Fire, ShareNetwork } from '@phosphor-icons/react'
import { REGIONS, type RegionConfig, type RegionId } from '../config/regions'
import { phaseAt, type PostingWindow } from '../lib/model'
import {
  fastZonedParts,
  formatDateTime,
  formatTime,
  localDecimalHourFast,
  timeZoneName,
} from '../lib/time'
import { AnimatedNumber } from './AnimatedNumber'
import { track } from '../lib/analytics'

function icsUtcDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}
function icsLocalDate(date: Date, timeZone: string) {
  const p = fastZonedParts(date, timeZone)
  return `${p.year}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}${String(p.minute).padStart(2, '0')}${String(p.second).padStart(2, '0')}`
}
function downloadIcs(window: PostingWindow, timeZone: string) {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Global Audience Pulse//DE',
    'BEGIN:VEVENT',
    `UID:${window.start.getTime()}@global-audience-pulse`,
    `DTSTAMP:${icsUtcDate(new Date())}`,
    `DTSTART;TZID=${timeZone}:${icsLocalDate(window.start, timeZone)}`,
    `DTEND;TZID=${timeZone}:${icsLocalDate(window.end, timeZone)}`,
    'SUMMARY:Optimales Posting-Fenster',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
  a.download = 'posting-fenster.ics'
  a.click()
  URL.revokeObjectURL(a.href)
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
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [scope, setScope] = useState<keyof typeof windowSets>('today')
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const windows = windowSets[scope]
  const zielgruppe =
    selected.length === 0 ? 'leer' : selected.length === REGIONS.length ? 'alle' : 'eigene-auswahl'
  const plan = windows
    .map(
      (w, i) =>
        `${i + 1}. ${formatDateTime(w.start, zone)}–${formatTime(w.end, zone)} (${Math.round(w.score)}/100)`,
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
    setMessage('Plan kopiert')
    setCopied(true)
    track('Plan kopiert')
    window.setTimeout(() => setCopied(false), 2_200)
  }
  const share = async () => {
    const data = { title: 'Mein Posting-Plan', text: plan, url: location.href }
    if (navigator.share) {
      await navigator.share(data)
      track('Link geteilt', { methode: 'native' })
    } else {
      await navigator.clipboard.writeText(location.href)
      setMessage('Link kopiert')
      track('Link geteilt', { methode: 'zwischenablage' })
    }
  }
  return (
    <section className="panel planner" aria-labelledby="planner-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">7-Tage-Planer</p>
          <h2 id="planner-title">Die nächsten starken Fenster</h2>
        </div>
        <span className="micro">{timeZoneName(new Date(), zone)}</span>
      </div>
      <p className="planner-zone-note">Kalendertage in deiner Zeitzone</p>
      <div className="filter-row planner-tabs" role="tablist" aria-label="Planungszeitraum">
        <button
          role="tab"
          onClick={() => {
            setScope('today')
            track('Planer Tab', { tab: 'heute' })
          }}
          aria-selected={scope === 'today'}
        >
          Heute ({windowSets.today.length})
        </button>
        <button
          role="tab"
          onClick={() => {
            setScope('tomorrow')
            track('Planer Tab', { tab: 'morgen' })
          }}
          aria-selected={scope === 'tomorrow'}
        >
          Morgen ({windowSets.tomorrow.length})
        </button>
        <button
          role="tab"
          onClick={() => {
            setScope('week')
            track('Planer Tab', { tab: '7-tage' })
          }}
          aria-selected={scope === 'week'}
        >
          7 Tage ({windowSets.week.length})
        </button>
      </div>
      <div className="planner-list" role="tabpanel">
        {windows.map((window, i) => (
          <article key={window.start.toISOString()}>
            <span className="window-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <strong>{formatDateTime(window.start, zone)}</strong>
              <p>
                bis {formatTime(window.end, zone)} · Score <AnimatedNumber value={window.score} />
              </p>
              <small className="window-markets">
                <Fire size={14} weight="regular" aria-hidden="true" /> Im Peak:{' '}
                {REGIONS.filter((region) => selected.includes(region.id))
                  .filter((region) =>
                    ['prime', 'day'].includes(
                      phaseAt(localDecimalHourFast(window.start, region.timeZone)).id,
                    ),
                  )
                  .slice(0, 4)
                  .map(
                    (region) =>
                      `${region.city} (${formatTime(window.start, region.timeZone)} ${phaseAt(localDecimalHourFast(window.start, region.timeZone)).name})`,
                  )
                  .join(' · ') || 'Kein Kernmarkt in der Hochphase'}
              </small>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                downloadIcs(window, zone)
                track('ICS Download', { zielgruppe })
              }}
              aria-label="Als Kalenderdatei laden"
            >
              <DownloadSimple size={19} weight="regular" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
      <div className="planner-actions">
        <button className={`button primary${copied ? ' copied' : ''}`} onClick={copy}>
          {copied && <Check size={18} weight="regular" aria-hidden="true" />}{' '}
          {copied ? 'In Zwischenablage kopiert' : 'Plan kopieren'}
        </button>
        <button className="button" onClick={share}>
          <ShareNetwork size={18} weight="regular" aria-hidden="true" /> Link teilen
        </button>
      </div>
      {dst && (
        <p className="dst-note">
          Nächste Zeitumstellung: {dst.region.city} ·{' '}
          {dst.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </section>
  )
}
