import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

const dir = dirname(fileURLToPath(import.meta.url))
const analysis = JSON.parse(readFileSync(join(dir, 'fixtures', 'analysis-v2.json'), 'utf8'))
const snapshot = JSON.parse(
  readFileSync(join(dir, '..', 'public', 'data', 'snapshot.json'), 'utf8'),
)
const berlinToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(
  new Date(),
)

async function serve(page: Page) {
  ;(page as Page & { __reportServed?: boolean }).__reportServed = true
  await page.route('https://raw.githubusercontent.com/**/analysis.json*', (route) =>
    route.fulfill({
      json: {
        ...analysis,
        generatedAt: new Date().toISOString(),
        facts: {
          ...analysis.facts,
          feiertage: [
            {
              ort: 'Berlin',
              flagge: 'de',
              wann: 'morgen',
              datum: '2026-10-03',
              name: 'Tag der Deutschen Einheit',
            },
          ],
        },
      },
    }),
  )
  await page.route('**/data/snapshot.json*', (route) =>
    route.fulfill({
      json: {
        ...snapshot,
        holidays: {
          ...snapshot.holidays,
          eu_central: [{ date: berlinToday, name: 'Testfeiertag' }],
        },
      },
    }),
  )
}

test('report shows holiday chips from the facts', async ({ page }) => {
  await serve(page)
  await openReady(page)
  const chip = page.locator('.lr-holiday')
  await chip.first().scrollIntoViewIfNeeded()
  await expect(chip).toHaveText('Feiertag morgen in Berlin: Tag der Deutschen Einheit')
})

test('region card marks a holiday on the region’s local date', async ({ page }) => {
  await serve(page)
  await openReady(page)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45))
  const card = page.locator('.region-card').filter({ hasText: 'Berlin' }).first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  await expect(card.locator('.holiday-mark')).toHaveText(/Feiertag/)
  await card.locator('.card-main').click()
  await expect(page.locator('.card-detail .holiday-note')).toContainText('Testfeiertag')
})
