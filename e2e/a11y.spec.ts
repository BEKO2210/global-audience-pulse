import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

async function tabUntil(page: Page, predicate: () => Promise<boolean>, limit = 160) {
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab')
    if (await predicate()) return
  }
  throw new Error(`Keyboard target was not reached after ${limit} Tab presses`)
}

for (const theme of ['light', 'dark'] as const) {
  test(`has no serious or critical axe violations in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('gap-theme', value), theme)
    // Audit the settled UI: entrance fades would otherwise be sampled mid-opacity (flaky contrast).
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openReady(page)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
    ).toEqual([])
  })
}

test('keyboard reaches scrubber, heatmap, toggles, and focus-trapped sheet', async ({ page }) => {
  await openReady(page)
  await tabUntil(page, () =>
    page
      .getByRole('slider', { name: 'Zeitmaschine', exact: true })
      .evaluate((el) => el === document.activeElement),
  )
  await page.keyboard.press('ArrowRight')
  await tabUntil(page, () =>
    page
      .getByRole('gridcell')
      .first()
      .evaluate((el) => el === document.activeElement),
  )
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('gridcell').nth(1)).toBeFocused()
  await page.keyboard.press('Enter')
  await tabUntil(page, () =>
    page
      .getByRole('button', { name: /Berlin abwählen/ })
      .evaluate((el) => el === document.activeElement),
  )
  await page.keyboard.press('Enter')

  const mapRegion = page.locator('[data-region="eu_central"]')
  await mapRegion.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  await expect(page.getByRole('button', { name: 'Schließen' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(mapRegion).toBeFocused()
})
