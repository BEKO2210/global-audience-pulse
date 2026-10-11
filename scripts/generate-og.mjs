// Social preview images (O-010) in the default style "Abflugtafel", rendered by Chromium with the site's own
// fonts so the preview looks exactly like the page. No live numbers: the curve is a stylised day, not data.
//   node scripts/generate-og.mjs   → public/og-image.png (de), public/og-image-en.png (en)
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const font = (pkg, file) => pathToFileURL(resolve('node_modules', pkg, 'files', file)).href

const TEXT = {
  de: {
    title: 'Global Audience Pulse',
    line: 'Beste Posting-Zeit weltweit, live',
    sub: 'Wann dein Publikum in Europa, Amerika und Asien wach ist – für Instagram, TikTok, YouTube & Co.',
    now: 'jetzt',
    best: 'bestes Fenster',
  },
  en: {
    title: 'Global Audience Pulse',
    line: 'Best time to post worldwide, live',
    sub: 'When your audience in Europe, the Americas and Asia is awake – for Instagram, TikTok, YouTube and more.',
    now: 'now',
    best: 'best window',
  },
}

// A calm, made-up 24-hour activity shape (illustration only).
const DAY = [
  30, 26, 22, 20, 21, 25, 32, 40, 47, 52, 55, 57, 59, 61, 63, 66, 70, 76, 83, 88, 84, 72, 55, 40,
]

function html(t) {
  const max = Math.max(...DAY)
  const bars = DAY.map((v, i) => {
    const peak = v === max
    return `<i style="height:${Math.round((v / max) * 100)}%;background:${peak ? '#f5a524' : `color-mix(in srgb,#eceae4 ${Math.round(18 + (v / max) * 40)}%,transparent)`}"></i>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Plex;src:url(${font('@fontsource/ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:Plex;src:url(${font('@fontsource/ibm-plex-sans', 'ibm-plex-sans-latin-500-normal.woff2')});font-weight:500}
@font-face{font-family:PlexC;src:url(${font('@fontsource/ibm-plex-sans-condensed', 'ibm-plex-sans-condensed-latin-600-normal.woff2')});font-weight:600}
@font-face{font-family:PlexM;src:url(${font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2')});font-weight:500}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#0f1113;color:#eceae4;font-family:Plex;display:grid;grid-template-columns:1fr 1fr;gap:64px;padding:72px 80px;align-items:center}
.brand{display:flex;align-items:center;gap:20px;font:500 26px/1 Plex;color:#eceae4}
.brand svg{width:64px;height:64px}
h1{font:600 64px/1.05 PlexC;letter-spacing:-.01em;margin-top:48px}
p{margin-top:24px;font:400 24px/1.45 Plex;color:#a3a7ad;max-width:30ch}
.board{align-self:center;border:1px solid #3a3f45;padding:28px 28px 20px}
.bars{display:flex;align-items:flex-end;gap:5px;height:240px;border-bottom:1px solid #4a5057}
.bars i{flex:1;display:block}
.axis{display:flex;justify-content:space-between;margin-top:12px;font:500 16px/1 PlexM;color:#a3a7ad}
.legend{display:flex;gap:24px;margin-top:20px;font:500 16px/1 Plex;color:#a3a7ad}
.legend b{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px}
</style></head><body>
<div>
  <div class="brand"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1a1d21"/><g fill="none" stroke="#eceae4"><circle cx="32" cy="32" r="20" stroke-width="3"/><ellipse cx="32" cy="32" rx="9" ry="20" stroke-width="1.6"/><path d="M13 32h38" stroke-width="2"/></g><path d="M7 35h13l5-10 7 18 6-13 4 5h15" fill="none" stroke="#f5a524" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>${t.title}</div>
  <h1>${t.line}</h1>
  <p>${t.sub}</p>
</div>
<div class="board">
  <div class="bars">${bars}</div>
  <div class="axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
  <div class="legend"><span><b style="background:#f5a524"></b>${t.best}</span><span><b style="background:color-mix(in srgb,#eceae4 40%,transparent)"></b>24 h</span></div>
</div>
</body></html>`
}

const dir = mkdtempSync(join(tmpdir(), 'gap-og-'))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const [locale, out] of [
  ['de', 'public/og-image.png'],
  ['en', 'public/og-image-en.png'],
]) {
  // a file:// page may load the local font files; setContent (about:blank) may not
  const file = join(dir, `og-${locale}.html`)
  writeFileSync(file, html(TEXT[locale]))
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out })
  console.log(out)
}
await browser.close()
