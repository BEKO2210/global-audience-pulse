import { expect, test } from '@playwright/test'
import { expectNoInvalidNumbers, openReady } from './helpers'

const freshSnapshot = {
  generatedAt: new Date().toISOString(),
  sources: {
    worldBank: { fetchedAt: new Date().toISOString(), urls: ['https://api.worldbank.org/'] },
    wikimedia: { fetchedAt: new Date().toISOString(), urls: ['https://wikimedia.org/'] },
  },
  weights: {
    reach: {
      us_east: 1,
      us_west: 1,
      eu_central: 1,
      eu_uk: 1,
      latam: 1,
      mena: 1,
      india: 1,
      east_asia: 1,
    },
    value: {
      us_east: 1,
      us_west: 1,
      eu_central: 1,
      eu_uk: 1,
      latam: 1,
      mena: 1,
      india: 1,
      east_asia: 1,
    },
  },
  weightingMode: 'value',
  profiles: {},
  dataYears: { 'DEU.population': 2025 },
}

test('deployed snapshot leaves loading state and renders only finite values', async ({ page }) => {
  await openReady(page)
  await expect(page.getByTestId('data-state')).not.toContainText('Daten werden geladen')
  await expectNoInvalidNumbers(page)
})

test('accepts a fresh snapshot and live Wikimedia samples', async ({ page }) => {
  await page.route('**/data/snapshot.json*', (route) => route.fulfill({ json: freshSnapshot }))
  await page.route('https://wikimedia.org/**', (route) =>
    route.fulfill({
      json: {
        items: [
          { timestamp: '2026100712', views: 100 },
          { timestamp: '2026100812', views: 110 },
          { timestamp: '2026100912', views: 120 },
        ],
      },
    }),
  )
  await openReady(page)
  await expect(page.getByTestId('data-state')).toContainText('Aktuelles Publikumsradar')
  await expect(page.locator('.badge.measured').first()).toContainText('Live')
  await expectNoInvalidNumbers(page)
})

test('labels runtime fallback honestly when Wikimedia is unavailable', async ({ page }) => {
  await page.route('**/data/snapshot.json*', (route) => route.fulfill({ json: freshSnapshot }))
  await page.route('https://wikimedia.org/**', (route) => route.abort('failed'))
  await openReady(page)
  // Compact rows (mobile) and cards (desktop) each render the label; assert the one the user sees.
  await expect(page.getByText('Profil (Snapshot)').filter({ visible: true }).first()).toBeVisible()
  await expectNoInvalidNumbers(page)
})

test('uses explicit offline copy when the snapshot fails', async ({ page }) => {
  await page.route('**/data/snapshot.json*', (route) => route.abort('failed'))
  await page.route('https://wikimedia.org/**', (route) => route.abort('failed'))
  await openReady(page)
  await expect(page.getByTestId('data-state')).toContainText('Beispieldaten · Offline-Modell')
  await expect(page.locator('body')).toContainText('Gewichtungsdaten sind derzeit nicht verfügbar')
  await expectNoInvalidNumbers(page)
})
