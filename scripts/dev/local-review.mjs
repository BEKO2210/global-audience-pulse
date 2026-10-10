#!/usr/bin/env node
// Local second-opinion review (T-051): diff against a base branch → qwen3.5:9b via Ollama → REVIEW-LOCAL.md.
// Advisory only: findings are checked against the diff (file + changed line must exist), Claude decides.
//
//   npm run review:local                       # current branch + uncommitted changes vs. main
//   npm run review:local -- --base origin/main --strict
// New untracked files are not in the diff: commit them or `git add -N <file>` first.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MAX_CHUNK_CHARS = 24_000 // ≈ 7–8k tokens; num_ctx below leaves room for rules + answer
const IGNORE = [
  /(^|\/)package-lock\.json$/,
  /^dist\//,
  /^public\/data\//,
  /\.(svg|png|jpe?g|webp|ico|woff2?)$/,
  /^e2e\/fixtures\//,
  /\.md$/,
]

export const SEVERITIES = ['hoch', 'mittel', 'niedrig']
export const CATEGORIES = ['bug', 'a11y', 'hartcodiert', 'sicherheit', 'performance', 'sonstiges']

export const SCHEMA = {
  type: 'object',
  properties: {
    befunde: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          datei: { type: 'string' },
          zeile: { type: 'integer' },
          schwere: { type: 'string', enum: SEVERITIES },
          kategorie: { type: 'string', enum: CATEGORIES },
          problem: { type: 'string' },
          vorschlag: { type: 'string' },
        },
        required: ['datei', 'zeile', 'schwere', 'kategorie', 'problem', 'vorschlag'],
      },
    },
  },
  required: ['befunde'],
}

const RULES = `Du prüfst eine Code-Änderung (git diff) der Web-App "Global Audience Pulse"
(React 19 + TypeScript strict, Vite, deutsche Oberfläche). Projektregeln:
- Keine hart codierten Zahlen oder Texte, die sich ändern (Werte kommen aus Daten/Config).
- Barrierefreiheit WCAG 2.2 AA: Textalternativen für Grafiken, sichtbarer Fokus, Kontrast, Touch-Ziele ≥ 24 px,
  prefers-reduced-motion respektieren.
- Mobil zuerst (360 px ohne horizontalen Überlauf), kein Layout-Sprung (CLS).
- Keine personenbezogenen Daten in Analytics-Ereignissen.

Jede Zeile hat das Format "<neue Zeilennummer>|<Marker> <Code>": "+" = neu/geändert, "-" = entfernt
(Zeilennummer "-"), Leerzeichen = unveränderter Kontext. Vergleiche "-" und "+" genau: geänderte
Bedingungen und Grenzen (< statt <=), entfernte Attribute (role, aria-*, alt), vertauschte Werte.
Melde NUR echte Probleme der Änderung: Fehler, die zur Laufzeit falsch rechnen oder abstürzen,
A11y-Verstöße, hart codierte Werte, Sicherheitslücken, Performance-Fallen. "Hart codiert" meint
angezeigte Datenwerte oder Texte, die aus Daten/Config kommen müssten – nicht Einheiten-Umrechnungen
(60 Minuten, 1000 ms) oder Konstanten in Hilfsfunktionen. Keine Stil-Wünsche, kein Lob, keine
Vermutungen über Code, den du nicht siehst. Nutze exakt den Dateinamen aus der Kopfzeile
"### Datei:" und eine Zeilennummer eines "+"-Zeile oder der Zeile direkt nach "-"-Zeilen. Wenn nichts zu melden ist: leere Liste.`

/** Split a unified diff (git diff -U3) into files with numbered, reviewable lines. */
export function parseDiff(diff) {
  const files = []
  let file = null
  let newLine = 0
  let afterRemoval = false
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      file = null
      continue
    }
    if (raw.startsWith('+++ ')) {
      const path = raw.slice(4).replace(/^b\//, '')
      file = path === '/dev/null' ? null : { path, lines: [], changed: new Set() }
      if (file) files.push(file)
      continue
    }
    if (!file || raw.startsWith('--- ') || raw.startsWith('\\')) continue
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      newLine = Number(hunk[1])
      afterRemoval = false
      file.lines.push('…')
      continue
    }
    if (raw.startsWith('-')) {
      // Removed lines are shown (a deleted aria attribute is a finding too) and attributed to the next new line.
      file.lines.push(`-|- ${raw.slice(1)}`)
      afterRemoval = true
    } else if (raw.startsWith('+')) {
      file.changed.add(newLine)
      file.lines.push(`${newLine}|+ ${raw.slice(1)}`)
      newLine++
      afterRemoval = false
    } else if (raw.startsWith(' ')) {
      if (afterRemoval) file.changed.add(newLine)
      file.lines.push(`${newLine}|  ${raw.slice(1)}`)
      newLine++
      afterRemoval = false
    }
  }
  return files.filter((f) => f.changed.size > 0 && !IGNORE.some((re) => re.test(f.path)))
}

/** Group file sections into prompt-sized chunks; oversized files are split at hunk markers. */
export function chunkFiles(files, max = MAX_CHUNK_CHARS) {
  const sections = []
  for (const f of files) {
    const header = `### Datei: ${f.path}\n`
    let body = ''
    for (const line of f.lines) {
      if (body.length + line.length + header.length > max && body) {
        sections.push(header + body)
        body = ''
      }
      body += line + '\n'
    }
    if (body) sections.push(header + body)
  }
  const chunks = []
  let current = ''
  for (const s of sections) {
    if (current && current.length + s.length > max) {
      chunks.push(current)
      current = ''
    }
    current += s + '\n'
  }
  if (current) chunks.push(current)
  return chunks
}

/** Keep only findings that point at a changed line of a reviewed file; dedupe. */
export function verifyFindings(findings, files) {
  const byPath = new Map(files.map((f) => [f.path, f]))
  const seen = new Set()
  const kept = []
  let dropped = 0
  for (const f of findings) {
    const file = byPath.get(f.datei)
    const ok =
      file &&
      Number.isInteger(f.zeile) &&
      file.changed.has(f.zeile) &&
      SEVERITIES.includes(f.schwere) &&
      CATEGORIES.includes(f.kategorie) &&
      f.problem?.trim()
    const key = `${f.datei}:${f.zeile}:${f.problem}`
    if (!ok || seen.has(key)) {
      dropped++
      continue
    }
    seen.add(key)
    kept.push(f)
  }
  kept.sort(
    (a, b) =>
      SEVERITIES.indexOf(a.schwere) - SEVERITIES.indexOf(b.schwere) ||
      a.datei.localeCompare(b.datei) ||
      a.zeile - b.zeile,
  )
  return { kept, dropped }
}

/** Numbered diff lines around a finding, for the per-finding check. */
export function excerpt(file, line, radius = 10) {
  const at = file.lines.findIndex((l) => l.startsWith(`${line}|`))
  if (at < 0) return ''
  return file.lines.slice(Math.max(0, at - radius), at + radius + 1).join('\n')
}

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()

export function renderReport({ findings, dropped, rejected = 0, meta }) {
  const lines = [
    '# Lokales Review (zweite Meinung)',
    '',
    `Modell \`${meta.model}\` · Basis \`${meta.base}\` (${meta.baseSha}) · Stand \`${meta.headSha}\`${meta.dirty ? ' + nicht committete Änderungen' : ''}`,
    `${meta.files} Dateien in ${meta.chunks} Abschnitten · ${meta.seconds} s · ${dropped} verworfen (Stelle nicht in der Änderung) · ${rejected} von der Prüfstufe abgelehnt`,
    '',
    '> Automatische Einschätzung eines lokalen Sprachmodells. Kann irren – jeder Befund wird vor dem Merge geprüft.',
    '',
  ]
  if (!findings.length) {
    lines.push('Keine Befunde.')
  } else {
    lines.push(
      '| Schwere | Kategorie | Stelle | Problem | Vorschlag |',
      '| --- | --- | --- | --- | --- |',
    )
    for (const f of findings) {
      lines.push(
        `| ${f.schwere} | ${f.kategorie} | \`${cell(f.datei)}:${f.zeile}\` | ${cell(f.problem)} | ${cell(f.vorschlag)} |`,
      )
    }
  }
  if (meta.errors.length) {
    lines.push('', '## Fehler', '', ...meta.errors.map((e) => `- ${e}`))
  }
  return lines.join('\n') + '\n'
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
}

function parseArgs(argv) {
  const opts = { base: 'main', model: 'qwen3.5:9b', out: 'REVIEW-LOCAL.md', strict: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--strict') opts.strict = true
    else if (['--base', '--model', '--out'].includes(a)) opts[a.slice(2)] = argv[++i]
    else throw new Error(`Unbekannte Option: ${a}`)
  }
  return opts
}

// Second pass with a narrow brief: a 9B model overlooks removed aria/role attributes in a general review.
const FOCUS = {
  allgemein: '',
  a11y: `\n\nSchwerpunkt dieses Durchgangs: NUR Barrierefreiheit (Kategorie "a11y"). Prüfe jede "-"-Zeile:
wurde role, aria-label, aria-hidden, alt, title, tabIndex, ein <label> oder eine Textalternative entfernt
oder geschwächt? Prüfe jede "+"-Zeile auf Grafiken/Buttons ohne zugänglichen Namen.`,
}

async function review(chunk, model, focus) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: SCHEMA,
      keep_alive: 0, // free the GPU right away; the hourly report job shares it
      options: { temperature: 0, num_ctx: 16384 },
      messages: [
        { role: 'system', content: RULES + FOCUS[focus] },
        { role: 'user', content: chunk },
      ],
    }),
    signal: AbortSignal.timeout(300_000),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return JSON.parse(data.message.content).befunde ?? []
}

const CHECK_PROMPT = `Du bist ein strenger Prüfer. Ein anderes Modell behauptet einen Befund in einer Code-Änderung.
Antworte "echt": true NUR, wenn der gezeigte Code den Fehler nachweislich enthält: eine falsche Berechnung
oder Grenze, ein Absturz, ein entfernter oder fehlender zugänglicher Name (role/aria/alt), ein hart codierter
angezeigter Datenwert/Text. Antworte false bei Vermutungen ("könnte", "falls", "bei sehr großen Werten"),
Stil- oder Layout-Meinungen, Hinweisen ohne konkreten Fehler und bei rein dekorativen Elementen mit aria-hidden.
Zeilenformat: "<Nr>|+ " neu, "-|- " entfernt, "<Nr>|  " unverändert.`

async function confirm(finding, file, model) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      keep_alive: 0,
      options: { temperature: 0, num_ctx: 8192 },
      format: {
        type: 'object',
        properties: { echt: { type: 'boolean' }, grund: { type: 'string' } },
        required: ['echt', 'grund'],
      },
      messages: [
        { role: 'system', content: CHECK_PROMPT },
        {
          role: 'user',
          content: `Datei ${finding.datei}, Zeile ${finding.zeile}\nBefund (${finding.kategorie}): ${finding.problem}\n\nCode:\n${excerpt(file, finding.zeile)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  return JSON.parse((await res.json()).message.content)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const started = Date.now()
  const mergeBase = git('merge-base', opts.base, 'HEAD')
  // Diff from the merge base to the working tree: committed branch work plus uncommitted edits.
  const diff = git('diff', '-U3', '--no-color', '--no-ext-diff', mergeBase)
  const files = parseDiff(diff)
  const chunks = chunkFiles(files)
  const errors = []
  const raw = []
  for (const [i, chunk] of chunks.entries()) {
    for (const focus of Object.keys(FOCUS)) {
      process.stderr.write(`Abschnitt ${i + 1}/${chunks.length} (${focus}) …\n`)
      try {
        raw.push(...(await review(chunk, opts.model, focus)))
      } catch (e) {
        errors.push(`Abschnitt ${i + 1} (${focus}): ${e.message}`)
      }
    }
  }
  const verified = verifyFindings(raw, files)
  const byPath = new Map(files.map((f) => [f.path, f]))
  const kept = []
  let rejected = 0
  for (const f of verified.kept) {
    process.stderr.write(`Prüfe ${f.datei}:${f.zeile} …\n`)
    try {
      const verdict = await confirm(f, byPath.get(f.datei), opts.model)
      if (verdict.echt) kept.push(f)
      else rejected++
    } catch (e) {
      errors.push(`Prüfung ${f.datei}:${f.zeile}: ${e.message}`)
      kept.push({ ...f, problem: `(ungeprüft) ${f.problem}` })
    }
  }
  const dropped = verified.dropped
  const report = renderReport({
    findings: kept,
    dropped,
    rejected,
    meta: {
      model: opts.model,
      base: opts.base,
      baseSha: mergeBase.slice(0, 7),
      headSha: git('rev-parse', '--short', 'HEAD'),
      dirty: git('status', '--porcelain', '--untracked-files=no') !== '',
      files: files.length,
      chunks: chunks.length,
      seconds: Math.round((Date.now() - started) / 1000),
      errors,
    },
  })
  writeFileSync(opts.out, report)
  const high = kept.filter((f) => f.schwere === 'hoch').length
  console.log(
    `${opts.out}: ${kept.length} Befunde (${high} hoch), ${dropped} verworfen, ${rejected} abgelehnt, ${errors.length} Fehler`,
  )
  if (errors.length && errors.length === chunks.length * Object.keys(FOCUS).length) process.exit(2)
  if (opts.strict && high) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
