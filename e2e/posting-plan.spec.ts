import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

async function openPlan(page: Page) {
  await openReady(page)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.65))
  const section = page.locator('section.posting-plan')
  await expect(section).toBeVisible({ timeout: 15_000 })
  await section.scrollIntoViewIfNeeded()
  return section
}

test('posting plan lists one upcoming, study-backed slot per platform with times', async ({
  page,
}) => {
  const section = await openPlan(page)
  const rows = section.locator('.pp-row')
  await expect(rows).toHaveCount(6)
  for (const row of await rows.all()) {
    await expect(row.locator('.pp-when strong')).toHaveText(
      /^(Heute|Morgen|Mo|Di|Mi|Do|Fr|Sa|So) \d{2}:\d{2}$/,
    )
    await expect(row.locator('.pp-support')).toContainText(/\d+ % deines Publikums/)
  }
  await expect(section.locator('.pp-note')).toContainText('Hacker News')
})

test('"Ansehen" moves the time machine to that slot', async ({ page }) => {
  const section = await openPlan(page)
  const before = await page.locator('.hero-score').getAttribute('data-timestamp')
  await section.locator('.pp-jump').first().click()
  await expect(page.locator('.hero-score')).not.toHaveAttribute('data-timestamp', before!)
  const after = await page.locator('.hero-score').getAttribute('data-timestamp')
  expect(new Date(after!).getUTCMinutes()).toBe(0)
})

test('posting plan passes axe and fits 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPlan(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
  const results = await new AxeBuilder({ page })
    .include('section.posting-plan')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
})
