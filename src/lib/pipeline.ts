// Derivations for the AI pipeline view from health.json (written by scripts/analysis/health.ts after each run).

export type Outcome = 'published' | 'skipped-gpu' | 'failed'
export type Status = 'active' | 'delayed' | 'paused'
export type Station = 'daten' | 'schreiber' | 'zahlen' | 'pruefer' | 'ergebnis'
/** ok · retry = rejected at least once, then rewritten · warn · skip = GPU busy · fail · template = fallback text */
export type Cell = 'ok' | 'retry' | 'warn' | 'skip' | 'fail' | 'template'

export interface ModelCall {
  model: string
  role: 'writer' | 'checker'
  attempt: number
  durationMs: number
  ok: boolean
}

export interface HealthRun {
  startedAt: string
  endedAt: string
  outcome: Outcome
  source: 'llm' | 'template' | null
  attempts?: number
  durationSeconds?: number
  rejections?: { attempt: number; category: 'zahlen' | 'form' | 'pruefer'; reason: string }[]
  models?: { writer: string; checker: string }
  modelCalls?: ModelCall[]
  liveSignals?: number
  dataFetchErrors?: string[]
}

export interface HealthPayload {
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

export function isHealthPayload(value: unknown): value is HealthPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<HealthPayload>
  return Array.isArray(candidate.runs) && Boolean(candidate.summary24h?.rejections)
}

export const STATIONS: readonly Station[] = ['daten', 'schreiber', 'zahlen', 'pruefer', 'ergebnis']

/** What happened at each station in one run. */
export function runCells(run: HealthRun): Record<Station, Cell> {
  if (run.outcome === 'skipped-gpu')
    return { daten: 'skip', schreiber: 'skip', zahlen: 'skip', pruefer: 'skip', ergebnis: 'skip' }
  const calls = run.modelCalls ?? []
  const rejections = run.rejections ?? []
  const wrote = calls.some((c) => c.role === 'writer' && c.ok)
  const checkerDown = calls.some((c) => c.role === 'checker' && !c.ok)
  return {
    daten: run.dataFetchErrors?.length ? 'warn' : 'ok',
    schreiber: wrote ? 'ok' : 'fail',
    zahlen: !wrote
      ? 'fail'
      : rejections.some((r) => r.category === 'zahlen' || r.category === 'form')
        ? 'retry'
        : 'ok',
    pruefer: !wrote
      ? 'fail'
      : checkerDown
        ? 'warn'
        : rejections.some((r) => r.category === 'pruefer')
          ? 'retry'
          : 'ok',
    ergebnis: run.outcome === 'failed' ? 'fail' : run.source === 'template' ? 'template' : 'ok',
  }
}

const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null

/** Per-station numbers for the pipeline nodes over the given runs. */
export function stationStats(runs: readonly HealthRun[]) {
  const calls = runs.flatMap((r) => r.modelCalls ?? [])
  const rejections = runs.flatMap((r) => r.rejections ?? [])
  const ran = runs.filter((r) => r.outcome !== 'skipped-gpu')
  return {
    liveSignals: runs.at(-1)?.liveSignals ?? null,
    fetchErrors: ran.filter((r) => r.dataFetchErrors?.length).length,
    writerCalls: calls.filter((c) => c.role === 'writer').length,
    writerSeconds: avg(calls.filter((c) => c.role === 'writer').map((c) => c.durationMs / 1000)),
    numberRejections: rejections.filter((r) => r.category === 'zahlen' || r.category === 'form')
      .length,
    checkerCalls: calls.filter((c) => c.role === 'checker').length,
    checkerSeconds: avg(calls.filter((c) => c.role === 'checker').map((c) => c.durationMs / 1000)),
    checkerRejections: rejections.filter((r) => r.category === 'pruefer').length,
    published: runs.filter((r) => r.outcome === 'published').length,
    templates: runs.filter((r) => r.source === 'template').length,
    retries: runs.filter((r) => (r.attempts ?? 1) > 1).length,
  }
}

/** Writer and checker seconds per run (summed over attempts), for the compute bars. */
export function runSeconds(run: HealthRun) {
  const sum = (role: ModelCall['role']) =>
    (run.modelCalls ?? []).filter((c) => c.role === role).reduce((a, c) => a + c.durationMs, 0) /
    1000
  return { writer: sum('writer'), checker: sum('checker') }
}

/** One log line per run, newest first: time, steps, outcome, first rejection reason. */
export function logLines(runs: readonly HealthRun[], timeZone: string, max = 6) {
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone })
  return [...runs]
    .reverse()
    .slice(0, max)
    .map((run) => {
      if (run.outcome === 'skipped-gpu')
        return {
          time: time(run.startedAt),
          steps: 'GPU belegt – Stunde übersprungen',
          outcome: run.outcome,
          note: '',
        }
      const s = runSeconds(run)
      const attempts = run.attempts ?? 1
      const steps = [
        `Schreiber ${s.writer.toFixed(1).replace('.', ',')} s`,
        `Prüfer ${s.checker.toFixed(1).replace('.', ',')} s`,
        attempts > 1 ? `${attempts} Versuche` : '1 Versuch',
      ].join(' · ')
      const first = run.rejections?.[0]
      const note = first
        ? `V${first.attempt} abgelehnt (${first.category === 'pruefer' ? 'Prüfer' : first.category === 'zahlen' ? 'Zahlen' : 'Form'})`
        : ''
      return {
        time: time(run.endedAt),
        steps,
        outcome:
          run.outcome === 'published' && run.source === 'template' ? 'template' : run.outcome,
        note,
      }
    })
}
