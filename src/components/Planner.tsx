import { useState } from 'react'
import { Check, DownloadSimple, Fire, ShareNetwork } from '@phosphor-icons/react'
import { REGIONS, type RegionConfig, type RegionId } from '../config/regions'
import { phaseAt, type PostingWindow } from '../lib/model'
import { formatDateTime, formatTime, localDecimalHourFast, timeZoneName } from '../lib/time'
import { AnimatedNumber } from './AnimatedNumber'

function icsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}
function downloadIcs(window: PostingWindow) {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Global Audience Pulse//DE',
    'BEGIN:VEVENT',
    `UID:${window.start.getTime()}@global-audience-pulse`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(window.start)}`,
    `DTEND:${icsDate(window.end)}`,
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
    window.setTimeout(() => setCopied(false), 2_200)
  }
  const share = async () => {
    const data = { title: 'Mein Posting-Plan', text: plan, url: location.href }
    if (navigator.share) await navigator.share(data)
    else await copy()
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
      <div className="filter-row planner-tabs">
        <button onClick={() => setScope('today')} aria-pressed={scope === 'today'}>
          Heute ({windowSets.today.length})
        </button>
        <button onClick={() => setScope('tomorrow')} aria-pressed={scope === 'tomorrow'}>
          Morgen ({windowSets.tomorrow.length})
        </button>
        <button onClick={() => setScope('week')} aria-pressed={scope === 'week'}>
          7 Tage ({windowSets.week.length})
        </button>
      </div>
      <div className="planner-list">
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
                {selected
                  .map((id) => REGIONS.find((region) => region.id === id)!)
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
              onClick={() => downloadIcs(window)}
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
