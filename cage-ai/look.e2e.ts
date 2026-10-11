// Model bench for the AI eyes: narrow questions on a clean page and on pages with one planted layout defect.
// A good judge says "holds" on the clean ones and "fails" on every defect. Results go to cage-ai/results/.
import { appendFileSync, mkdirSync } from 'node:fs'
import { test } from '@e2e-dev/web'

const MODEL = process.env.E2E_MODEL ?? 'qwen3.5:9b-agent32k'
// One narrow question per defect class: small judges miss defects inside one long combined claim (round 1).
const CHECKS: Record<string, string> = {
  overlap:
    'No text on the screen is drawn on top of other text or of another element; every word stands free.',
  clipped:
    'No word is cut off: every heading and label is shown completely, with no letters hidden at a box edge.',
  bar: 'The fixed bottom time bar (clock, curve, "24 h" switch, score) is fully visible, with nothing of it below the screen edge.',
  readable:
    'Every heading and paragraph is clearly readable: its text colour stands out against its background.',
}
const SCROLL_NOTE =
  ' Page content that simply continues underneath the fixed bottom time bar is scrolled, not cut off, and does not count.'

interface Case {
  id: string
  style: string
  theme: 'light' | 'dark'
  css: string
  expect: 'holds' | 'fails'
}
const CASES: Case[] = [
  { id: 'clean-praezision-light', style: 'praezision', theme: 'light', css: '', expect: 'holds' },
  { id: 'clean-archiv-dark', style: 'archiv', theme: 'dark', css: '', expect: 'holds' },
  { id: 'clean-tafel-dark', style: 'tafel', theme: 'dark', css: '', expect: 'holds' },
  {
    id: 'overlap-headline',
    style: 'praezision',
    theme: 'light',
    css: '.hero h1{margin-bottom:-72px!important;position:relative;z-index:3}',
    expect: 'fails',
  },
  {
    id: 'bar-off-screen',
    style: 'praezision',
    theme: 'light',
    css: '.mobile-bar{transform:translateY(60%)!important}',
    expect: 'fails',
  },
  {
    id: 'clipped-headline',
    style: 'tafel',
    theme: 'dark',
    css: '.hero h1{white-space:nowrap!important;overflow:hidden!important;max-width:170px!important}',
    expect: 'fails',
  },
  {
    id: 'unreadable-text',
    style: 'archiv',
    theme: 'light',
    css: '.hero h1,.hero p{color:var(--paper-2)!important}',
    expect: 'fails',
  },
]

for (const c of CASES)
  test(`look: ${c.id}`, async ({ app, agent, browser }) => {
    // never count bench runs in the real analytics; the report stays empty
    await browser.route('https://stats.it-handwerk-stuttgart.de/**', (r) =>
      r.fulfill({ status: 202, body: '' }),
    )
    await browser.route('https://raw.githubusercontent.com/**', (r) =>
      r.fulfill({ status: 200, json: {} }),
    )
    await app.open('/')
    await browser.evaluate(
      ([s, t]) => {
        localStorage.setItem('gap-style', s)
        localStorage.setItem('gap-theme', t)
        localStorage.setItem('gap-lang', 'de')
      },
      [c.style, c.theme],
    )
    await app.open('/')
    await browser.evaluate(async (css) => {
      await document.fonts.ready
      const tag = document.createElement('style')
      tag.textContent = css
      document.head.append(tag)
      await new Promise((r) => setTimeout(r, 600))
    }, c.css)
    const started = Date.now()
    const checks: Record<string, string> = {}
    const notes: string[] = []
    for (const [key, claim] of Object.entries(CHECKS)) {
      try {
        await agent.assert(claim + SCROLL_NOTE, { vision: true })
        checks[key] = 'holds'
      } catch (error) {
        const e = error as { code?: string; message?: string }
        checks[key] = e.code === 'ASSERTION_FAILED' ? 'fails' : (e.code ?? 'error')
        notes.push(`${key}: ${(e.message ?? '').slice(0, 160)}`)
      }
    }
    const values = Object.values(checks)
    const verdict = values.includes('fails')
      ? 'fails'
      : values.every((v) => v === 'holds')
        ? 'holds'
        : (values.find((v) => v !== 'holds') ?? 'error')
    mkdirSync('cage-ai/results', { recursive: true })
    appendFileSync(
      'cage-ai/results/bench.jsonl',
      JSON.stringify({
        round: 2,
        model: MODEL,
        case: c.id,
        expect: c.expect,
        verdict,
        checks,
        ms: Date.now() - started,
        note: notes.join(' | '),
      }) + '\n',
    )
  })
