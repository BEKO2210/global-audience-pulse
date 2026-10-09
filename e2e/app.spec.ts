import { expect, test } from '@playwright/test'

test('lädt fehlerfrei, bleibt im Viewport und reagiert auf Scrubbing', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Ist deine Welt/i })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
  const before = await page.locator('.hero-score').textContent()
  const slider = page.getByRole('slider', { name: 'Zeitmaschine' })
  await slider.focus(); await page.keyboard.press('PageUp')
  await expect.poll(() => page.locator('.hero-score').textContent()).not.toBe(before)
  expect(errors).toEqual([])
})
