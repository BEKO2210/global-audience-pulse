import { expect, type Page } from '@playwright/test'

export async function openReady(page: Page) {
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Jetzt posten oder warten/i })).toBeVisible()
  await expect(page.locator('.hero-score')).not.toContainText('—')
}

export async function expectNoInvalidNumbers(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/)
}
