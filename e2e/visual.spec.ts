import { test } from '@playwright/test'
import { openReady } from './helpers'

for (const theme of ['light', 'dark'] as const) {
  test(`captures first viewport in ${theme} mode`, async ({ page }, testInfo) => {
    await page.addInitScript((value) => localStorage.setItem('gap-theme', value), theme)
    await openReady(page)
    await page.locator('.live-clock, .region-time, .compact-time').evaluateAll((nodes) => {
      for (const node of nodes) (node as HTMLElement).style.visibility = 'hidden'
    })
    await page.screenshot({
      path: testInfo.outputPath(`first-viewport-${testInfo.project.name}-${theme}.png`),
      fullPage: false,
    })
  })
}
