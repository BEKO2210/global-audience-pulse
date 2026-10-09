import { expect, test } from '@playwright/test'

test('lädt fehlerfrei, bleibt im Viewport und reagiert auf Scrubbing', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Jetzt posten oder warten/i })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
  const before = await page.locator('.hero-score').textContent()
  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  await page.keyboard.press('PageUp')
  await expect.poll(() => page.locator('.hero-score').textContent()).not.toBe(before)
  expect(errors).toEqual([])
})

test('folgt dem hellen Betriebssystem-Theme, nutzt SVG-Flaggen und vollständige Manifest-Icons', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f4f0e7')
  expect(await page.locator('img.flag-image').count()).toBeGreaterThan(0)
  expect(await page.evaluate(() => /[\u{1F1E6}-\u{1F1FF}]/u.test(document.body.innerText))).toBe(
    false,
  )

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifest = await page.evaluate(async (href) => (await fetch(href!)).json(), manifestHref)
  for (const icon of manifest.icons as { src: string }[]) {
    const response = await page.request.get(new URL(icon.src, page.url()).toString())
    expect(response.ok()).toBe(true)
  }
})

test('360 px hat keinen Seitenüberlauf und eine feste mobile Leiste', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 360)).toBe(true)
  const bar = page.locator('.mobile-bar')
  await expect(bar).toBeVisible()
  expect(await bar.evaluate((element) => getComputedStyle(element).position)).toBe('fixed')
})

test('Tokio liegt zum Referenzzeitpunkt auf der Nachtseite', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-09T14:37:00Z') })
  await page.goto('')
  const tokyo = page.locator('[data-region="east_asia"]')
  await expect(tokyo).toBeVisible()
  expect(Number(await tokyo.getAttribute('data-solar-elevation'))).toBeLessThan(0)
})
