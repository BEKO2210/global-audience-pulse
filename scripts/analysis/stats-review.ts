/**
 * T-043: the local model reads the site's own Plausible statistics once a week and writes "what visitors do,
 * what gets stuck, what we should improve". Runs only on the operator's PC (the API key never leaves it); the
 * review is written to ~/.local/share/gap-live/stats/ and is not published.
 *
 * Usage: node stats-review.mjs [out-dir]   (key from ~/.config/gap/plausible.env, see ~/bin/gap-plausible-key)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { allowedNumbers, invalidNumbers } from './report'
import { isoWeek } from './weekly'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MODEL = process.env.ANALYSIS_MODEL ?? 'gemma4:12b-it-qat'

async function loadEnv() {
  const text = await readFile(join(homedir(), '.config/gap/plausible.env'), 'utf8')
  const env = Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => [m[1], m[2]!.replace(/^["']|["']$/g, '')]),
  )
  return {
    host: env.PLAUSIBLE_HOST ?? 'https://stats.it-handwerk-stuttgart.de',
    key: env.PLAUSIBLE_API_KEY ?? '',
    site: env.PLAUSIBLE_SITE ?? 'beko2210.github.io',
  }
}

type Query = { metrics: string[]; dimensions?: string[]; date_range: string | [string, string] }

export function weekRanges(now: Date) {
  const day = (offset: number) =>
    new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10)
  return {
    current: [day(7), day(1)] as [string, string],
    previous: [day(14), day(8)] as [string, string],
  }
}

/** Rates and the funnel are computed here; the model only words them. */
export function statsFacts(
  totals: number[],
  previous: number[],
  events: { name: string; visitors: number; events: number }[],
  sources: { name: string; visitors: number }[],
  devices: { name: string; visitors: number }[],
) {
  const [visitors = 0, visits = 0, pageviews = 0, bounce = 0, duration = 0] = totals
  const pct = (part: number) => (visitors ? Math.round((part / visitors) * 100) : 0)
  const ev = (name: string) => events.find((e) => e.name === name)?.visitors ?? 0
  return {
    woche: {
      besucher: visitors,
      besuche: visits,
      seitenaufrufe: pageviews,
      absprungrateProzent: bounce,
      besuchsdauerSekunden: duration,
    },
    vorwoche: { besucher: previous[0] ?? 0, besuche: previous[1] ?? 0 },
    // Share of visitors who used each feature at least once.
    nutzungProzent: Object.fromEntries(
      events
        .filter((e) => !['pageview', 'Web Vitals'].includes(e.name))
        .map((e) => [e.name, pct(e.visitors)]),
    ),
    trichterProzent: {
      zeitregler: pct(ev('Scrub')),
      planer: pct(ev('Planer Tab')),
      kalenderExport: pct(ev('ICS Download')),
      playbook: pct(ev('Playbook')),
    },
    quellen: sources.slice(0, 5),
    geraete: devices,
  }
}

export function statsPrompt(facts: ReturnType<typeof statsFacts>) {
  return `Du bist Produktanalyst für "Global Audience Pulse", eine kostenlose Weltzeituhr für Creator. Unten stehen die
Nutzungszahlen der letzten 7 Tage (Plausible, ohne Cookies).

Schreibe auf Deutsch, sachlich, ohne Floskeln:
- tun: 2–3 Sätze, was Besucher tun (welche Funktionen genutzt werden, welche kaum).
- hakt: 2–3 Sätze, wo Besucher abspringen oder etwas ungenutzt bleibt.
- vorschlaege: 3–5 konkrete Verbesserungen, jede mit Begründung aus den Zahlen. Keine Funktionen erfinden, die es
  nicht gibt; nur verbessern, umstellen, deutlicher machen.
Verwende NUR Zahlen aus den Daten. Bei sehr kleinen Besucherzahlen sag das und formuliere vorsichtig.

Daten (JSON):
${JSON.stringify(facts, null, 1)}`
}

const SCHEMA = {
  type: 'object',
  properties: {
    tun: { type: 'string' },
    hakt: { type: 'string' },
    vorschlaege: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
  },
  required: ['tun', 'hakt', 'vorschlaege'],
}

async function main() {
  const outDir = process.argv[2] ?? join(homedir(), '.local/share/gap-live/stats')
  const { host, key, site } = await loadEnv()
  if (!key) throw new Error('Kein Plausible-Key – ~/bin/gap-plausible-key ausführen')
  const query = async (q: Query) => {
    const response = await fetch(`${host}/api/v2/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site, ...q }),
    })
    if (!response.ok) throw new Error(`Plausible ${response.status}`)
    return ((await response.json()) as { results: { metrics: number[]; dimensions: string[] }[] })
      .results
  }
  const now = new Date()
  const { current, previous } = weekRanges(now)
  const base = ['visitors', 'visits', 'pageviews', 'bounce_rate', 'visit_duration']
  const [totals] = await query({ metrics: base, date_range: current })
  const [before] = await query({ metrics: base, date_range: previous })
  const events = (
    await query({
      metrics: ['visitors', 'events'],
      dimensions: ['event:name'],
      date_range: current,
    })
  ).map((r) => ({ name: r.dimensions[0]!, visitors: r.metrics[0]!, events: r.metrics[1]! }))
  const sources = (
    await query({ metrics: ['visitors'], dimensions: ['visit:source'], date_range: current })
  ).map((r) => ({ name: r.dimensions[0]!, visitors: r.metrics[0]! }))
  const devices = (
    await query({ metrics: ['visitors'], dimensions: ['visit:device'], date_range: current })
  ).map((r) => ({ name: r.dimensions[0]!, visitors: r.metrics[0]! }))
  const facts = statsFacts(totals?.metrics ?? [], before?.metrics ?? [], events, sources, devices)

  let review: { tun: string; hakt: string; vorschlaege: string[] } | null = null
  const allowed = allowedNumbers(facts)
  for (let attempt = 1; attempt <= 2 && !review; attempt += 1) {
    const response = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        format: SCHEMA,
        options: { temperature: 0.3, num_ctx: 8192 },
        keep_alive: 0,
        messages: [{ role: 'user', content: statsPrompt(facts) }],
      }),
    })
    const draft = JSON.parse((await response.json()).message.content)
    const text = [draft.tun, draft.hakt, ...draft.vorschlaege].join(' ')
    if (!invalidNumbers(text, allowed).length) review = draft
    else
      console.warn(
        `Versuch ${attempt}: erfundene Zahlen ${invalidNumbers(text, allowed).join(', ')}`,
      )
  }

  const week = isoWeek(now)
  const md = `# Nutzungs-Review ${week}

Zeitraum ${current[0]} bis ${current[1]} · ${facts.woche.besucher} Besucher (Vorwoche ${facts.vorwoche.besucher}) ·
${facts.woche.seitenaufrufe} Seitenaufrufe · Absprung ${facts.woche.absprungrateProzent} % · Ø ${facts.woche.besuchsdauerSekunden} s

${
  review
    ? `## Was Besucher tun\n\n${review.tun}\n\n## Was hakt\n\n${review.hakt}\n\n## Vorschläge (lokales Modell, ${MODEL})\n\n${review.vorschlaege.map((v) => `- ${v}`).join('\n')}`
    : '_Das Modell hat zweimal Zahlen erfunden; nur die Rohdaten unten._'
}

## Rohdaten

\`\`\`json
${JSON.stringify(facts, null, 1)}
\`\`\`
`
  await mkdir(outDir, { recursive: true })
  const path = join(outDir, `${week}.md`)
  await writeFile(path, md)
  console.log(path)
}

if (process.argv[1]?.includes('stats-review'))
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
