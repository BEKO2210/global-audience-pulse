import { expect, test, type Page } from '@playwright/test'
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
  // Before the fix a 20-step drag shifted 0.14. Residual text reflow measures 0.005–0.012 between
  // runs; 0.02 is still 5x below the Core Web Vitals "good" CLS bound (0.1) and catches regressions.
  expect(result.layoutShift).toBeLessThan(0.02)
  expect(result.scrollAfter).toBe(result.scrollBefore)
})

test('mobile time bar never shifts while scrubbing (fixed columns)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  // focusing the chart slider scrolls the page; instant scrolling keeps the measurement deterministic
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openReady(page)
  const box = () =>
    page.locator('.mobile-bar-slider').evaluate((el) => {
      const b = el.getBoundingClientRect()
      return `${Math.round(b.left)}/${Math.round(b.width)}`
    })
  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  // focusing the chart slider scrolls the page, which may collapse the bar: measure in the settled state
  await page.waitForTimeout(400)
  const first = await box()
  for (let i = 0; i < 48; i += 1) {
    await page.keyboard.press('ArrowRight')
    if (i % 8 === 0) expect(await box()).toBe(first)
  }
})

test('mobile time bar: the score sits right next to the 24 h switch, no gap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openReady(page)
  const toggle = await page.locator('.mobile-bar .mobile-horizon-toggle').boundingBox()
  const score = await page.locator('.mobile-bar-score > b').boundingBox()
  expect(toggle && score).toBeTruthy()
  // grid gap (8 px) + at most a thin margin; the old right-aligned 64 px column left ~30 px empty
  expect(score!.x - (toggle!.x + toggle!.width)).toBeLessThanOrEqual(12)
})

/** Scroll like a person: several scroll events, not one programmatic jump (the bar ignores single reflow jumps). */
async function scrollInSteps(page: Page, target: number) {
  await page.evaluate(async (y) => {
    const from = window.scrollY
    for (let i = 1; i <= 4; i += 1) {
      window.scrollTo(0, from + ((y - from) * i) / 4)
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 40)))
    }
  }, target)
}

test('mobile time bar compacts on scroll and expands at the top or on tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  // instant scrolling: with smooth scrolling, scrollTo keeps emitting events after the tap and re-collapses the bar
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openReady(page)
  const bar = page.locator('.mobile-bar')
  const main = page.locator('main')
  const expandedHeight = await bar.evaluate((element) => element.getBoundingClientRect().height)
  const paddingBefore = await main.evaluate((element) => getComputedStyle(element).paddingBottom)

  await scrollInSteps(page, 600)
  await expect(bar).toHaveClass(/is-compact/)
  await expect
    .poll(() => bar.evaluate((element) => element.getBoundingClientRect().height))
    .toBeLessThanOrEqual(48)
  expect(await main.evaluate((element) => getComputedStyle(element).paddingBottom)).toBe(
    paddingBefore,
  )

  await scrollInSteps(page, 0)
  await expect(bar).not.toHaveClass(/is-compact/)
  await expect
    .poll(() => bar.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(expandedHeight)

  await scrollInSteps(page, 600)
  await expect(bar).toHaveClass(/is-compact/)
  await bar.click({ position: { x: 8, y: 8 } })
  await expect(bar).not.toHaveClass(/is-compact/)
  await expect
    .poll(() => bar.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(expandedHeight)
})
