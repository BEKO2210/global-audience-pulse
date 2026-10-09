import { expect, test } from '@playwright/test'
import { openReady } from './helpers'

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

test('mobile time-bar scrub preserves scroll position and layout stability', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const state = { shifts: 0 }
    Object.defineProperty(window, '__scrubLayout', { value: state })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        state.shifts += (entry as PerformanceEntry & { value: number }).value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await openReady(page)
  // Measure scrubbing, not the one-time load choreography (count-up + staggered entrances, < 900 ms).
  await page.waitForTimeout(1_200)
  const result = await page
    .getByRole('slider', { name: 'Mobile Zeitmaschine' })
    .evaluate(async (element) => {
      const input = element as HTMLInputElement
      const state = (window as unknown as { __scrubLayout: { shifts: number } }).__scrubLayout
      state.shifts = 0
      const scrollBefore = scrollY
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      for (let step = 0; step <= 20; step += 1) {
        input.value = String((Number(input.max) * step) / 20)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      return { layoutShift: state.shifts, scrollBefore, scrollAfter: scrollY }
    })
  expect(result.layoutShift).toBeLessThan(0.01)
  expect(result.scrollAfter).toBe(result.scrollBefore)
})
