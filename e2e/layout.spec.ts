import { expect, test } from '@playwright/test'

for (const width of [360, 390, 430, 768, 1024, 1440]) {
  test(`has no horizontal overflow and correct mobile bar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
    await page.goto('')
    await expect(page.getByRole('heading', { name: /Jetzt posten oder warten/i })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    const bar = page.locator('.mobile-bar')
    if (width < 1024) {
      await expect(bar).toBeVisible()
      expect(await bar.evaluate((element) => getComputedStyle(element).position)).toBe('fixed')
    } else {
      await expect(bar).toBeHidden()
    }
  })
}
