import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  await expect(section.getByText('= 36 von 100')).toBeVisible()
  await expect(section.locator('.lr-contrib-legend')).toContainText('Berlin')
  await expect(section.locator('.lr-contrib-legend .lr-mono').first()).toHaveText('14')

  await expect(section.getByRole('heading', { name: 'Trend' })).toBeVisible()
  await expect(section.getByText('+9 in 3 h')).toBeVisible()
  await expect(section.locator('.lr-trend-svg')).toContainText('45')

  await expect(section.getByRole('heading', { name: 'Live-Signal' })).toBeVisible()
  await expect(section.getByText('-28 %')).toBeVisible()

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
