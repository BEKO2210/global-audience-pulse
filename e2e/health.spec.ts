import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(join(fixtureDir, 'fixtures', 'health.json'), 'utf8')) as {
  updatedAt: string
  runs: { startedAt: string; endedAt: string }[]
  summary24h: { lastSuccess: string; nextExpectedAt: string }
}

function relativeFixture(lastSuccessMinutes: number) {
  const now = Date.now()
  return {
    ...fixture,
    updatedAt: new Date(now - 5 * 60_000).toISOString(),
    runs: fixture.runs.map((run, index) => ({
      ...run,
      startedAt: new Date(now - (fixture.runs.length - index) * 60 * 60_000).toISOString(),
      endedAt: new Date(now - (fixture.runs.length - index) * 60 * 60_000 + 42_000).toISOString(),
    })),
    summary24h: {
      ...fixture.summary24h,
      lastSuccess: new Date(now - lastSuccessMinutes * 60_000).toISOString(),
      nextExpectedAt: new Date(Math.ceil(now / 3_600_000) * 3_600_000 + 2 * 60_000).toISOString(),
    },
  }
}

async function serveHealth(page: Page, lastSuccessMinutes: number) {
  ;(page as Page & { __healthServed?: boolean }).__healthServed = true
  await page.route('https://raw.githubusercontent.com/**/health.json*', (route) =>
    route.fulfill({ json: relativeFixture(lastSuccessMinutes) }),
  )
}

async function openHealth(page: Page) {
  await openReady(page)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'KI-Systemstatus' })).toBeVisible()
  return page.locator('.report-health')
}

test('shows active health and all summary values without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await serveHealth(page, 24)
  const card = await openHealth(page)

  await expect(card.getByText('Aktiv', { exact: true })).toBeVisible()
  await expect(card).toContainText(/Letzter Bericht vor 2[4-5] Min/)
  await expect(card).toContainText('83 %')
  await expect(card).toContainText('20 %')
  await expect(card).toContainText('42 s')
  await expect(card.getByText('Zahlen').locator('..')).toContainText('4')
  await expect(card.getByText('Form').locator('..')).toContainText('2')
  await expect(card.getByText('Prüfer').locator('..')).toContainText('3')
  await expect(card.locator('.health-timeline-boxes i')).toHaveCount(6)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('shows paused when the last success is at least three hours old', async ({ page }) => {
  await serveHealth(page, 240)
  const card = await openHealth(page)
  await expect(card.getByText('Pausiert', { exact: true })).toBeVisible()
})

for (const theme of ['light', 'dark'] as const) {
  test(`health card has no serious axe violations in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('gap-theme', value), theme)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await serveHealth(page, 24)
    const card = await openHealth(page)
    const results = await new AxeBuilder({ page })
      .include('.report-health')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
    ).toEqual([])
    await expect(card).toBeVisible()
  })
}
