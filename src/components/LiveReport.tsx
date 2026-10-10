import { useEffect, useState } from 'react'
import { formatTime, relativeTime, timeZoneName } from '../lib/time'
import { AudienceGrid } from './report/AudienceGrid'
import { ContributionBar } from './report/ContributionBar'
import { LiveSignals } from './report/LiveSignals'
import { MemoryBadges } from './report/MemoryBadges'
import { TrendChart } from './report/TrendChart'
import type { LiveAnalysisPayload } from './report/types'
import './LiveReport.css'

import { AI_MARK, HIDE_HOURS, STALE_HOURS } from './reportShared'
import { track } from '../lib/analytics'

export default function LiveReport({ now, data }: { now: Date; data: LiveAnalysisPayload | null }) {
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
            <details
              className="lr-details"
              onToggle={(event) => {
                if (event.currentTarget.open) track('Bericht aufgeklappt')
              }}
            >
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
