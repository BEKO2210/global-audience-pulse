import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export type RunOutcome = 'published' | 'skipped-gpu' | 'failed'
export type RejectionCategory = 'zahlen' | 'form' | 'pruefer'

export interface RunRejection {
  attempt: number
  category: RejectionCategory
  reason: string
}

export interface ModelCall {
  model: string
  role: 'writer' | 'checker'
  attempt: number
  durationMs: number
  ok: boolean
}

export interface DataFetchError {
  source: 'snapshot' | 'wikimedia'
  message: string
}

export interface AnalysisRun {
  startedAt: string
  endedAt: string
  durationSeconds: number
  attempts: number
  rejections: RunRejection[]
  source: 'llm' | 'template'
  models: { writer: string; checker: string }
  modelCalls: ModelCall[]
  liveSignals: number
  dataFetchErrors: DataFetchError[]
}

export interface HealthRun extends Omit<AnalysisRun, 'source'> {
  outcome: RunOutcome
  source: AnalysisRun['source'] | null
}

export interface HealthSummary {
  runs: number
  published: number
  successRatePercent: number
  templateSharePercent: number
  skipped: number
  failed: number
  averageDurationSeconds: number
  rejections: Record<RejectionCategory, number>
  lastSuccess: string | null
  nextExpectedAt: string
}

export interface HealthFile {
  version: 1
  updatedAt: string
  runs: HealthRun[]
  summary24h: HealthSummary
}

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
const MAX_RUNS = 48

export function nextExpectedAt(now: Date) {
  const next = new Date(now)
  next.setUTCMinutes(0, 0, 0)
  next.setUTCHours(next.getUTCHours() + 1)
  next.setUTCMinutes(2)
  return next.toISOString()
}

export function summarizeRuns(runs: HealthRun[], now: Date): HealthSummary {
  const recent = runs.filter((run) => Date.parse(run.endedAt) >= now.getTime() - DAY_MS)
  const published = recent.filter((run) => run.outcome === 'published')
  const durationTotal = recent.reduce((sum, run) => sum + run.durationSeconds, 0)
  const rejectionCounts: Record<RejectionCategory, number> = { zahlen: 0, form: 0, pruefer: 0 }
  for (const run of recent) {
    for (const rejection of run.rejections) rejectionCounts[rejection.category] += 1
  }
  const lastSuccess = runs
    .filter((run) => run.outcome === 'published')
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0]?.endedAt

  return {
    runs: recent.length,
    published: published.length,
    successRatePercent: recent.length ? Math.round((published.length / recent.length) * 100) : 0,
    templateSharePercent: published.length
      ? Math.round(
          (published.filter((run) => run.source === 'template').length / published.length) * 100,
        )
      : 0,
    skipped: recent.filter((run) => run.outcome === 'skipped-gpu').length,
    failed: recent.filter((run) => run.outcome === 'failed').length,
    averageDurationSeconds: recent.length ? Math.round(durationTotal / recent.length) : 0,
    rejections: rejectionCounts,
    lastSuccess: lastSuccess ?? null,
    nextExpectedAt: nextExpectedAt(now),
  }
}

export function updateHealth(
  previous: HealthFile | null,
  run: HealthRun,
  now = new Date(),
): HealthFile {
  const runs = [...(previous?.runs ?? []), run]
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .slice(-MAX_RUNS)
  return {
    version: 1,
    updatedAt: now.toISOString(),
    runs,
    summary24h: summarizeRuns(runs, now),
  }
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return null
  }
}

function fallbackRun(
  outcome: Exclude<RunOutcome, 'published'>,
  startedAt: string,
  endedAt: string,
): HealthRun {
  return {
    startedAt,
    endedAt,
    durationSeconds: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
    outcome,
    attempts: 0,
    rejections: [],
    source: null,
    models: {
      writer: process.env.ANALYSIS_MODEL ?? 'gemma4:12b-it-qat',
      checker: process.env.CHECKER_MODEL ?? 'qwen3.5:9b',
    },
    modelCalls: [],
    liveSignals: 0,
    dataFetchErrors: [],
  }
}

async function main() {
  const [previousPath, outPath, rawOutcome, analysisPath, startedAt, endedAt] =
    process.argv.slice(2)
  if (!previousPath || !outPath || !rawOutcome || !startedAt || !endedAt)
    throw new Error(
      'Usage: health.mjs <previous.json> <out.json> <published|skipped-gpu|failed> <analysis.json|-> <startedAt> <endedAt>',
    )
  if (!['published', 'skipped-gpu', 'failed'].includes(rawOutcome))
    throw new Error(`Ungültiges Outcome: ${rawOutcome}`)

  const outcome = rawOutcome as RunOutcome
  const previous = await readJson<HealthFile>(previousPath)
  const analysis = analysisPath === '-' ? null : await readJson<{ run?: AnalysisRun }>(analysisPath)
  const run: HealthRun =
    outcome === 'published' && analysis?.run
      ? { ...analysis.run, outcome }
      : fallbackRun(outcome === 'published' ? 'failed' : outcome, startedAt, endedAt)
  const health = updateHealth(previous, run, new Date(endedAt))
  await writeFile(outPath, `${JSON.stringify(health, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
