import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

const report = (hoursAgo: number) => ({
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

async function serve(page: Page, body: unknown) {
  ;(page as Page & { __reportServed?: boolean }).__reportServed = true
  await page.route('https://raw.githubusercontent.com/**/analysis.json*', (route) =>
    route.fulfill({ json: body }),
  )
}

test('shows a fresh local-model report with its provenance', async ({ page }) => {
  await serve(page, report(0.2))
  await openReady(page)
  const section = page.locator('.live-report')
  await expect(section.getByRole('heading', { name: 'Ruhephase mit Gesamtwert 35' })).toBeVisible()
  await expect(section).toContainText('lokalen KI-Modell (gemma4:12b-it-qat)')
  await expect(section.locator('li')).toHaveCount(3)
  await expect(section).not.toHaveClass(/is-stale/)
})

test('marks a report older than three hours as paused', async ({ page }) => {
  await serve(page, report(5))
  await openReady(page)
  await expect(page.locator('.live-report')).toHaveClass(/is-stale/)
  await expect(page.locator('.live-report-time')).toContainText('Pausiert seit')
})

test('hides reports older than a day and survives a missing file', async ({ page }) => {
  await serve(page, report(30))
  await openReady(page)
  await expect(page.locator('.live-report')).toHaveCount(0)
})
