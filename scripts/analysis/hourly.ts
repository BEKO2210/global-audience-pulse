/**
 * Hourly "Lagebericht": computes the page's numbers with the app's own model code, lets a local
 * Ollama model write a short German analysis, checks that every number in the text comes from the
 * data, and writes analysis.json. Publishing to the `live-analysis` branch is done by run.sh.
 *
 * Usage: node dist-analysis/hourly.mjs <out.json>   (bundled by scripts/analysis/run.sh via esbuild)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { PRESETS, REGIONS } from '../../src/config/regions'
import { PHASES } from '../../src/config/model'
import {
  findBestWindows,
  globalActivity,
  phaseAt,
  regionActivity,
  statusFor,
  normalizedWeights,
} from '../../src/lib/model'
import { parseSnapshot, type Snapshot } from '../../src/lib/snapshot'
import { formatTime, localDecimalHour, timeZoneName } from '../../src/lib/time'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MODEL = process.env.ANALYSIS_MODEL ?? 'gemma4:12b-it-qat'
const SNAPSHOT_URL =
  process.env.SNAPSHOT_URL ?? 'https://beko2210.github.io/global-audience-pulse/data/snapshot.json'
const ZONE = 'Europe/Berlin'
const MAX_ATTEMPTS = 3

const round = (n: number) => Math.round(n)
const hm = (d: Date) => formatTime(d, ZONE)

async function loadSnapshot(): Promise<Snapshot> {
  try {
    const response = await fetch(`${SNAPSHOT_URL}?t=${Date.now()}`)
    if (response.ok) return { ...parseSnapshot(await response.json()), weightingMode: 'value' }
  } catch {
    /* fall back to the committed snapshot */
  }
  const local = JSON.parse(await readFile('public/data/snapshot.json', 'utf8'))
  return { ...parseSnapshot(local), weightingMode: 'value' }
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

function buildFacts(snapshot: Snapshot, now: Date) {
  const ids = REGIONS.map((r) => r.id)
  const weights = normalizedWeights(ids, snapshot)
  const scoreAt = (d: Date) => globalActivity(REGIONS, ids, d, snapshot)
  const score = round(scoreAt(now))
  const status = statusFor(score)
  const regions = REGIONS.map((region) => {
    const hour = localDecimalHour(now, region.timeZone)
    return {
      ort: region.city,
      region: region.name,
      ortszeit: formatTime(now, region.timeZone),
      phase: phaseAt(hour).name,
      score: round(regionActivity(region, now, snapshot)),
      gewichtProzent: round((weights[region.id] ?? 0) * 100),
      // Points this region contributes to the global score (score × weight): who carries the value.
      beitragPunkte: round(regionActivity(region, now, snapshot) * (weights[region.id] ?? 0)),
    }
  }).sort((a, b) => b.beitragPunkte - a.beitragPunkte)
  const windows = findBestWindows(scoreAt, now, 24).map((w) => ({
    von: hm(w.start),
    bis: hm(w.end),
    score: round(w.score),
    primetimeIn: REGIONS.filter(
      (r) => phaseAt(localDecimalHour(w.start, r.timeZone)).id === 'prime',
    ).map((r) => r.city),
  }))
  const trend = [1, 2, 3].map((h) => ({
    inStunden: h,
    score: round(scoreAt(new Date(now.getTime() + h * 3_600_000))),
  }))
  const presets = PRESETS.map((preset) => {
    const best = findBestWindows(
      (d) => globalActivity(REGIONS, preset.ids, d, snapshot),
      now,
      24,
      undefined,
      1,
    )[0]
    return best
      ? { name: preset.name, von: hm(best.start), bis: hm(best.end), score: round(best.score) }
      : { name: preset.name }
  })
  return {
    zeitpunkt: `${hm(now)} ${timeZoneName(now, ZONE)}`,
    gewichtung: 'Werbewert (Internetnutzer × BIP pro Kopf, Weltbank)',
    gesamt: { score, status: status.label, empfehlung: status.verdict },
    trendNaechsteStunden: trend,
    besteFenster24h: windows,
    presets,
    regionen: regions,
    phasen: PHASES.map((p) => `${p.name} ${p.from}–${p.to} Uhr`),
  }
}

type Facts = ReturnType<typeof buildFacts>

const SCHEMA = {
  type: 'object',
  properties: {
    schlagzeile: { type: 'string' },
    empfehlung: { type: 'string' },
    analyse: { type: 'string' },
    punkte: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
  },
  required: ['schlagzeile', 'empfehlung', 'analyse', 'punkte'],
}

const PROMPT = (
  facts: Facts,
) => `Du schreibst den stündlichen Lagebericht für "Global Audience Pulse", eine Weltzeituhr für Creator, die zeigt, wann Social-Media-Publikum weltweit wach und aufnahmefähig ist.

Regeln:
- Deutsch, sachlich, klar, ohne Emojis, ohne Ausrufezeichen, ohne Marketing-Floskeln.
- Verwende NUR Zahlen, Uhrzeiten und Orte, die in den Daten stehen. Erfinde nichts, runde nichts um.
- Uhrzeiten sind deutsche Zeit (${facts.zeitpunkt.split(' ').at(-1)}), außer bei "ortszeit".
- schlagzeile: höchstens 70 Zeichen, die Lage in einem Satz.
- empfehlung: 1–2 Sätze, konkret: jetzt posten oder wann (bestes Fenster nennen).
- analyse: 3–4 Sätze: welche Märkte tragen den Wert gerade (größter beitragPunkte, nicht gewichtProzent), wohin entwickelt er sich in den nächsten Stunden, was bedeutet das für Creator.
- punkte: genau 3 kurze Stichpunkte mit konkreten Fakten aus den Daten.

Daten (JSON):
${JSON.stringify(facts, null, 1)}`

/** Every number in the text must appear in the facts (anti-hallucination guard). */
function allowedNumbers(facts: Facts) {
  const allowed = new Set<string>()
  for (const match of JSON.stringify(facts).matchAll(/\d+/g)) {
    allowed.add(String(Number(match[0])))
  }
  for (let n = 1; n <= 8; n += 1) allowed.add(String(n)) // counts like "drei Märkte" written as digits
  return allowed
}

function invalidNumbers(text: string, allowed: Set<string>) {
  return [...text.matchAll(/\d+/g)].map((m) => String(Number(m[0]))).filter((n) => !allowed.has(n))
}

async function generate(facts: Facts) {
  const allowed = allowedNumbers(facts)
  let lastProblem = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        format: SCHEMA,
        options: { temperature: 0.4, num_ctx: 8192 },
        keep_alive: '2m',
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
    const report = JSON.parse(data.message.content) as {
      schlagzeile: string
      empfehlung: string
      analyse: string
      punkte: string[]
    }
    const text = [report.schlagzeile, report.empfehlung, report.analyse, ...report.punkte].join(' ')
    const bad = invalidNumbers(text, allowed)
    if (!bad.length && report.schlagzeile.length <= 90 && report.punkte.length === 3)
      return { ...report, attempts: attempt }
    lastProblem = bad.length
      ? `Diese Zahlen stehen nicht in den Daten: ${[...new Set(bad)].join(', ')}`
      : 'Schlagzeile zu lang oder nicht genau 3 Punkte'
    console.warn(`Versuch ${attempt} verworfen: ${lastProblem}`)
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
    attempts: 0,
  }
}

async function main() {
  const out = process.argv[2] ?? 'analysis.json'
  if (gpuBusy() && !process.env.FORCE) {
    console.log('GPU belegt (Training/llama-server) – diese Stunde übersprungen.')
    process.exit(3)
  }
  const now = new Date()
  const snapshot = await loadSnapshot()
  const facts = buildFacts(snapshot, now)
  const started = Date.now()
  let report = null
  try {
    report = await generate(facts)
  } catch (error) {
    console.warn(`LLM nicht erreichbar: ${(error as Error).message}`)
  }
  const result = {
    version: 1,
    generatedAt: now.toISOString(),
    model: report ? MODEL : null,
    source: report ? 'llm' : 'template',
    durationSeconds: Math.round((Date.now() - started) / 1000),
    snapshotGeneratedAt: snapshot.generatedAt,
    facts,
    report: report ?? template(facts),
  }
  await writeFile(out, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`${result.source} · ${result.report.schlagzeile}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
