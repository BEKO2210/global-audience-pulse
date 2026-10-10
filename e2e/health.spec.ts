import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(fixtureDir, 'fixtures', 'health-v2.json'), 'utf8'),
) as {
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
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.3))
  const section = page.locator('section.ai-pipeline')
  await expect(section).toBeVisible({ timeout: 15_000 })
  await section.scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'So entsteht der Lagebericht' })).toBeVisible()
  return section
}

test('shows the pipeline from real telemetry without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await serveHealth(page, 24)
  const card = await openHealth(page)

  await expect(card.locator('.aip-status')).toHaveText('Aktiv')
  await expect(card).toContainText(/Letzter Bericht vor 2[4-5] Min/)
  await expect(card.locator('.aip-kpis li')).toHaveCount(6)
  await expect(card.locator('.aip-kpis')).toContainText('92 %')
  await expect(card.locator('.aip-node')).toHaveCount(5)
  await expect(card.locator('.aip-node').nth(3)).toContainText('6 abgelehnt')
  await expect(card.locator('.aip-node').nth(1)).toContainText('gemma4')
  await expect(card.locator('.aip-matrix-row:not(.aip-matrix-axis)')).toHaveCount(5)
  await expect(card.locator('.aip-matrix-row').first().locator('i')).toHaveCount(12)
  await expect(card.locator('.aip-bar')).toHaveCount(12)
  await expect(card.locator('.aip-log li')).toHaveCount(6)
  await expect(card.locator('.aip-log li').first()).toContainText('veröffentlicht')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('shows paused and no flow tokens when the last success is old', async ({ page }) => {
  await serveHealth(page, 240)
  const card = await openHealth(page)
  await expect(card.locator('.aip-status')).toHaveText('Pausiert')
  await expect(card.locator('.aip-link i')).toHaveCount(0)
})

for (const theme of ['light', 'dark'] as const) {
  test(`pipeline has no serious axe violations in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('gap-theme', value), theme)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await serveHealth(page, 24)
    const card = await openHealth(page)
    const results = await new AxeBuilder({ page })
      .include('section.ai-pipeline')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
      JSON.stringify(results.violations.map((v) => v.nodes[0]?.failureSummary)),
    ).toEqual([])
    await expect(card).toBeVisible()
  })
}
