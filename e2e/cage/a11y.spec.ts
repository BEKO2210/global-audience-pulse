// Test cage – accessibility and language in every style × theme: axe (WCAG 2.2 AA, serious/critical) on the whole
// page with a region detail open, and no German left on the English page.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { STYLES, THEMES, openCaged } from './probe'

for (const style of STYLES)
  for (const theme of THEMES)
    test(`cage: axe ${style} ${theme}`, async ({ page }) => {
      await openCaged(page, style, theme)
      await page.locator('.region-card .card-main').first().click()
      await page.waitForTimeout(300)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      const serious = results.violations
        .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
      expect(serious).toEqual([])
    })

// German function words and letters that never belong on the English page (city names here have no umlauts)
const GERMAN = /[äöüßÄÖÜ]|\b(und|oder|der|die|das|nicht|jetzt|Uhr|Stunden?|heute|morgen|Woche)\b/

test('cage: the English page has no German left', async ({ page }) => {
  await openCaged(page, 'praezision', 'light', 'en')
  await page.locator('.region-card .card-main').first().click()
  const lines = (await page.locator('body').innerText())
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && GERMAN.test(line))
  expect(lines).toEqual([])
})
