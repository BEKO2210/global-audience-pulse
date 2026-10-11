#!/usr/bin/env node
// Local test writer (T-052): for changed pure modules, ornith (Ollama) proposes extra Vitest cases; each proposal
// runs once and lands in LOCAL-TESTS.md with its result. Advisory only – the model's own claims are never trusted
// (see docs/AGENTS.md, T-050 lesson): a failing proposal is either a real bug or a wrong expectation, and Claude
// adopts only cases that would catch real errors.
//
//   npm run tests:local                          # changed src/lib + scripts/analysis modules vs. origin/main
//   npm run tests:local -- src/lib/captions.ts   # explicit modules
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MODEL = process.env.TEST_MODEL ?? 'ornith:9b-agent32k'
const OUT_DIR = '.local-tests'

/** Pure modules only: no components (need a DOM), no tests, no type-only files. */
export function isCandidate(path) {
  return (
    /^(src\/lib|scripts\/analysis)\/[^/]+\.ts$/.test(path) &&
    !/\.(test|local\.test|d)\.ts$/.test(path) &&
    existsSync(path)
  )
}

export function changedModules(base = 'origin/main') {
  const out = execFileSync('git', ['diff', '--name-only', base], { encoding: 'utf8' })
  return out.split('\n').filter(isCandidate)
}

/** Strips a Markdown fence if the model wrapped the file in one. */
export function unfence(code) {
  const match = code.match(/```(?:ts|typescript)?\n([\s\S]*?)```/)
  return (match ? match[1] : code).trim() + '\n'
}

function prompt(path, source, existing) {
  const module = `./${basename(path, '.ts')}`
  return `Schreibe eine Vitest-Testdatei (TypeScript) mit 3 bis 5 zusätzlichen Tests für dieses Modul.
- Importiere aus "vitest" und aus "${module}" (nur exportierte Namen).
- Teste Randfälle, die die vorhandenen Tests NICHT abdecken: leere Eingaben, Grenzen (genau auf dem Schwellwert),
  Sortierung bei Gleichstand, Zeitzonen/DST, ungültige Daten.
- Erwartete Werte musst du aus dem Code herleiten; keine Netzwerkaufrufe, keine Zufallswerte, kein Date.now().
- Antworte nur mit dem Dateiinhalt.

MODUL ${path}:
${source}

VORHANDENE TESTS:
${existing || '(keine)'}`
}

async function propose(path) {
  const testPath = path.replace(/\.ts$/, '.test.ts')
  const existing = existsSync(testPath) ? readFileSync(testPath, 'utf8') : ''
  const response = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      // streamed: a long answer would otherwise hit Node's 300 s headers timeout ("fetch failed")
      stream: true,
      think: false,
      options: { temperature: 0.2, num_ctx: 32768 },
      keep_alive: 0,
      messages: [{ role: 'user', content: prompt(path, readFileSync(path, 'utf8'), existing) }],
    }),
  })
  if (!response.ok || !response.body) throw new Error(`Ollama ${response.status}`)
  let text = ''
  let buffer = ''
  for await (const chunk of response.body) {
    buffer += Buffer.from(chunk).toString('utf8')
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) if (line.trim()) text += JSON.parse(line).message?.content ?? ''
  }
  return unfence(text)
}

/** Runs one proposal next to its module (so relative imports resolve), then removes it again. */
function run(path, code) {
  const file = join(dirname(path), `${basename(path, '.ts')}.local.test.ts`)
  writeFileSync(file, code)
  try {
    const result = spawnSync(
      'npx',
      ['vitest', 'run', file, '--reporter=json', '--outputFile', `${OUT_DIR}/last.json`],
      { encoding: 'utf8' },
    )
    const report = existsSync(`${OUT_DIR}/last.json`)
      ? JSON.parse(readFileSync(`${OUT_DIR}/last.json`, 'utf8'))
      : null
    const tests = (report?.testResults ?? []).flatMap((r) =>
      (r.assertionResults ?? []).map((a) => ({
        name: a.fullName ?? a.title,
        status: a.status,
        message: (a.failureMessages?.[0] ?? '').split('\n')[0].slice(0, 240),
      })),
    )
    const fileError = report?.testResults?.[0]?.message?.split('\n')[0] ?? ''
    return { tests, error: tests.length ? '' : fileError || result.stderr.split('\n')[0] }
  } finally {
    rmSync(file, { force: true })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const modules = args.length ? args.filter(isCandidate) : changedModules()
  mkdirSync(OUT_DIR, { recursive: true })
  if (!modules.length) {
    console.log('Keine geänderten reinen Module.')
    return
  }
  const sections = []
  for (const path of modules) {
    console.log(`→ ${path}`)
    try {
      const code = await propose(path)
      const proposal = join(OUT_DIR, `${basename(path, '.ts')}.proposed.test.ts`)
      writeFileSync(proposal, code)
      const { tests, error } = run(path, code)
      const lines = tests.map(
        (t) =>
          `- ${t.status === 'passed' ? '✓' : '✗'} ${t.name}${t.message ? ` – ${t.message}` : ''}`,
      )
      sections.push(
        `## ${path}\n\nVorschlag: \`${proposal}\`\n\n${error ? `Datei lief nicht: ${error}\n` : lines.join('\n')}\n`,
      )
    } catch (error) {
      sections.push(`## ${path}\n\nFehler: ${error.message}\n`)
    }
  }
  writeFileSync(
    'LOCAL-TESTS.md',
    `# Lokale Testvorschläge (${MODEL})\n\nNur Hinweise: ✗ heißt Fehler im Code ODER falsche Erwartung des Modells – prüfen, nicht übernehmen.\n\n${sections.join('\n')}`,
  )
  console.log('LOCAL-TESTS.md geschrieben')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
