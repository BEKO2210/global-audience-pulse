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

/** Reports older than this are shown as paused (the operator's PC is off); older than a day: hidden. */
const STALE_HOURS = 3
const HIDE_HOURS = 24

export function LiveReport({ now }: { now: Date }) {
  const [data, setData] = useState<LiveAnalysisPayload | null>(null)
  const [entered, setEntered] = useState(false)

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
      className={`live-report lr-root${stale ? ' is-stale' : ''}${entered ? ' is-entered' : ''}`}
      aria-labelledby="live-report-title"
    >
      <div className="live-report-head">
        <p className="eyebrow">Lagebericht</p>
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
          ? `Automatisch geschrieben von einem lokalen KI-Modell (${data.model}) aus den Zahlen dieser Seite, vor ${relativeTime(now, generated)}. Jede Zahl im Text wird gegen die Daten geprüft; Einschätzungen können trotzdem danebenliegen.`
          : 'Automatisch aus den Zahlen dieser Seite zusammengestellt (Vorlage, ohne KI).'}
        {stale &&
          ' Neue Berichte erscheinen stündlich, sobald der Rechner des Betreibers wieder läuft.'}
      </p>
    </section>
  )
}
