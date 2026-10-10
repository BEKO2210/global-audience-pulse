// Golden set for the claim checker (T-020/T-022): true claims of the kinds the live job wrongly rejected plus
// real contradictions, on real facts and a real report. Compares the old prompt/schema with the new one on the local model.
//   npx esbuild scripts/analysis/checker-eval.ts --bundle --platform=node --format=esm --outfile=/tmp/eval.mjs
//   scripts/dev/gpu-lock.sh -- node /tmp/eval.mjs
import {
  CHECKER_SCHEMA,
  checkerPrompt,
  contradictions,
  trendContradictions,
  type CheckItem,
} from './checker'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MODEL = process.env.CHECKER_MODEL ?? 'qwen3.5:9b'

import { readFileSync } from 'node:fs'

// Real facts and report from the live job (analysis.json), so the checker sees the full context it gets in
// production – with toy data neither prompt makes mistakes. Each case puts one claim in front of the analysis.
const live = JSON.parse(
  readFileSync(
    process.env.ANALYSIS ?? `${process.env.HOME}/.local/share/gap-live/branch/analysis.json`,
    'utf8',
  ),
) as {
  facts: Record<string, unknown> & { gedaechtnis: Record<string, unknown> }
  report: Record<string, unknown>
}

interface Case {
  id: string
  claim: string
  contradiction: boolean
  facts?: object
}

const withHigh = (wochenhoch: number) => ({
  ...live.facts,
  gedaechtnis: { ...live.facts.gedaechtnis, wochenhoch },
})

// Built for the 2026-10-10 22:04 facts: score 69, trend 62/58/56, Berlin 21 > New York 19 points,
// London 91 Primetime, Tokio/Dubai Nachtruhe, wochenhoch 72.
const CASES: Case[] = [
  { id: 'ok-report', claim: '', contradiction: false },
  {
    id: 'ok-top',
    claim: 'Berlin trägt mit 21 Punkten am meisten zum aktuellen Wert bei.',
    contradiction: false,
  },
  {
    id: 'ok-high-eq',
    claim: 'Der aktuelle Score von 69 entspricht dem bisherigen Wochenhoch.',
    contradiction: false,
    facts: withHigh(69),
  },
  {
    id: 'ok-high-reach',
    claim: 'Globaler Score von 69 erreicht das aktuelle Wochenhoch.',
    contradiction: false,
    facts: withHigh(69),
  },
  { id: 'ok-london', claim: 'London ist mit 91 gerade die aktivste Region.', contradiction: false },
  { id: 'ok-trend', claim: 'In drei Stunden liegt der Gesamtwert bei 56.', contradiction: false },
  { id: 'c-top', claim: 'New York trägt am meisten zum aktuellen Wert bei.', contradiction: true },
  {
    id: 'c-trend',
    claim: 'Der Gesamtwert steigt in den nächsten drei Stunden.',
    contradiction: true,
  },
  { id: 'c-tokio', claim: 'Tokio ist gerade in der Primetime.', contradiction: true },
  {
    id: 'c-high',
    claim: 'Der aktuelle Score von 69 entspricht dem Wochenhoch.',
    contradiction: true,
  },
  { id: 'c-swap', claim: 'London trägt mit 21 Punkten am meisten bei.', contradiction: true },
  { id: 'c-dubai', claim: 'Dubai ist gerade im aktiven Tag.', contradiction: true },
]

const LEGACY_SCHEMA = {
  type: 'object',
  properties: {
    pruefungen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aussage: { type: 'string' },
          widerspruch: { type: 'boolean' },
          grund: { type: 'string' },
        },
        required: ['aussage', 'widerspruch', 'grund'],
      },
    },
  },
  required: ['pruefungen'],
}
const legacyPrompt = (facts: object, report: object) =>
  `Prüfe jede Aussage des Berichts gegen die Daten. Setze widerspruch nur dann auf true, wenn die Aussage den Daten eindeutig widerspricht (falscher Ort, falsche Phase, falsche Trendrichtung, Wert einer anderen Region zugeordnet). Vereinfachungen, Bewertungen und Formulierungen sind KEIN Widerspruch. "Berlin" steht für die Region Europa Zentral.\n\nDATEN:\n${JSON.stringify(facts)}\n\nBERICHT:\n${JSON.stringify(report)}`

async function ask(format: object, content: string) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      think: false,
      keep_alive: '2m',
      options: { temperature: 0, num_ctx: 8192 },
      format,
      messages: [{ role: 'user', content }],
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  return JSON.parse((await res.json()).message.content).pruefungen as unknown[]
}

async function main() {
  const rows: string[] = []
  const score = { legacy: { tp: 0, fp: 0, fn: 0, tn: 0 }, neu: { tp: 0, fp: 0, fn: 0, tn: 0 } }
  for (const c of CASES) {
    const facts = c.facts ?? live.facts
    const report = c.claim
      ? { ...live.report, analyse: `${c.claim} ${String(live.report.analyse)}` }
      : live.report
    const legacy = (await ask(LEGACY_SCHEMA, legacyPrompt(facts, report))) as {
      widerspruch: boolean
    }[]
    const legacyFlag = legacy.some((i) => i.widerspruch)
    const neu = (await ask(CHECKER_SCHEMA, checkerPrompt(facts, report))) as CheckItem[]
    const texts = Object.values(report).flatMap((v) => (typeof v === 'string' ? [v] : []))
    const neuFlag =
      contradictions(neu).length > 0 ||
      trendContradictions(texts, facts as Parameters<typeof trendContradictions>[1]).length > 0
    for (const [k, flag] of [
      ['legacy', legacyFlag],
      ['neu', neuFlag],
    ] as const) {
      const s = score[k]
      if (c.contradiction && flag) s.tp++
      else if (c.contradiction) s.fn++
      else if (flag) s.fp++
      else s.tn++
    }
    rows.push(
      `${c.id.padEnd(15)} soll ${c.contradiction ? 'WID' : 'ok '} | alt ${legacyFlag ? 'WID' : 'ok '} | neu ${neuFlag ? 'WID' : 'ok '}`,
    )
    console.log(rows.at(-1))
  }
  for (const [k, s] of Object.entries(score))
    console.log(
      `${k}: Fehlalarme ${s.fp}/${s.fp + s.tn}, übersehene Widersprüche ${s.fn}/${s.fn + s.tp}`,
    )
}

await main()
