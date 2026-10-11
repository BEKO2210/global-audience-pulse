// Test cage – design rules in every style × theme, on the phone and desktop projects. A failure names the element
// and the rule it broke; fix the element, never loosen the cage (see e2e/cage/README.md).
import { expect, test, type Page } from '@playwright/test'
import { DISPLAY_SCALE, STYLES, THEMES, TYPE_SCALE, WEIGHTS, openCaged, probe } from './probe'

async function expectCaged(page: Page) {
  const p = await probe(page)
  expect(p.findings, 'rule breaks').toEqual([])
  expect(
    p.fontSizes.filter((size) => !TYPE_SCALE.includes(size)),
    'off the type scale',
  ).toEqual([])
  expect(
    p.weights.filter((weight) => !WEIGHTS.includes(weight)),
    'off the weight set',
  ).toEqual([])
  expect(
    p.displaySizes.filter((size) => !DISPLAY_SCALE.includes(size)),
    'off the display sizes',
  ).toEqual([])
}

for (const style of STYLES)
  for (const theme of THEMES) {
    test(`cage: ${style} ${theme} – page`, async ({ page }) => {
      await openCaged(page, style, theme)
      await expectCaged(page)
    })

    test(`cage: ${style} ${theme} – region detail and appearance menu open`, async ({ page }) => {
      await openCaged(page, style, theme)
      const card = page.locator('.region-card', {
        has: page.getByRole('switch', { name: /Berlin in der Zielgruppe/ }),
      })
      await card.locator('.card-main').click()
      await expect(page.locator('.card-detail')).toBeVisible()
      await expectCaged(page)
      await page.evaluate(() => scrollTo(0, 0))
      await page.getByRole('button', { name: 'Darstellung' }).click()
      await expect(page.locator('.dm-panel')).toBeVisible()
      await page.waitForTimeout(300)
      await expectCaged(page)
    })
  }

for (const theme of THEMES)
  test(`cage: map detail sheet (${theme})`, async ({ page }) => {
    await openCaged(page, 'praezision', theme)
    const pin = page.locator('[data-region="eu_central"]')
    await pin.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.waitForTimeout(400)
    await expectCaged(page)
  })
