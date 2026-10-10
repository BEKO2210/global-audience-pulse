#!/usr/bin/env node
// Creator research across up to 10 platforms (T-070).
//
// Runs only on the local model (Ollama, RTX 3070): live data from key-less sources, no API key, no cost.
//
//   npm run research                                   # interactive picker
//   npm run research -- --platforms x,reddit --topic "KI-Tools für Creator"
// Options: --platforms <ids|nummern|social|tech|longform|all>  --topic <text>  --model <ollama tag>
//          --fresh (ignore cache)  --max-age <h> (default 6)  --json (print run JSON)
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cacheKey, dispatch, loadReusable, saveRun } from './orchestrator.mjs'
import { resolveSelection } from './platforms.mjs'
import { ollamaProvider } from './providers.mjs'
import { validateResult } from './schema.mjs'
import { askSelection, renderCard, statusBoard, style } from './ui.mjs'

const CACHE_DIR = join(process.cwd(), '.cache')

export function parseArgs(argv) {
  const opts = { fresh: false, json: false, maxAge: 6 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--fresh') opts.fresh = true
    else if (a === '--json') opts.json = true
    else if (['--platforms', '--topic', '--model', '--max-age'].includes(a)) {
      const v = argv[++i]
      if (v === undefined) throw new Error(`${a} braucht einen Wert`)
      opts[a === '--max-age' ? 'maxAge' : a.slice(2)] = a === '--max-age' ? Number(v) : v
    } else throw new Error(`Unbekannte Option: ${a}`)
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const selection = opts.platforms ?? (process.stdin.isTTY ? await askSelection() : 'all')
  const platforms = resolveSelection(selection)
  const provider = ollamaProvider({ model: opts.model })
  const today = new Date().toISOString().slice(0, 10)
  const key = cacheKey(opts.topic, `${provider.name}:${provider.model}`)
  const reuse = opts.fresh ? {} : loadReusable(CACHE_DIR, key, opts.maxAge * 3_600_000)

  console.log(
    style.dim(
      `\n${platforms.length} Agenten · ${provider.name} \`${provider.model}\`${opts.topic ? ` · Thema „${opts.topic}“` : ''}\n`,
    ),
  )
  const board = statusBoard(platforms)
  const { results, durationMs } = await dispatch(platforms, provider, {
    topic: opts.topic,
    today,
    reuse,
    onState: board.update,
  })
  board.stop()

  for (const r of results) {
    const problems = validateResult(r.result)
    if (problems.length)
      throw new Error(`${r.id}: Ergebnis verletzt das Schema: ${problems.join('; ')}`)
  }
  const run = {
    createdAt: new Date().toISOString(),
    key,
    topic: opts.topic ?? null,
    provider: provider.name,
    model: provider.model,
    selection: platforms.map((p) => p.id),
    durationMs,
    results,
  }
  const fresh = results.filter((r) => !r.cached)
  const file = fresh.length ? saveRun(CACHE_DIR, run) : null

  if (opts.json) {
    console.log(JSON.stringify(run, null, 2))
  } else {
    console.log('')
    for (const r of results) console.log(renderCard(r) + '\n')
  }
  const ok = results.filter((r) => r.result.status === 'success').length
  const evidence = fresh.reduce((n, r) => n + (r.evidence ?? 0), 0)
  console.error(
    style.dim(
      `${ok}/${results.length} erfolgreich · ${(durationMs / 1000).toFixed(1)} s · ${evidence} Live-Belege` +
        `${file ? ` · gespeichert: ${file}` : ' · alles aus Cache'}`,
    ),
  )
  process.exitCode = ok ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(style.red(e.message))
    process.exit(2)
  })
}
