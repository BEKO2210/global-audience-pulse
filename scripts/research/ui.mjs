// Terminal interface: platform picker, live status board, result cards.
import { createInterface } from 'node:readline/promises'
import { CATEGORIES, PLATFORMS, resolveSelection } from './platforms.mjs'
import { STATES } from './orchestrator.mjs'

const tty = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s)
export const style = { dim: c(2), bold: c(1), green: c(32), red: c(31), yellow: c(33), cyan: c(36) }

/**
 * Read the picker answer. Accepts a plain selection ("1,7", "tech reddit", "all") or a pasted command line
 * ("npm run research -- --platforms x --topic \"…\""), so copying the example into the prompt also works.
 */
export function parseAnswer(answer) {
  const text = answer.trim()
  if (!text) return { selection: 'all' }
  if (!/--(platforms|topic)\b/.test(text)) return { selection: text }
  const value = (flag) => text.match(new RegExp(`--${flag}\\s+(?:"([^"]*)"|'([^']*)'|(\\S+))`))
  const pick = (m) => (m ? (m[1] ?? m[2] ?? m[3]) : undefined)
  return { selection: pick(value('platforms')) ?? 'all', topic: pick(value('topic')) }
}

/** Interactive picker: re-asks on typos instead of aborting, then asks for an optional niche. */
export async function askRun({ topic } = {}) {
  const lines = [style.bold('Plattformen'), '']
  for (const [key, label] of Object.entries(CATEGORIES)) {
    lines.push(`  ${style.cyan(key.padEnd(9))} ${label}`)
    PLATFORMS.forEach((p, i) => {
      if (p.category === key) lines.push(`    ${String(i + 1).padStart(2)}  ${p.name}`)
    })
  }
  lines.push(
    '',
    style.dim(
      'Auswahl: Nummern, Namen oder Kategorien, kombinierbar – z. B. "1,7", "tech", "social reddit".',
    ),
    style.dim('Enter = alle 10.'),
  )
  console.log(lines.join('\n'))
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    for (;;) {
      const answer = parseAnswer(await rl.question('Plattformen > '))
      try {
        const platforms = resolveSelection(answer.selection)
        let chosen = answer.topic ?? topic
        if (chosen === undefined)
          chosen = (await rl.question('Thema/Nische (Enter = allgemein) > ')).trim() || undefined
        return { platforms, topic: chosen }
      } catch (e) {
        console.log(style.red(`${e.message} – bitte nochmal.`))
      }
    }
  } finally {
    rl.close()
  }
}

const ICON = { pending: '○', running: '◐', done: '●', error: '✕' }
const COLOR = { pending: style.dim, running: style.yellow, done: style.green, error: style.red }
const SPIN = ['◐', '◓', '◑', '◒']

/** Live board: one line per agent, redrawn in place on a TTY; plain log lines otherwise. */
export function statusBoard(platforms) {
  const state = Object.fromEntries(
    platforms.map((p) => [p.id, { s: 'pending', note: '', t0: 0, t1: 0 }]),
  )
  let frame = 0
  let drawn = 0
  const render = () => {
    const now = Date.now()
    const rows = platforms.map((p) => {
      const st = state[p.id]
      const secs = st.t0 ? ((st.t1 || now) - st.t0) / 1000 : 0
      const icon = st.s === 'running' ? SPIN[frame % 4] : ICON[st.s]
      return `${COLOR[st.s](`${icon} ${STATES[st.s].padEnd(6)}`)}  ${p.name.padEnd(22)} ${style.dim(`${secs.toFixed(1).padStart(5)} s`)}  ${style.dim(st.note.slice(0, 60))}`
    })
    if (drawn) process.stdout.write(`\x1b[${drawn}A`)
    process.stdout.write(rows.map((r) => `\x1b[2K${r}`).join('\n') + '\n')
    drawn = rows.length
  }
  const timer = tty ? setInterval(() => (frame++, render()), 120) : null
  if (tty) render()
  return {
    update(id, s, note = '') {
      const st = state[id]
      if (s === 'running' && !st.t0) st.t0 = Date.now()
      if ((s === 'done' || s === 'error') && !st.t1) st.t1 = Date.now()
      Object.assign(st, { s, note })
      if (tty) render()
      else
        console.log(
          `[${STATES[s]}] ${platforms.find((p) => p.id === id).name}${note ? ` – ${note}` : ''}`,
        )
    },
    stop() {
      if (timer) clearInterval(timer)
      if (tty) render()
    },
  }
}

function wrap(text, width) {
  const out = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > width) {
      if (line) out.push(line)
      line = word
    } else line = (line + ' ' + word).trim()
  }
  if (line) out.push(line)
  return out
}

/** One bordered card per platform; sections only when they have content. */
export function renderCard(entry, width = Math.min(process.stdout.columns || 88, 96)) {
  const { result, sources, cached } = entry
  const inner = width - 4
  const ok = result.status === 'success'
  const top = `╭─ ${style.bold(result.platform)} ${ok ? style.green('●') : style.red('✕ Fehler')}${cached ? style.dim(' · Cache') : ''} `
  const out = [top]
  const row = (s = '') => out.push(`│ ${s}`)
  const section = (title, items) => {
    if (!items.length) return
    row(style.cyan(title))
    for (const item of items) wrap(item, inner - 2).forEach((l, i) => row(`${i ? '  ' : '• '}${l}`))
    row()
  }
  if (ok) {
    section('Trends', result.topTrends)
    section('Hooks', result.provenHooks)
    section('Pain Points', result.corePainPoints)
    row(style.cyan('Empfehlung'))
  }
  wrap(result.actionableRecommendation, inner).forEach((l) => row(ok ? l : style.red(l)))
  if (sources?.length)
    row(style.dim(`${sources.length} Quellen, z. B. ${sources[0]}`.slice(0, inner)))
  out.push('╰' + '─'.repeat(Math.max(10, inner)))
  return out.join('\n')
}
