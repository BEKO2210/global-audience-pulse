import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

const dir = dirname(fileURLToPath(import.meta.url))
const weekly = JSON.parse(readFileSync(join(dir, 'fixtures', 'weekly-v1.json'), 'utf8'))

async function serve(page: Page, daysAgo = 1) {
  ;(page as Page & { __weeklyServed?: boolean }).__weeklyServed = true
  await page.route('https://raw.githubusercontent.com/**/weekly.json*', (route) =>
    route.fulfill({
      json: { ...weekly, generatedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString() },
    }),
  )
}

async function scrollToReview(page: Page) {
  for (let y = 0; y < 20_000; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(30)
  }
  const section = page.locator('section.weekly-review')
  await expect(section).toBeVisible()
  await section.scrollIntoViewIfNeeded()
  return section
}

test('weekly review shows headline, seven daily bars and best hours (T-014)', async ({ page }) => {
  await serve(page)
  await openReady(page)
  const section = await scrollToReview(page)
  await expect(section.locator('#weekly-title')).toHaveText(weekly.report.schlagzeile)
  await expect(section.locator('.wr-bar')).toHaveCount(Math.min(7, weekly.facts.tage.length))
  await expect(section.locator('.wr-bar.is-top')).not.toHaveCount(0)
  await expect(section.locator('.wr-hours li').first()).toContainText(
    weekly.facts.besteStunden[0].stunde,
  )
  await expect(section.locator('.ai-badge')).toHaveText('Automatische AI-Analyse')
  await page.waitForTimeout(700)
  const results = await new AxeBuilder({ page })
    .include('section.weekly-review')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
  ).toEqual([])
})

test.describe('English', () => {
  test.use({ locale: 'en-US' })
  test('uses the English edition', async ({ page }) => {
    await serve(page)
    await openReady(page)
    const section = await scrollToReview(page)
    await expect(section.locator('#weekly-title')).toHaveText(weekly.reportEn.schlagzeile)
    await expect(section.locator('#weekly-title')).toHaveAttribute('lang', 'en')
  })
})

test('an old review is not shown', async ({ page }) => {
  await serve(page, 9)
  await openReady(page)
  for (let y = 0; y < 20_000; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(30)
  }
  await expect(page.locator('section.weekly-review')).toHaveCount(0)
})
