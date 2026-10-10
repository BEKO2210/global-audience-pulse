import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const analysisV2 = JSON.parse(
  readFileSync(join(fixtureDir, 'fixtures', 'analysis-v2.json'), 'utf8'),
) as Record<string, unknown>

const reportV1 = (hoursAgo: number) => ({
  generatedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
  model: 'gemma4:12b-it-qat',
  source: 'llm',
  report: {
    schlagzeile: 'Ruhephase mit Gesamtwert 35',
    empfehlung: 'Später posten. Bestes Fenster 20:00–21:30 Uhr.',
    analyse: 'Mumbai trägt den Wert.',
    punkte: ['Mumbai: Score 77', 'New York: Nachtruhe', 'Berlin: Aktiver Tag'],
  },
})

function withFreshTimestamp(body: Record<string, unknown>, hoursAgo = 0.2) {
  return {
    ...body,
    generatedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
  }
}

async function serve(page: Page, body: unknown) {
  ;(page as Page & { __reportServed?: boolean }).__reportServed = true
  await page.route('https://raw.githubusercontent.com/**/analysis.json*', (route) =>
    route.fulfill({ json: body }),
  )
}

test('renders visual blocks from the v2 fixture', async ({ page }) => {
  await serve(page, withFreshTimestamp(analysisV2))
  await openReady(page)
  const section = page.locator('.live-report')

  await expect(
    section.getByRole('heading', {
      name: 'Aktueller Gesamtwert von 36 Punkten in der Ruhephase',
    }),
  ).toBeVisible()
  await expect(section).toContainText(
    'Später posten. Bestes Fenster liegt zwischen 20:00 und 21:30 Uhr.',
  )

  await expect(section.getByRole('heading', { name: 'Wer trägt den Wert' })).toBeVisible()
  await expect(section.locator('.lr-contrib-bar')).toBeVisible()
  await expect(section.getByText('Berlin trägt 14 von 36 Punkten')).toBeVisible()
  await expect(section.locator('.lr-contrib-legend')).toContainText('Berlin')
  await expect(section.locator('.lr-contrib-legend .lr-mono').first()).toHaveText('14')

  const segments = section.locator('.lr-contrib-segment')
  const rowBars = section.locator('.lr-contrib-row-bar')
  const rows = section.locator('.lr-contrib-row')
  await expect(segments).toHaveCount(8)
  await expect(rowBars).toHaveCount(8)

  // Segment-Farbe = Zeilen-Farbe
  for (let i = 0; i < 8; i++) {
    const segColor = await segments.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor)
    const rowColor = await rowBars.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(segColor).toBe(rowColor)
  }

  // Segmente >= 8 % zeigen die Flagge (5 von 8 Regionen im Fixture)
  await expect(section.locator('.lr-contrib-segment img')).toHaveCount(5)

  // Hover hebt das Paar (Segment + Zeile) gemeinsam hervor
  await segments.first().hover()
  await expect(segments.first()).toHaveClass(/is-active/)
  await expect(rows.first()).toHaveClass(/is-active/)

  await expect(section.getByRole('heading', { name: 'Trend' })).toBeVisible()
  await expect(section.getByText('+9 in 3 h')).toBeVisible()
  await expect(section.locator('.lr-trend-svg')).toContainText('45')

  // Schwellenlinien aus STATUS_LEVELS vorhanden
  await expect(section.locator('.lr-trend-threshold')).toHaveCount(2)
  await expect(section.getByText('Im Aufbau ab 42')).toBeVisible()
  await expect(section.getByText('Gutes Momentum ab 62')).toBeVisible()

  // Werte an den Punkten
  const scores = await section.locator('.lr-trend-score').allTextContents()
  expect(scores).toEqual(['36', '39', '42', '45'])

  await expect(section.getByRole('heading', { name: 'Live-Signal' })).toBeVisible()
  await expect(section.locator('.lr-live-head-quiet')).toHaveText('ruhiger')
  await expect(section.locator('.lr-live-head-mid')).toHaveText('üblich')
  await expect(section.locator('.lr-live-head-active')).toHaveText('aktiver')

  // Live-Signal nach |Abweichung| sortiert
  const signalCities = await section.locator('.lr-live-row .lr-live-meta span').allTextContents()
  expect(signalCities).toEqual(['Berlin', 'São Paulo', 'Dubai', 'Mumbai', 'Tokio'])

  // Bei |Abweichung| > 15 % Hinweis „auffällig“ (Berlin: -28 %)
  await expect(section.locator('.lr-live-badge')).toHaveText('auffällig')

  // Farbcodierung nach Richtung
  await expect(section.locator('.lr-live-val-quiet').first()).toContainText('-28 %')
  await expect(section.locator('.lr-live-val-active').first()).toContainText('+8 %')

  // Dickere Balken (>= 10 px)
  const trackHeight = await section
    .locator('.lr-live-track')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).height))
  expect(trackHeight).toBeGreaterThanOrEqual(10)

  await expect(section.getByRole('heading', { name: 'Zielgruppen' })).toBeVisible()
  await expect(section.locator('.lr-audience-tile')).toHaveCount(5)
  await expect(section.getByText('DACH & Europa')).toBeVisible()
  await expect(section.getByText('Später posten zwischen 19:45 und 21:15 Uhr')).toBeVisible()

  await expect(section.getByText('Ganze Analyse lesen')).toBeVisible()
  // EU AI Act Art. 50: visible disclosure at first exposure + machine-readable marking.
  await expect(section.locator('.ai-badge')).toHaveText('Automatische AI-Analyse')
  await expect(section).toHaveAttribute('data-ai-generated', 'true')
  await expect(section).toHaveAttribute('data-digital-source-type', /trainedAlgorithmicMedia/)
  await expect(page.locator('.report-teaser-label')).toContainText('Automatische AI-Analyse')
  await expect(section).not.toHaveClass(/is-stale/)
})

test('marks a report older than three hours as paused', async ({ page }) => {
  await serve(page, withFreshTimestamp(analysisV2, 5))
  await openReady(page)
  await expect(page.locator('.live-report')).toHaveClass(/is-stale/)
  await expect(page.locator('.live-report-time')).toContainText('Pausiert seit')
})

test('hides reports older than a day and still renders v1 text-only payloads', async ({ page }) => {
  await serve(page, reportV1(30))
  await openReady(page)
  await expect(page.locator('.live-report')).toHaveCount(0)

  await serve(page, reportV1(0.2))
  await page.reload()
  await expect(page.locator('.live-report')).toBeVisible()
  await expect(page.locator('.lr-contrib-bar')).toHaveCount(0)
  await expect(page.locator('.live-report li')).toHaveCount(3)
})

for (const theme of ['light', 'dark'] as const) {
  test(`visual report has no serious axe violations incl. WCAG 2.2 (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem('gap-theme', value), theme)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await serve(page, withFreshTimestamp({ ...analysisV2, source: 'llm' }))
    await openReady(page)
    const section = page.locator('.live-report')
    await section.scrollIntoViewIfNeeded()
    const results = await new AxeBuilder({ page })
      .include('.live-report')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
    ).toEqual([])
  })
}
