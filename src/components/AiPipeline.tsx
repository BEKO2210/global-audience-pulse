import { useEffect, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DATA_SOURCES } from '../config/model'
import { formatDuration, humanAgo, minutesAgo } from '../lib/ago'
import {
  STATIONS,
  isHealthPayload,
  logLines,
  reportStatus,
  runCells,
  runSeconds,
  stationStats,
  type Cell,
  type HealthPayload,
  type Station,
} from '../lib/pipeline'
import './AiPipeline.css'

const STATUS_LABEL = { active: 'Aktiv', delayed: 'Verzögert', paused: 'Pausiert' } as const
const STATION_LABEL: Record<Station, string> = {
  daten: 'Daten',
  schreiber: 'Schreiber',
  zahlen: 'Zahlenprüfung',
  pruefer: 'Prüfer',
  ergebnis: 'Ergebnis',
}
const CELL_LABEL: Record<Cell, string> = {
  ok: 'bestanden',
  retry: 'abgelehnt, neu geschrieben',
  warn: 'eingeschränkt',
  skip: 'GPU belegt',
  fail: 'fehlgeschlagen',
  template: 'Vorlage statt KI-Text',
}
const OUTCOME_LABEL: Record<string, string> = {
  published: 'veröffentlicht',
  template: 'Vorlage',
  'skipped-gpu': 'übersprungen',
  failed: 'fehlgeschlagen',
}
const sec = (value: number | null) =>
  value == null ? '–' : `${value.toFixed(1).replace('.', ',')} s`
const shortModel = (model?: string) => model?.split(':')[0] ?? '–'

/**
 * How the hourly report is made, from the job's own telemetry (health.json): the five stations with their
 * 24 h numbers, every run as a station matrix, compute time per run and the run log. Nothing here is mocked;
 * the flow tokens only move while the job is active.
 */
export default function AiPipeline() {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [now] = useState(() => Date.now())
  const reduce = useReducedMotion()

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${DATA_SOURCES.analysisHealth}?t=${Math.floor(Date.now() / 600_000)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((value: unknown) => {
        if (isHealthPayload(value)) setHealth(value)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  if (!health) return null

  const summary = health.summary24h
  const runs = health.runs.slice(-24)
  const last = runs.at(-1)
  const status = reportStatus(summary.lastSuccess, now)
  const stats = stationStats(runs)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const cells = runs.map(runCells)
  const seconds = runs.map(runSeconds)
  const maxSeconds = Math.max(1, ...seconds.map((s) => s.writer + s.checker))
  const lines = logLines(runs, zone)
  const llmShare = summary.published
    ? Math.round(((summary.published - stats.templates) / summary.published) * 100)
    : 0
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: zone,
    })
  const lastCells = last ? runCells(last) : null

  const nodes: { id: Station; title: string; detail: string; metric: string; sub: string }[] = [
    {
      id: 'daten',
      title: 'Daten',
      detail: 'Weltbank · Wikimedia',
      metric: `${stats.liveSignals ?? '–'} Live-Signale`,
      sub: stats.fetchErrors ? `${stats.fetchErrors} Abruffehler` : 'ohne Abruffehler',
    },
    {
      id: 'schreiber',
      title: 'Schreiber',
      detail: shortModel(last?.models?.writer),
      metric: `Ø ${sec(stats.writerSeconds)}`,
      sub: `${stats.writerCalls} Entwürfe`,
    },
    {
      id: 'zahlen',
      title: 'Zahlenprüfung',
      detail: 'jede Zahl gegen die Daten',
      metric: `${stats.numberRejections} abgelehnt`,
      sub: 'regelbasiert',
    },
    {
      id: 'pruefer',
      title: 'Prüfer',
      detail: shortModel(last?.models?.checker),
      metric: `${stats.checkerRejections} abgelehnt`,
      sub: `Ø ${sec(stats.checkerSeconds)}`,
    },
    {
      id: 'ergebnis',
      title: 'Ergebnis',
      detail: 'Lagebericht auf der Seite',
      metric: `${summary.published} veröffentlicht`,
      sub: stats.templates ? `${stats.templates}× Vorlage` : 'nur KI-Texte',
    },
  ]

  return (
    <section className={`panel ai-pipeline is-${status}`} aria-labelledby="ai-pipeline-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">KI-Pipeline · lokal</p>
          <h2 id="ai-pipeline-title">So entsteht der Lagebericht</h2>
        </div>
        <span className={`aip-status is-${status}`}>
          <i aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="aip-fresh">
        {summary.lastSuccess
          ? `Letzter Bericht vor ${humanAgo(minutesAgo(summary.lastSuccess, now))}`
          : 'Noch kein erfolgreicher Bericht'}{' '}
        · nächster Lauf {time(summary.nextExpectedAt)} · stündlich, solange der Rechner des
        Betreibers läuft
      </p>

      <ul className="aip-kpis" aria-label="Kennzahlen der letzten 24 Stunden">
        {[
          [`${summary.runs}`, 'Läufe 24 h'],
          [`${summary.successRatePercent} %`, 'veröffentlicht'],
          [`${llmShare} %`, 'KI-Text statt Vorlage'],
          [formatDuration(summary.averageDurationSeconds), 'Ø Dauer je Lauf'],
          [`${stats.checkerRejections + stats.numberRejections}`, 'Ablehnungen'],
          [`${stats.retries}`, 'Läufe mit Neuversuch'],
        ].map(([value, label]) => (
          <li key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="aip-flow" role="list" aria-label="Stationen der Pipeline, letzte 24 Stunden">
        {nodes.map((node, i) => (
          <div key={node.id} className="aip-flow-cell" role="listitem">
            <motion.div
              className={`aip-node is-${lastCells?.[node.id] ?? 'ok'}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.48, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.06 }}
            >
              <span className="aip-node-name">
                <span className="aip-step">{String(i + 1).padStart(2, '0')}</span>
                <strong>{node.title}</strong>
                <span className="aip-detail">{node.detail}</span>
              </span>
              <span className="aip-node-value">
                <span className="aip-metric">{node.metric}</span>
                <span className="aip-sub">{node.sub}</span>
              </span>
            </motion.div>
            {i < nodes.length - 1 && (
              <span className="aip-link" aria-hidden="true">
                {status === 'active' && !reduce && (
                  <i style={{ '--delay': `${i * 0.6}s` } as CSSProperties} />
                )}
              </span>
            )}
          </div>
        ))}
        <p className="aip-loop">
          <span aria-hidden="true">↺</span> Bei Ablehnung schreibt das Modell neu (höchstens 3
          Versuche, danach Vorlage): {stats.retries} von {runs.length} Läufen in 24 h
        </p>
      </div>

      <div className="aip-grid">
        <figure className="aip-matrix">
          <figcaption>Jeder Lauf, Station für Station</figcaption>
          <div
            className="aip-matrix-body"
            style={{ '--runs': runs.length } as CSSProperties}
            role="img"
            aria-label={`Letzte ${runs.length} Läufe: ${stats.published} veröffentlicht, ${stats.retries} mit Neuversuch, ${summary.skipped} übersprungen.`}
          >
            {STATIONS.map((station) => (
              <div key={station} className="aip-matrix-row">
                <span className="aip-matrix-label">{STATION_LABEL[station]}</span>
                {cells.map((c, i) => (
                  <i
                    key={runs[i]!.startedAt}
                    className={`is-${c[station]}`}
                    title={`${time(runs[i]!.startedAt)} · ${STATION_LABEL[station]}: ${CELL_LABEL[c[station]]}`}
                  />
                ))}
              </div>
            ))}
            <div className="aip-matrix-row aip-matrix-axis" aria-hidden="true">
              <span />
              <span className="aip-axis-start">{runs[0] ? time(runs[0].startedAt) : ''}</span>
              <span className="aip-axis-end">{last ? time(last.startedAt) : ''}</span>
            </div>
          </div>
          <ul className="aip-legend">
            {(['ok', 'retry', 'template', 'skip', 'warn', 'fail'] as const).map((c) => (
              <li key={c}>
                <i className={`is-${c}`} aria-hidden="true" />
                {CELL_LABEL[c]}
              </li>
            ))}
          </ul>
        </figure>

        <figure className="aip-compute">
          <figcaption>Rechenzeit je Lauf (Sekunden, alle Versuche)</figcaption>
          <div
            className="aip-bars"
            role="img"
            aria-label={`Schreiber im Mittel ${sec(stats.writerSeconds)} je Entwurf, Prüfer ${sec(stats.checkerSeconds)} je Prüfung.`}
          >
            {seconds.map((s, i) => (
              <span
                key={runs[i]!.startedAt}
                className="aip-bar"
                title={`${time(runs[i]!.startedAt)} · Schreiber ${sec(s.writer)} · Prüfer ${sec(s.checker)}`}
              >
                <i
                  className="is-checker"
                  style={{ height: `${(s.checker / maxSeconds) * 100}%` }}
                />
                <i className="is-writer" style={{ height: `${(s.writer / maxSeconds) * 100}%` }} />
              </span>
            ))}
          </div>
          <div className="aip-bars-axis" aria-hidden="true">
            <span>{runs[0] ? time(runs[0].startedAt) : ''}</span>
            <span>max {Math.round(maxSeconds)} s</span>
            <span>{last ? time(last.startedAt) : ''}</span>
          </div>
          <ul className="aip-legend">
            <li>
              <i className="is-writer" aria-hidden="true" />
              Schreiber
            </li>
            <li>
              <i className="is-checker" aria-hidden="true" />
              Prüfer
            </li>
          </ul>
        </figure>
      </div>

      <figure className="aip-log">
        <figcaption>Lauf-Log</figcaption>
        <ol>
          {lines.map((line, i) => (
            <li key={`${line.time}-${i}`}>
              <time>{line.time}</time>
              <span className="aip-log-body">
                <span className={`aip-log-outcome is-${line.outcome}`}>
                  {OUTCOME_LABEL[line.outcome] ?? line.outcome}
                </span>
                <span className="aip-log-steps">{line.steps}</span>
                {line.note && <span className="aip-log-note">{line.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </figure>
    </section>
  )
}
