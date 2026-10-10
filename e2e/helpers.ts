import { expect, type BrowserContext, type Page } from '@playwright/test'

export async function openReady(page: Page, interceptAnalytics = true) {
  if (interceptAnalytics) {
    await page.route('https://stats.it-handwerk-stuttgart.de/**', (route) =>
      route.fulfill({ status: 202, body: '' }),
    )
  }
  // The Lagebericht lives on the live-analysis branch; tests stay offline unless a spec serves one.
  await page.route('https://raw.githubusercontent.com/**/analysis.json*', (route) =>
    (page as Page & { __reportServed?: boolean }).__reportServed
      ? route.fallback()
      : route.fulfill({ status: 200, json: {} }),
  )
  await page.route('https://raw.githubusercontent.com/**/health.json*', (route) =>
    (page as Page & { __healthServed?: boolean }).__healthServed
      ? route.fallback()
      : route.fulfill({ status: 404, body: '' }),
  )
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Jetzt posten oder warten/i })).toBeVisible()
  await expect(page.locator('.hero-score')).not.toContainText('—')
}

export async function expectNoInvalidNumbers(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/)
}

/**
 * Chromium supports clipboard permissions; WebKit does not, so give it an in-memory
 * clipboard that behaves like the async Clipboard API for the app and the test.
 */
export async function allowClipboard(page: Page, context: BrowserContext, browserName: string) {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    return
  }
  await page.addInitScript(() => {
    let stored = ''
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          stored = text
        },
        readText: async () => stored,
      },
    })
  })
}
