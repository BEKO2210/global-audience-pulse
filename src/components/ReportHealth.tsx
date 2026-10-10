/* eslint-disable react-refresh/only-export-components -- thresholds are exported for unit tests */
import { useEffect, useState } from 'react'
import { DATA_SOURCES } from '../config/model'
import './ReportHealth.css'

type Outcome = 'published' | 'skipped-gpu' | 'failed'
type Status = 'active' | 'delayed' | 'paused'

interface HealthRun {
  startedAt: string
  endedAt: string
  outcome: Outcome
  source: 'llm' | 'template' | null
}

interface HealthPayload {
  updatedAt: string
  runs: HealthRun[]
  summary24h: {
    runs: number
    published: number
    successRatePercent: number
    templateSharePercent: number
    skipped: number
    failed: number
    averageDurationSeconds: number
    rejections: { zahlen: number; form: number; pruefer: number }
    lastSuccess: string | null
    nextExpectedAt: string
  }
}

export const ACTIVE_MAX_MINUTES = 90
export const DELAYED_MAX_MINUTES = 180

export function reportStatus(lastSuccess: string | null, now = Date.now()): Status {
  if (!lastSuccess) return 'paused'
  const minutes = Math.max(0, (now - Date.parse(lastSuccess)) / 60_000)
  if (minutes < ACTIVE_MAX_MINUTES) return 'active'
  if (minutes < DELAYED_MAX_MINUTES) return 'delayed'
  return 'paused'
}

const statusLabels: Record<Status, string> = {
  active: 'Aktiv',
  delayed: 'Verzögert',
  paused: 'Pausiert',
}

const outcomeLabels: Record<Outcome, string> = {
  published: 'veröffentlicht',
  'skipped-gpu': 'GPU belegt',
  failed: 'fehlgeschlagen',
}

/** "12 Min", "3 Std 5 Min", "4 Tagen" — readable at any age. */
function humanAgo(minutes: number) {
  if (minutes < 60) return `${minutes} Min`
  if (minutes < 48 * 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h} Std ${m} Min` : `${h} Std`
  }
  return `${Math.floor(minutes / 1440)} Tagen`
}

function minutesAgo(value: string, now: number) {
  return Math.max(0, Math.round((now - Date.parse(value)) / 60_000))
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

function isHealthPayload(value: unknown): value is HealthPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<HealthPayload>
  return Array.isArray(candidate.runs) && Boolean(candidate.summary24h?.rejections)
}

export default function ReportHealth() {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${DATA_SOURCES.analysisHealth}?t=${Math.floor(Date.now() / 600_000)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: unknown) => {
        if (isHealthPayload(value)) setHealth(value)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  if (!health) return null

  const summary = health.summary24h
  const status = reportStatus(summary.lastSuccess, now)
  const timeline = health.runs.slice(-24)
  const rejectionEntries = [
    ['Zahlen', summary.rejections.zahlen],
    ['Form', summary.rejections.form],
    ['Prüfer', summary.rejections.pruefer],
  ] as const
  const mostRejections = Math.max(1, ...rejectionEntries.map(([, value]) => value))
  const timelineText = timeline
    .map((run) => `${outcomeLabels[run.outcome]}${run.source === 'template' ? ' (Vorlage)' : ''}`)
    .join(', ')

  return (
    <section className="report-health" aria-labelledby="report-health-title">
      <header className="report-health-head">
        <div>
          <p className="eyebrow">Betrieb der Analyse</p>
          <h3 id="report-health-title">KI-Systemstatus</h3>
        </div>
        <span className={`health-status is-${status}`}>
          <i aria-hidden="true" /> {statusLabels[status]}
        </span>
      </header>

      <p className="health-freshness">
        {summary.lastSuccess
          ? `Letzter Bericht vor ${humanAgo(minutesAgo(summary.lastSuccess, now))}`
          : 'Noch kein erfolgreicher Bericht'}
      </p>

      <div className="health-metrics">
        <div className="health-success">
          <div className="health-label-row">
            <span>Erfolgsquote 24 h</span>
            <strong>{summary.successRatePercent} %</strong>
          </div>
          <div
            className="health-track"
            role="progressbar"
            aria-label="Erfolgsquote der letzten 24 Stunden"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.successRatePercent}
          >
            <span style={{ width: `${Math.min(100, summary.successRatePercent)}%` }} />
          </div>
          <small>
            {summary.published} von {summary.runs} Läufen veröffentlicht · {summary.skipped}{' '}
            übersprungen · {summary.failed} fehlgeschlagen
          </small>
        </div>
        <dl>
          <div>
            <dt>Vorlagen-Anteil</dt>
            <dd>{summary.templateSharePercent} %</dd>
          </div>
          <div>
            <dt>Mittlere Dauer</dt>
            <dd>{formatDuration(summary.averageDurationSeconds)}</dd>
          </div>
        </dl>
      </div>

      <div className="health-rejections">
        <h4>Ablehnungen 24 h</h4>
        {rejectionEntries.map(([label, value]) => (
          <div className="health-rejection" key={label}>
            <span>{label}</span>
            <div className="health-rejection-track" aria-hidden="true">
              <i style={{ width: `${(value / mostRejections) * 100}%` }} />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="health-timeline">
        <div className="health-label-row">
          <h4>Letzte {timeline.length} Läufe</h4>
          <span>
            Nächster Lauf{' '}
            {new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(
              new Date(summary.nextExpectedAt),
            )}
          </span>
        </div>
        <div className="health-timeline-boxes" aria-hidden="true">
          {timeline.map((run, index) => (
            <i
              className={`is-${run.outcome}`}
              key={`${run.startedAt}-${index}`}
              title={outcomeLabels[run.outcome]}
            />
          ))}
        </div>
        <p className="sr-only">Laufhistorie, ältester zuerst: {timelineText}</p>
        <div className="health-legend" aria-label="Legende">
          {Object.entries(outcomeLabels).map(([outcome, label]) => (
            <span key={outcome}>
              <i className={`is-${outcome}`} aria-hidden="true" /> {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
