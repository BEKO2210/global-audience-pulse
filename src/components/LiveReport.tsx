import { useEffect, useState } from 'react'
import { formatTime, relativeTime, timeZoneName } from '../lib/time'
import { AudienceGrid } from './report/AudienceGrid'
import { ContributionBar } from './report/ContributionBar'
import { LiveSignals } from './report/LiveSignals'
import { MemoryBadges } from './report/MemoryBadges'
import { HolidayChips } from './report/HolidayChips'
import { TrendChart } from './report/TrendChart'
import type { LiveAnalysisPayload } from './report/types'
import './LiveReport.css'

import { AI_MARK, GermanReportNote, HIDE_HOURS, STALE_HOURS } from './reportShared'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'

const DE = {
  report: 'Lagebericht',
  aiAnalysis: 'Automatische AI-Analyse',
  pausedSince: 'Pausiert seit ',
  asOf: 'Stand ',
  readAll: 'Ganze Analyse lesen',
  noteLlm: (ago: string) =>
    `Automatische AI-Analyse aus den Zahlen dieser Seite, vor ${ago}, ohne menschliche Prüfung. Jede Zahl wird automatisch gegen die Daten geprüft; Einschätzungen können trotzdem danebenliegen.`,
  noteTemplate: 'Automatisch aus den Zahlen dieser Seite zusammengestellt (Vorlage, ohne KI).',
  noteStale: ' Neue Berichte erscheinen stündlich, sobald der Rechner des Betreibers wieder läuft.',
}
const EN: typeof DE = {
  report: 'Briefing',
  aiAnalysis: 'Automated AI analysis',
  pausedSince: 'Paused since ',
  asOf: 'As of ',
  readAll: 'Read the full analysis',
  noteLlm: (ago) =>
    `Automated AI analysis of the figures on this page, ${ago} ago, without human review. Every number is checked against the data automatically; assessments can still be off.`,
  noteTemplate: 'Compiled automatically from the figures on this page (template, no AI).',
  noteStale: ' New reports appear hourly once the operator’s computer is running again.',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

export default function LiveReport({ now, data }: { now: Date; data: LiveAnalysisPayload | null }) {
  const [entered, setEntered] = useState(false)
  const t = useMessages(M)
  const { locale, intl } = useLocale()

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
          {t.report}
          {data.source === 'llm' && <span className="ai-badge">{t.aiAnalysis}</span>}
        </p>
        <span className="live-report-time">
          {stale ? t.pausedSince : t.asOf}
          {formatTime(generated, zone)} {timeZoneName(generated, zone, intl)}
        </span>
      </div>
      <GermanReportNote />

      <div className="lr-intro">
        <h2 id="live-report-title" lang="de">
          {report.schlagzeile}
        </h2>
        <p className="live-report-verdict" lang="de">
          {report.empfehlung}
        </p>
        {facts ? <MemoryBadges facts={facts} /> : null}
        {facts ? <HolidayChips facts={facts} /> : null}
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
              <summary>{t.readAll}</summary>
              <p className="live-report-body" lang="de">
                {report.analyse}
              </p>
              <ul lang="de">
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
          <p className="live-report-body" lang="de">
            {report.analyse}
          </p>
          <ul lang="de">
            {report.punkte.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </>
      )}

      <p className="live-report-note">
        {data.source === 'llm' ? t.noteLlm(relativeTime(now, generated, locale)) : t.noteTemplate}
        {stale && t.noteStale}
      </p>
    </section>
  )
}
