/**
 * Hourly "Lagebericht": computes the page's numbers with the app's own model code, lets a local
 * Ollama model write a short German analysis, checks that every number in the text comes from the
 * data, and writes analysis.json. Publishing to the `live-analysis` branch is done by run.sh.
 *
 * Usage: node dist-analysis/hourly.mjs <out.json>   (bundled by scripts/analysis/run.sh via esbuild)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { REGIONS } from '../../src/config/regions'
import { globalActivity } from '../../src/lib/model'
import { parseSnapshot, type Snapshot } from '../../src/lib/snapshot'
import { compare, liveSignals, readHistory, writeHistory } from './signals'
import {
  PROMPT,
  SCHEMA,
  allowedNumbers,
  buildFacts,
  invalidNumbers,
  reportTexts,
  type Facts,
} from './report'
import type { AnalysisRun, DataFetchError, ModelCall, RunRejection } from './health'
import { TOPIC_SCHEMA, countTopics, topArticles, topicPrompt } from './topics'
import type { LiveSignal } from './signals'
import {
  CHECKER_SCHEMA,
  checkerPrompt,
  contradictions,
  trendContradictions,
  type CheckItem,
} from './checker'
import {
  numbersMatch,
  sameShape,
  templateEn,
  translatePrompt,
  withEnglishHolidays,
  withOriginalNames,
  type ReportBody,
} from './english'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MODEL = process.env.ANALYSIS_MODEL ?? 'gemma4:12b-it-qat'
const CHECKER = process.env.CHECKER_MODEL ?? 'qwen3.5:9b'
const SNAPSHOT_URL =
  process.env.SNAPSHOT_URL ?? 'https://beko2210.github.io/global-audience-pulse/data/snapshot.json'
const MAX_ATTEMPTS = 3

const short = (value: unknown) =>
  String(value instanceof Error ? value.message : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)

async function loadSnapshot(errors: DataFetchError[]): Promise<Snapshot> {
  try {
    const response = await fetch(`${SNAPSHOT_URL}?t=${Date.now()}`)
    if (response.ok) return { ...parseSnapshot(await response.json()), weightingMode: 'value' }
    errors.push({ source: 'snapshot', message: `HTTP ${response.status}` })
  } catch (error) {
    errors.push({ source: 'snapshot', message: short(error) })
  }
  const local = JSON.parse(await readFile('public/data/snapshot.json', 'utf8'))
  return { ...parseSnapshot(local), weightingMode: 'value' }
}

async function loadLiveSignals(now: Date, errors: DataFetchError[]) {
  const nativeFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    try {
      const response = await nativeFetch(input, init)
      if (url.startsWith('https://wikimedia.org/') && !response.ok)
        errors.push({ source: 'wikimedia', message: `HTTP ${response.status}` })
      return response
    } catch (error) {
      if (url.startsWith('https://wikimedia.org/'))
        errors.push({ source: 'wikimedia', message: short(error) })
      throw error
    }
  }
  try {
    return await liveSignals(now)
  } finally {
    globalThis.fetch = nativeFetch
  }
}

/** Live deviation from which a region gets the "why?" topics (T-010), same bar as the report's live point. */
const TOPIC_DEVIATION = 15

/**
 * T-010: for clearly unusual regions, the topic areas of yesterday's most-read articles in their Wikipedia.
 * The model labels each title from a fixed list; countTopics keeps only topics shared by several articles.
 */
async function addTopics(live: LiveSignal[], now: Date, modelCalls: ModelCall[]) {
  for (const signal of live) {
    if (Math.abs(signal.abweichungProzent) <= TOPIC_DEVIATION) continue
    const project = REGIONS.find((r) => r.city === signal.ort)?.project
    if (!project) continue
    const started = performance.now()
    try {
      const titles = await topArticles(project, now)
      if (titles.length < 5) continue
      const response = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          think: false,
          format: TOPIC_SCHEMA,
          options: { temperature: 0, num_ctx: 4096 },
          keep_alive: 0,
          messages: [{ role: 'user', content: topicPrompt(titles) }],
        }),
      })
      if (!response.ok) throw new Error(`Ollama ${response.status}`)
      const labels = JSON.parse((await response.json()).message.content).themen as string[]
      const ok = Array.isArray(labels) && labels.length === titles.length
      modelCalls.push({
        model: MODEL,
        role: 'classifier',
        attempt: 1,
        durationMs: Math.round(performance.now() - started),
        ok,
      })
      if (ok) {
        const themen = countTopics(labels)
        if (themen.length) signal.themen = themen
      }
    } catch (error) {
      modelCalls.push({
        model: MODEL,
        role: 'classifier',
        attempt: 1,
        durationMs: Math.round(performance.now() - started),
        ok: false,
      })
      console.warn(`Themen ${signal.ort}: ${short(error)}`)
    }
  }
}

/** GPU guard: skip when something other than Ollama is using the card (training, llama-server). */
function gpuBusy() {
  try {
    const out = execFileSync(
      'nvidia-smi',
      ['--query-compute-apps=process_name,used_memory', '--format=csv,noheader,nounits'],
      { encoding: 'utf8' },
    )
    return out
      .split('\n')
      .filter(Boolean)
      .some((line) => !/ollama/i.test(line) && Number(line.split(',')[1]) > 1000)
  } catch {
    return false
  }
}

interface GenerationTelemetry {
  attempts: number
  rejections: RunRejection[]
  modelCalls: ModelCall[]
}

async function generate(facts: Facts, telemetry: GenerationTelemetry) {
  const allowed = allowedNumbers(facts)
  let lastProblem = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    telemetry.attempts = attempt
    const callStarted = performance.now()
    let report: {
      schlagzeile: string
      empfehlung: string
      analyse: string
      punkte: string[]
      zielgruppen: { name: string; urteil: string }[]
    }
    try {
      const response = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          think: false,
          format: SCHEMA,
          options: { temperature: 0.4, num_ctx: 8192 },
          keep_alive: 0, // unload right after use: the job must not hold RAM/VRAM between hours
          messages: [
            { role: 'user', content: PROMPT(facts) },
            ...(lastProblem
              ? [{ role: 'user', content: `Korrektur nötig: ${lastProblem}. Schreibe neu.` }]
              : []),
          ],
        }),
      })
      if (!response.ok) throw new Error(`Ollama ${response.status}`)
      const data = await response.json()
      report = JSON.parse(data.message.content)
      telemetry.modelCalls.push({
        model: MODEL,
        role: 'writer',
        attempt,
        durationMs: Math.round(performance.now() - callStarted),
        ok: true,
      })
    } catch (error) {
      telemetry.modelCalls.push({
        model: MODEL,
        role: 'writer',
        attempt,
        durationMs: Math.round(performance.now() - callStarted),
        ok: false,
      })
      throw error
    }
    const text = [
      report.schlagzeile,
      report.empfehlung,
      report.analyse,
      ...report.punkte,
      ...report.zielgruppen.map((z) => z.urteil),
    ].join(' ')
    const bad = invalidNumbers(text, allowed)
    const shapeOk = report.schlagzeile.length <= 90 && report.punkte.length === 3
    const claims =
      !bad.length && shapeOk ? await checkClaims(facts, report, attempt, telemetry.modelCalls) : []
    if (!bad.length && shapeOk && !claims.length) return { ...report, attempts: attempt }
    const category = bad.length ? 'zahlen' : !shapeOk ? 'form' : 'pruefer'
    lastProblem = bad.length
      ? `Diese Zahlen stehen nicht in den Daten: ${[...new Set(bad)].join(', ')}`
      : !shapeOk
        ? 'Schlagzeile zu lang oder nicht genau 3 Punkte'
        : `Ein Prüfer fand Aussagen, die den Daten widersprechen: ${claims.join('; ')}`
    telemetry.rejections.push({ attempt, category, reason: short(lastProblem) })
    console.warn(`Versuch ${attempt} verworfen: ${lastProblem}`)
  }
  return null
}

/**
 * Second opinion from a smaller local model: does any statement contradict the data (wrong place,
 * wrong phase, wrong direction of the trend, a market that does not carry the score...)?
 */
async function checkClaims(
  facts: Facts,
  report: object,
  attempt: number,
  modelCalls: ModelCall[],
): Promise<string[]> {
  const callStarted = performance.now()
  try {
    const response = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHECKER,
        stream: false,
        think: false,
        keep_alive: 0, // unload right after use: the job must not hold RAM/VRAM between hours
        options: { temperature: 0, num_ctx: 8192 },
        format: CHECKER_SCHEMA,
        messages: [
          {
            role: 'user',
            content: checkerPrompt(facts, report),
          },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Ollama ${response.status}`)
    const data = await response.json()
    const result = JSON.parse(data.message.content) as { pruefungen: CheckItem[] }
    modelCalls.push({
      model: CHECKER,
      role: 'checker',
      attempt,
      durationMs: Math.round(performance.now() - callStarted),
      ok: true,
    })
    return [
      ...contradictions(result.pruefungen),
      ...trendContradictions(reportTexts(report), facts),
    ].slice(0, 4)
  } catch {
    modelCalls.push({
      model: CHECKER,
      role: 'checker',
      attempt,
      durationMs: Math.round(performance.now() - callStarted),
      ok: false,
    })
    // checker unavailable: the number guard and the deterministic trend check still apply
    return trendContradictions(reportTexts(report), facts)
  }
}

/**
 * English edition (T-015): the writer model translates the checked German report; the translation must keep
 * every number (numbersMatch) and the shape, else the deterministic English template is used. Two tries.
 */
async function translate(
  report: ReportBody,
  holidays: Facts['feiertage'],
  modelCalls: ModelCall[],
) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const callStarted = performance.now()
    try {
      const response = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          think: false,
          format: SCHEMA,
          options: { temperature: 0.2, num_ctx: 8192 },
          keep_alive: 0,
          messages: [{ role: 'user', content: translatePrompt(report) }],
        }),
      })
      if (!response.ok) throw new Error(`Ollama ${response.status}`)
      const data = await response.json()
      const en = JSON.parse(data.message.content) as ReportBody
      const ok = sameShape(report, en) && numbersMatch(report, en)
      modelCalls.push({
        model: MODEL,
        role: 'translator',
        attempt,
        durationMs: Math.round(performance.now() - callStarted),
        ok,
      })
      if (ok) return withEnglishHolidays(withOriginalNames(report, en), holidays)
      console.warn(`Übersetzung ${attempt} verworfen: Zahlen oder Form weichen ab`)
    } catch (error) {
      modelCalls.push({
        model: MODEL,
        role: 'translator',
        attempt,
        durationMs: Math.round(performance.now() - callStarted),
        ok: false,
      })
      console.warn(`Übersetzung ${attempt} fehlgeschlagen: ${short(error)}`)
    }
  }
  return null
}

/** Deterministic fallback so the page never shows an unchecked text. */
function template(facts: Facts) {
  const [best] = facts.besteFenster24h
  const top = facts.regionen.slice(0, 2).map((r) => `${r.ort} (${r.score})`)
  return {
    schlagzeile: `${facts.gesamt.status}: Gesamtwert ${facts.gesamt.score}`,
    empfehlung: best
      ? `${facts.gesamt.empfehlung}. Bestes Fenster heute: ${best.von}–${best.bis} Uhr (Score ${best.score}).`
      : `${facts.gesamt.empfehlung}.`,
    analyse: `Am aktivsten sind gerade ${top.join(' und ')}. In drei Stunden liegt der Gesamtwert bei ${facts.trendNaechsteStunden[2].score}.`,
    punkte: facts.regionen
      .slice(0, 3)
      .map((r) => `${r.ort}: ${r.phase}, ${r.ortszeit} Uhr, Score ${r.score}`),
    zielgruppen: facts.zielgruppen.map((z) => ({
      name: z.name,
      urteil: z.besteZeit ? `Bestes Fenster ${z.besteZeit} Uhr` : z.status,
    })),
    attempts: 0,
  }
}

async function main() {
  const runStarted = new Date()
  const out = process.argv[2] ?? 'analysis.json'
  const historyPath = process.argv[3]
  if (gpuBusy() && !process.env.FORCE) {
    console.log('GPU belegt (Training/llama-server) – diese Stunde übersprungen.')
    process.exit(3)
  }
  const now = new Date()
  const dataFetchErrors: DataFetchError[] = []
  const snapshot = await loadSnapshot(dataFetchErrors)
  const history = await readHistory(historyPath)
  const ids = REGIONS.map((r) => r.id)
  const scoreNow = Math.round(globalActivity(REGIONS, ids, now, snapshot))
  const live = await loadLiveSignals(now, dataFetchErrors)
  const started = Date.now()
  const telemetry: GenerationTelemetry = { attempts: 0, rejections: [], modelCalls: [] }
  await addTopics(live, now, telemetry.modelCalls)
  const facts = buildFacts(snapshot, now, live, compare(history, now, scoreNow))
  let report = null
  try {
    report = await generate(facts, telemetry)
  } catch (error) {
    console.warn(`LLM nicht erreichbar: ${(error as Error).message}`)
  }
  let reportEn: ReportBody | null = null
  if (report) {
    const { schlagzeile, empfehlung, analyse, punkte, zielgruppen } = report
    reportEn = await translate(
      { schlagzeile, empfehlung, analyse, punkte, zielgruppen },
      facts.feiertage,
      telemetry.modelCalls,
    )
  }
  const sourceEn = reportEn ? 'llm' : 'template'
  const runEnded = new Date()
  const run: AnalysisRun = {
    startedAt: runStarted.toISOString(),
    endedAt: runEnded.toISOString(),
    durationSeconds: Math.round((runEnded.getTime() - runStarted.getTime()) / 1000),
    attempts: telemetry.attempts,
    rejections: telemetry.rejections,
    source: report ? 'llm' : 'template',
    models: { writer: MODEL, checker: CHECKER },
    modelCalls: telemetry.modelCalls,
    liveSignals: live.length,
    dataFetchErrors,
  }
  const result = {
    version: 2,
    // EU AI Act Art. 50(2): machine-readable marking of AI-generated text.
    aiGenerated: report !== null,
    digitalSourceType: report
      ? 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'
      : null,
    generatedAt: now.toISOString(),
    model: report ? MODEL : null,
    source: report ? 'llm' : 'template',
    durationSeconds: Math.round((Date.now() - started) / 1000),
    snapshotGeneratedAt: snapshot.generatedAt,
    run,
    facts,
    report: report ?? template(facts),
    // English edition (T-015): checked translation of the report above, or the English template.
    reportEn: reportEn ?? templateEn(facts),
    sourceEn,
  }
  await writeFile(out, `${JSON.stringify(result, null, 2)}\n`)
  if (historyPath)
    await writeHistory(historyPath, history, {
      t: now.toISOString(),
      score: facts.gesamt.score,
      regions: Object.fromEntries(facts.regionen.map((r) => [r.id, r.score])),
    })
  console.log(`${result.source} · ${result.report.schlagzeile}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
