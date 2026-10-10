import { useEffect, useState } from 'react'
import { DATA_SOURCES } from '../config/model'
import { formatTime, relativeTime, timeZoneName } from '../lib/time'
import { AudienceGrid } from './report/AudienceGrid'
import { ContributionBar } from './report/ContributionBar'
import { LiveSignals } from './report/LiveSignals'
import { MemoryBadges } from './report/MemoryBadges'
import { TrendChart } from './report/TrendChart'
import type { LiveAnalysisPayload } from './report/types'
import './LiveReport.css'

/**
 * EU AI Act Art. 50(2) machine-readable marking of AI-generated text (IPTC digital source type, the
 * vocabulary C2PA uses); Art. 50(4)/(5) visible disclosure is the "Automatische AI-Analyse" label.
 */
const AI_MARK = {
  'data-ai-generated': 'true',
  'data-digital-source-type':
    'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
} as const

/** Reports older than this are shown as paused (the operator's PC is off); older than a day: hidden. */
const STALE_HOURS = 3
const HIDE_HOURS = 24

/** Fetches the hourly report once and every 10 minutes; shared by the hero teaser and the full report. */
export function useLiveReport() {
  const [data, setData] = useState<LiveAnalysisPayload | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch(`${DATA_SOURCES.liveAnalysis}?t=${Math.floor(Date.now() / 600_000)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((json: LiveAnalysisPayload | null) => {
          if (!cancelled && json?.report?.schlagzeile) setData(json)
        })
        .catch(() => undefined)
    load()
    const id = window.setInterval(load, 10 * 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])
  return data
}

/** One reserved line in the hero: never shifts the layout while the report loads. */
export function ReportTeaser({ data, now }: { data: LiveAnalysisPayload | null; now: Date }) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const generated = data ? new Date(data.generatedAt) : null
  const fresh = generated && (now.getTime() - generated.getTime()) / 3_600_000 <= HIDE_HOURS
  if (!fresh || !data || !generated)
    return <div className="report-teaser is-empty" aria-hidden="true" />
  const ai = data.source === 'llm'
  return (
    <a className="report-teaser" href="#lagebericht" {...(ai ? AI_MARK : {})}>
      <span className="report-teaser-label">
        {ai ? 'Automatische AI-Analyse' : 'Lagebericht'} · {formatTime(generated, zone)}
      </span>
      <span className="report-teaser-text">{data.report.schlagzeile}</span>
    </a>
  )
}

export function LiveReport({ now, data }: { now: Date; data: LiveAnalysisPayload | null }) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!data) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [data])

  if (!data) return null
  const generated = new Date(data.generatedAt)
  const ageHours = (now.getTime() - generated.getTime()) / 3_600_000
  if (ageHours > HIDE_HOURS) return null
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const stale = ageHours > STALE_HOURS
  const { report, facts } = data
  const hasVisuals = Boolean(
    facts?.regionen?.length ||
    facts?.trendNaechsteStunden?.length ||
    facts?.liveSignale?.length ||
    facts?.zielgruppen?.length,
  )

  return (
    <section
      id="lagebericht"
      className={`live-report lr-root${stale ? ' is-stale' : ''}${entered ? ' is-entered' : ''}`}
      aria-labelledby="live-report-title"
      {...(data.source === 'llm' ? AI_MARK : {})}
    >
      <div className="live-report-head">
        <p className="eyebrow">
          Lagebericht
          {data.source === 'llm' && <span className="ai-badge">Automatische AI-Analyse</span>}
        </p>
        <span className="live-report-time">
          {stale ? 'Pausiert seit ' : 'Stand '}
          {formatTime(generated, zone)} {timeZoneName(generated, zone)}
        </span>
      </div>

      <div className="lr-intro">
        <h2 id="live-report-title">{report.schlagzeile}</h2>
        <p className="live-report-verdict">{report.empfehlung}</p>
        {facts ? <MemoryBadges facts={facts} /> : null}
      </div>

      {hasVisuals && facts ? (
        <div className="lr-layout">
          <div className="lr-text-col">
            <details className="lr-details">
              <summary>Ganze Analyse lesen</summary>
              <p className="live-report-body">{report.analyse}</p>
              <ul>
                {report.punkte.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </details>
          </div>
          <div className="lr-visual-col">
            <ContributionBar facts={facts} />
            <TrendChart facts={facts} />
            <LiveSignals facts={facts} />
            <AudienceGrid facts={facts} report={report} />
          </div>
        </div>
      ) : (
        <>
          <p className="live-report-body">{report.analyse}</p>
          <ul>
            {report.punkte.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </>
      )}

      <p className="live-report-note">
        {data.source === 'llm'
          ? `Automatische AI-Analyse aus den Zahlen dieser Seite, vor ${relativeTime(now, generated)}, ohne menschliche Prüfung. Jede Zahl wird automatisch gegen die Daten geprüft; Einschätzungen können trotzdem danebenliegen.`
          : 'Automatisch aus den Zahlen dieser Seite zusammengestellt (Vorlage, ohne KI).'}
        {stale &&
          ' Neue Berichte erscheinen stündlich, sobald der Rechner des Betreibers wieder läuft.'}
      </p>
    </section>
  )
}
