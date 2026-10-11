import { useEffect, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DATA_SOURCES } from '../config/model'
import { formatDuration, humanAgo, minutesAgo } from '../lib/ago'
import {
  STATIONS,
  isHealthPayload,
  logLines,
  oneDecimal,
  reportStatus,
  runCells,
  runSeconds,
  stationStats,
  type Cell,
  type HealthPayload,
  type Station,
} from '../lib/pipeline'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import './AiPipeline.css'

const DE = {
  status: { active: 'Aktiv', delayed: 'Verzögert', paused: 'Pausiert' },
  station: {
    daten: 'Daten',
    schreiber: 'Schreiber',
    zahlen: 'Zahlenprüfung',
    pruefer: 'Prüfer',
    ergebnis: 'Ergebnis',
  } as Record<Station, string>,
  cell: {
    ok: 'bestanden',
    retry: 'abgelehnt, neu geschrieben',
    warn: 'eingeschränkt',
    skip: 'GPU belegt',
    fail: 'fehlgeschlagen',
    template: 'Vorlage statt KI-Text',
  } as Record<Cell, string>,
  outcome: {
    published: 'veröffentlicht',
    template: 'Vorlage',
    'skipped-gpu': 'übersprungen',
    failed: 'fehlgeschlagen',
  } as Record<string, string>,
  dataDetail: 'Weltbank · Wikimedia',
  liveSignals: (n: number | string) => `${n} Live-Signale`,
  fetchErrors: (n: number) => `${n} Abruffehler`,
  noFetchErrors: 'ohne Abruffehler',
  drafts: (n: number) => `${n} Entwürfe`,
  numberDetail: 'jede Zahl gegen die Daten',
  rejected: (n: number) => `${n} abgelehnt`,
  ruleBased: 'regelbasiert',
  resultDetail: 'Lagebericht auf der Seite',
  published: (n: number) => `${n} veröffentlicht`,
  templates: (n: number) => `${n}× Vorlage`,
  onlyAi: 'nur KI-Texte',
  eyebrow: 'Lokale KI-Pipeline',
  title: 'So entsteht der Lagebericht',
  lastReport: (ago: string) => `Letzter Bericht vor ${ago}`,
  noReport: 'Noch kein erfolgreicher Bericht',
  nextRun: (time: string) => `Nächster Lauf ${time}`,
  schedule: 'Stündlich, solange der Rechner des Betreibers läuft',
  kpisLabel: 'Kennzahlen der letzten 24 Stunden',
  kpiRuns: 'Läufe 24 h',
  kpiPublished: 'veröffentlicht',
  kpiAiShare: 'KI-Text statt Vorlage',
  kpiDuration: 'Ø Dauer je Lauf',
  kpiRejections: 'Ablehnungen',
  kpiRetries: 'Läufe mit Neuversuch',
  flowLabel: 'Stationen der Pipeline, letzte 24 Stunden',
  loop: (retries: number, runs: number) =>
    `Bei Ablehnung schreibt das Modell neu (höchstens 3 Versuche, danach Vorlage): ${retries} von ${runs} Läufen in 24 h`,
  matrixCaption: 'Jeder Lauf, Station für Station',
  matrixLabel: (runs: number, published: number, retries: number, skipped: number) =>
    `Letzte ${runs} Läufe: ${published} veröffentlicht, ${retries} mit Neuversuch, ${skipped} übersprungen.`,
  computeCaption: 'Rechenzeit je Lauf (Sekunden, alle Versuche)',
  computeLabel: (writer: string, checker: string) =>
    `Schreiber im Mittel ${writer} je Entwurf, Prüfer ${checker} je Prüfung.`,
  writer: 'Schreiber',
  checker: 'Prüfer',
  log: 'Lauf-Log',
  avg: 'Ø',
}
const EN: typeof DE = {
  status: { active: 'Active', delayed: 'Delayed', paused: 'Paused' },
  station: {
    daten: 'Data',
    schreiber: 'Writer',
    zahlen: 'Number check',
    pruefer: 'Checker',
    ergebnis: 'Result',
  },
  cell: {
    ok: 'passed',
    retry: 'rejected, rewritten',
    warn: 'limited',
    skip: 'GPU busy',
    fail: 'failed',
    template: 'template instead of AI text',
  },
  outcome: {
    published: 'published',
    template: 'template',
    'skipped-gpu': 'skipped',
    failed: 'failed',
  },
  dataDetail: 'World Bank · Wikimedia',
  liveSignals: (n) => `${n} live signals`,
  fetchErrors: (n) => `${n} fetch ${n === 1 ? 'error' : 'errors'}`,
  noFetchErrors: 'no fetch errors',
  drafts: (n) => `${n} ${n === 1 ? 'draft' : 'drafts'}`,
  numberDetail: 'every number checked against the data',
  rejected: (n) => `${n} rejected`,
  ruleBased: 'rule-based',
  resultDetail: 'Briefing on the page',
  published: (n) => `${n} published`,
  templates: (n) => `${n}× template`,
  onlyAi: 'AI texts only',
  eyebrow: 'Local AI pipeline',
  title: 'How the briefing is made',
  lastReport: (ago) => `Last report ${ago} ago`,
  noReport: 'No successful report yet',
  nextRun: (time) => `Next run ${time}`,
  schedule: 'Hourly while the operator’s computer is on',
  kpisLabel: 'Key figures for the last 24 hours',
  kpiRuns: 'runs 24 h',
  kpiPublished: 'published',
  kpiAiShare: 'AI text instead of template',
  kpiDuration: 'avg. duration per run',
  kpiRejections: 'rejections',
  kpiRetries: 'runs with a retry',
  flowLabel: 'Pipeline stations, last 24 hours',
  loop: (retries, runs) =>
    `If rejected, the model rewrites (at most 3 attempts, then a template): ${retries} of ${runs} runs in 24 h`,
  matrixCaption: 'Every run, station by station',
  matrixLabel: (runs, published, retries, skipped) =>
    `Last ${runs} runs: ${published} published, ${retries} with a retry, ${skipped} skipped.`,
  computeCaption: 'Compute time per run (seconds, all attempts)',
  computeLabel: (writer, checker) =>
    `Writer averages ${writer} per draft, checker ${checker} per check.`,
  writer: 'Writer',
  checker: 'Checker',
  log: 'Run log',
  avg: 'avg.',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

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
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const sec = (value: number | null) => (value == null ? '–' : `${oneDecimal(value, locale)} s`)

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
  const lines = logLines(runs, zone, 6, locale)
  const llmShare = summary.published
    ? Math.round(((summary.published - stats.templates) / summary.published) * 100)
    : 0
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(intl, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: zone,
    })
  const lastCells = last ? runCells(last) : null

  const nodes: { id: Station; title: string; detail: string; metric: string; sub: string }[] = [
    {
      id: 'daten',
      title: t.station.daten,
      detail: t.dataDetail,
      metric: t.liveSignals(stats.liveSignals ?? '–'),
      sub: stats.fetchErrors ? t.fetchErrors(stats.fetchErrors) : t.noFetchErrors,
    },
    {
      id: 'schreiber',
      title: t.station.schreiber,
      detail: shortModel(last?.models?.writer),
      metric: `${t.avg} ${sec(stats.writerSeconds)}`,
      sub: t.drafts(stats.writerCalls),
    },
    {
      id: 'zahlen',
      title: t.station.zahlen,
      detail: t.numberDetail,
      metric: t.rejected(stats.numberRejections),
      sub: t.ruleBased,
    },
    {
      id: 'pruefer',
      title: t.station.pruefer,
      detail: shortModel(last?.models?.checker),
      metric: t.rejected(stats.checkerRejections),
      sub: `${t.avg} ${sec(stats.checkerSeconds)}`,
    },
    {
      id: 'ergebnis',
      title: t.station.ergebnis,
      detail: t.resultDetail,
      metric: t.published(summary.published),
      sub: stats.templates ? t.templates(stats.templates) : t.onlyAi,
    },
  ]

  return (
    <section className={`panel ai-pipeline is-${status}`} aria-labelledby="ai-pipeline-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="ai-pipeline-title">{t.title}</h2>
        </div>
        <span className={`aip-status is-${status}`}>
          <i aria-hidden="true" />
          {t.status[status]}
        </span>
      </div>
      <p className="aip-fresh">
        <span>
          {summary.lastSuccess
            ? t.lastReport(humanAgo(minutesAgo(summary.lastSuccess, now), locale))
            : t.noReport}{' '}
          · {t.nextRun(time(summary.nextExpectedAt))}
        </span>
        <span>{t.schedule}</span>
      </p>

      <ul className="aip-kpis" aria-label={t.kpisLabel}>
        {[
          [`${summary.runs}`, t.kpiRuns],
          [`${summary.successRatePercent} %`, t.kpiPublished],
          [`${llmShare} %`, t.kpiAiShare],
          [formatDuration(summary.averageDurationSeconds, locale), t.kpiDuration],
          [`${stats.checkerRejections + stats.numberRejections}`, t.kpiRejections],
          [`${stats.retries}`, t.kpiRetries],
        ].map(([value, label]) => (
          <li key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="aip-flow" role="list" aria-label={t.flowLabel}>
        {nodes.map((node, i) => (
          <div key={node.id} className="aip-flow-cell" role="listitem">
            <motion.div className={`aip-node is-${lastCells?.[node.id] ?? 'ok'}`}>
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
          <span aria-hidden="true">↺</span> {t.loop(stats.retries, runs.length)}
        </p>
      </div>

      <div className="aip-grid">
        <figure className="aip-matrix">
          <figcaption>{t.matrixCaption}</figcaption>
          <div
            className="aip-matrix-body"
            style={{ '--runs': runs.length } as CSSProperties}
            role="img"
            aria-label={t.matrixLabel(runs.length, stats.published, stats.retries, summary.skipped)}
          >
            {STATIONS.map((station) => (
              <div key={station} className="aip-matrix-row">
                <span className="aip-matrix-label">{t.station[station]}</span>
                {cells.map((c, i) => (
                  <i
                    key={runs[i]!.startedAt}
                    className={`is-${c[station]}`}
                    title={`${time(runs[i]!.startedAt)} · ${t.station[station]}: ${t.cell[c[station]]}`}
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
                {t.cell[c]}
              </li>
            ))}
          </ul>
        </figure>

        <figure className="aip-compute">
          <figcaption>{t.computeCaption}</figcaption>
          <div
            className="aip-bars"
            role="img"
            aria-label={t.computeLabel(sec(stats.writerSeconds), sec(stats.checkerSeconds))}
          >
            {seconds.map((s, i) => (
              <span
                key={runs[i]!.startedAt}
                className="aip-bar"
                title={`${time(runs[i]!.startedAt)} — ${t.writer} ${sec(s.writer)}, ${t.checker} ${sec(s.checker)}`}
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
              {t.writer}
            </li>
            <li>
              <i className="is-checker" aria-hidden="true" />
              {t.checker}
            </li>
          </ul>
        </figure>
      </div>

      <figure className="aip-log">
        <figcaption>{t.log}</figcaption>
        <ol>
          {lines.map((line, i) => (
            <li key={`${line.time}-${i}`}>
              <time>{line.time}</time>
              <span className="aip-log-body">
                <span className={`aip-log-outcome is-${line.outcome}`}>
                  {t.outcome[line.outcome] ?? line.outcome}
                </span>
                <span className="aip-log-steps">{line.steps.split(' · ').join(', ')}</span>
                {line.note && <span className="aip-log-note">{line.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </figure>
    </section>
  )
}
