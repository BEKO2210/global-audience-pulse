import { expect, type BrowserContext, type Page } from '@playwright/test'

export async function openReady(page: Page) {
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
