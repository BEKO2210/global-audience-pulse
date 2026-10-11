// Test cage: one page probe shared by the cage specs. It loads the app in a given style × theme × language,
// mounts every deferred section, and measures the rendered page against the design rules (type scale, weights,
// spacing grid, caps, overflow, colour grammar). The specs turn the numbers into hard assertions.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { openReady } from '../helpers'

export const STYLES = ['tafel', 'atlas', 'praezision', 'archiv'] as const
export const THEMES = ['light', 'dark'] as const
export type Style = (typeof STYLES)[number]
export type Theme = (typeof THEMES)[number]

const report = JSON.parse(
  readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'analysis-v2.json'), 'utf8'),
) as Record<string, unknown>

// the English edition the analysis job adds (T-015), so the English page is fully English
const reportEn = {
  schlagzeile: 'Overall score of 36 points in a quiet phase',
  empfehlung: 'Post later. The best window is between 20:00 and 21:30.',
  analyse: 'Central Europe contributes the most with 14 points.',
  punkte: ['Central Europe contributes 14 points', 'The score rises to 45', 'Berlin: -28%'],
  zielgruppen: (report.report as { zielgruppen: { name: string }[] }).zielgruppen.map((z) => ({
    name: z.name,
    urteil: 'Post later, between 20:00 and 21:30',
  })),
}

/** Open the app with the full live report served, in one style/theme/language, with every section mounted. */
export async function openCaged(page: Page, style: Style, theme: Theme, lang: 'de' | 'en' = 'de') {
  ;(page as Page & { __reportServed?: boolean }).__reportServed = true
  await page.route('https://raw.githubusercontent.com/**/analysis.json*', (route) =>
    route.fulfill({
      json: {
        ...report,
        ...(lang === 'en' ? { reportEn, sourceEn: 'llm' } : {}),
        generatedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
    }),
  )
  await page.addInitScript(
    ([s, t, l]) => {
      localStorage.setItem('gap-style', s!)
      localStorage.setItem('gap-theme', t!)
      localStorage.setItem('gap-lang', l!)
    },
    [style, theme, lang],
  )
  await openReady(page)
  // deferred sections mount when they come near the viewport: walk the page once
  await page.evaluate(async () => {
    const step = Math.max(400, Math.round(innerHeight * 0.8))
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => document.fonts.ready)
}

/** The design's type scale (styles.css --text-*) – every visible text sits on one of these steps. */
export const TYPE_SCALE = [12, 14, 16, 20, 24, 32, 40, 56]
/** The one deliberate exception: the big live score digits (hero, region detail sheet), at the display sizes. */
export const DISPLAY_NUMBERS = '.hero-score, .detail-score'
/** --text-display / --text-display-xl in styles.css */
export const DISPLAY_SCALE = [88, 120]
export const WEIGHTS = [400, 500, 600]

export interface Finding {
  rule: string
  where: string
  value: string
}

export interface Probe {
  fontSizes: number[]
  displaySizes: number[]
  weights: number[]
  findings: Finding[]
  accent: string
}

/**
 * Measure the rendered page. Runs in the browser; returns every rule break with a short CSS path, so a failing
 * cage test says exactly which element broke which rule.
 */
export async function probe(page: Page): Promise<Probe> {
  return page.evaluate((DISPLAY_NUMBERS) => {
    const findings: { rule: string; where: string; value: string }[] = []
    const path = (el: Element) => {
      const parts: string[] = []
      let node: Element | null = el
      while (node && parts.length < 4 && node !== document.body) {
        const cls = [...node.classList].slice(0, 2).join('.')
        parts.unshift(node.tagName.toLowerCase() + (cls ? '.' + cls : ''))
        node = node.parentElement
      }
      return parts.join(' > ')
    }
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return false
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') return false
      for (let n: Element | null = el; n; n = n.parentElement) {
        const s = getComputedStyle(n)
        // screen-reader-only content (clipped to nothing) is not part of the visual design
        if (s.opacity === '0' || s.display === 'none' || s.clipPath === 'inset(50%)') return false
      }
      return true
    }
    const ownText = (el: Element) =>
      [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim()

    const sizes = new Set<number>()
    const displaySizes = new Set<number>()
    const weights = new Set<number>()
    const all = [...document.querySelectorAll('body *')].filter(
      (el) => !el.closest('script, style, noscript, [aria-hidden="true"] title'),
    )
    for (const el of all) {
      const text = ownText(el)
      if (!text || !visible(el)) continue
      const style = getComputedStyle(el)
      // SVG text is set in viewBox units: measure what reaches the screen
      const scale = el instanceof SVGGraphicsElement ? (el.getScreenCTM()?.a ?? 1) : 1
      const size = Math.round(parseFloat(style.fontSize) * scale * 10) / 10
      const display = Boolean(el.closest(DISPLAY_NUMBERS))
      if (!display) sizes.add(size)
      else displaySizes.add(size)
      weights.add(Number(style.fontWeight))
      if (size < 12)
        findings.push({
          rule: 'text-under-12px',
          where: path(el),
          value: `${size}px "${text.slice(0, 30)}"`,
        })
      if (style.textTransform === 'uppercase')
        findings.push({ rule: 'all-caps', where: path(el), value: text.slice(0, 30) })
    }

    // spacing grid: padding, margin and gaps sit on the 4 px grid (hairlines 1–2 px allowed)
    const onGrid = (v: string) => {
      const n = parseFloat(v)
      if (!Number.isFinite(n) || n === 0) return true
      const a = Math.abs(n)
      return a <= 2 || Math.abs(a / 4 - Math.round(a / 4)) < 0.01
    }
    const SPACING = [
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'rowGap',
      'columnGap',
    ] as const
    for (const el of all) {
      if (!(el instanceof HTMLElement) || !visible(el)) continue
      const style = getComputedStyle(el)
      for (const prop of SPACING) {
        const v = style[prop]
        if (v && v !== 'normal' && v.endsWith('px') && !onGrid(v))
          findings.push({ rule: 'spacing-off-grid', where: path(el), value: `${prop} ${v}` })
      }
    }

    // no horizontal page scroll
    const overflow = document.documentElement.scrollWidth - innerWidth
    if (overflow > 0)
      findings.push({ rule: 'page-overflow-x', where: 'html', value: `${overflow}px` })

    // colour grammar: a region (pin, label, bar, segment, card, sparkline) never wears the accent
    const probeEl = document.createElement('i')
    probeEl.style.color = 'var(--accent)'
    document.body.append(probeEl)
    const accent = getComputedStyle(probeEl).color
    probeEl.style.color = 'var(--accent-ink)'
    const accentInk = getComputedStyle(probeEl).color
    probeEl.remove()
    const accents = new Set([accent, accentInk])
    const REGION_SCOPES = [
      '[data-region]',
      '.region-card .card-main',
      '.lr-contrib-bar',
      '.lr-contrib-row',
      '.sparkline',
      '.card-detail .card-facts',
    ]
    for (const el of document.querySelectorAll(
      REGION_SCOPES.map((s) => `${s}, ${s} *`).join(','),
    )) {
      if (!visible(el)) continue
      const s = getComputedStyle(el)
      const paint: [string, string][] = [
        ['fill', s.fill],
        ['stroke', s.stroke],
        ['background-color', s.backgroundColor],
        ['color', ownText(el) ? s.color : ''],
      ]
      for (const [prop, value] of paint)
        if (value && accents.has(value))
          findings.push({ rule: 'region-in-accent', where: path(el), value: `${prop} ${value}` })
    }

    // chart captions stay on one line (a wrapping caption shifts everything below on a phone)
    for (const el of document.querySelectorAll('.chart-caption')) {
      if (!visible(el)) continue
      const s = getComputedStyle(el)
      const line = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4
      const height =
        el.getBoundingClientRect().height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)
      if (height > line * 1.5)
        findings.push({ rule: 'caption-wraps', where: path(el), value: `${Math.round(height)}px` })
    }

    return {
      fontSizes: [...sizes].sort((a, b) => a - b),
      displaySizes: [...displaySizes].sort((a, b) => a - b),
      weights: [...weights].sort((a, b) => a - b),
      findings,
      accent,
    }
  }, DISPLAY_NUMBERS)
}
