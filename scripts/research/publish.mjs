#!/usr/bin/env node
// Builds research.json for the page (T-071): all 10 platforms, general creator trends, local model only.
// Called from scripts/analysis/run.sh at most every 3 h; the file goes onto the `live-analysis` branch.
//
//   node scripts/research/publish.mjs <out.json>
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { dispatch } from './orchestrator.mjs'
import { PLATFORMS } from './platforms.mjs'
import { ollamaProvider } from './providers.mjs'
import { validateResult } from './schema.mjs'

export const RESEARCH_VERSION = 1
const IPTC_AI = 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'

/** "Some headline (2026-10-09) https://…" → { title, url } for the source links on the card. */
export function toSource(line) {
  const url = line.match(/https?:\/\/\S+/)?.[0]
  if (!url) return null
  const title = line
    .replace(url, '')
    .replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '')
    .trim()
  return { title: title || new URL(url).host, url }
}

export function buildPayload({ results, durationMs, model, now = new Date() }) {
  const byId = new Map(PLATFORMS.map((p) => [p.id, p]))
  return {
    version: RESEARCH_VERSION,
    generatedAt: now.toISOString(),
    aiGenerated: true,
    digitalSourceType: IPTC_AI,
    model,
    durationMs,
    platforms: results.map((r) => {
      const platform = byId.get(r.id)
      const { platform: _name, ...result } = r.result
      const seen = new Set()
      const sources = (r.evidenceSample ?? [])
        .map(toSource)
        .filter((s) => s && !seen.has(s.url) && seen.add(s.url))
        .slice(0, 3)
      return {
        id: r.id,
        name: platform.name,
        category: platform.category,
        evidence: r.evidence ?? 0,
        sources,
        ...result,
      }
    }),
  }
}

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('Aufruf: publish.mjs <out.json>')
  const provider = ollamaProvider()
  const today = new Date().toISOString().slice(0, 10)
  const { results, durationMs } = await dispatch(PLATFORMS, provider, {
    today,
    onState: (id, s, note) =>
      s !== 'running' && console.log(`${id}: ${s}${note ? ` – ${note}` : ''}`),
  })
  for (const r of results) {
    const problems = validateResult(r.result)
    if (problems.length) throw new Error(`${r.id}: ${problems.join('; ')}`)
  }
  const ok = results.filter((r) => r.result.status === 'success').length
  // Publishing a mostly empty board is worse than keeping the previous one.
  if (ok < Math.ceil(PLATFORMS.length / 2)) {
    console.error(`Nur ${ok}/${PLATFORMS.length} erfolgreich – nichts veröffentlicht`)
    process.exit(4)
  }
  const payload = buildPayload({ results, durationMs, model: provider.model })
  writeFileSync(out, JSON.stringify(payload, null, 2) + '\n')
  console.log(
    `research.json: ${ok}/${PLATFORMS.length} Plattformen, ${(durationMs / 1000).toFixed(0)} s`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(2)
  })
}
