import { expect, test } from '@playwright/test'
import { openReady } from './helpers'

test('clocks tick, simulated time changes the score, and Live returns to now', async ({
  page,
  browserName,
}) => {
  // Known issue: in WebKit, page.clock.setFixedTime + runFor freezes the page (evaluate never
  // returns). A standalone WebKit script with the same steps updates the score (61 -> 72), so
  // this is a fake-clock interaction, not an app bug. Tracked in README "Tests".
  test.fixme(browserName === 'webkit', 'page.clock.setFixedTime freezes WebKit')
  await page.clock.install({ time: new Date('2026-10-09T14:37:00Z') })
  await openReady(page)
  const clock = page.locator('.live-clock span')
  const clockBefore = await clock.textContent()
  const scoreBefore = await page.locator('.hero-score').textContent()
  await page.clock.runFor(3_600)
  await expect(clock).not.toHaveText(clockBefore ?? '')
  await page.clock.setFixedTime(new Date('2026-10-09T17:37:00Z'))
  await page.clock.runFor(60_001)
  // Read textContent directly: WebKit can report an empty innerText while the score re-renders.
  await expect
    .poll(() => page.locator('.hero-score').evaluate((element) => element.textContent), {
      timeout: 15_000,
    })
    .not.toBe(scoreBefore)

  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  await page.keyboard.press('PageUp')
  const liveButton = page.locator('.forecast-panel').getByRole('button', { name: 'Live' })
  await expect(liveButton).toBeEnabled()
  await liveButton.click()
  await expect(page.locator('.mobile-bar-readout')).toContainText('Jetzt')
  // The bar is hidden on desktop; assert the live state exists rather than its visibility.
  await expect(page.locator('.mobile-bar-live.is-live')).toHaveCount(1)
})

test('keyboard, pointer, and heatmap scrubbing update all time-driven views', async ({ page }) => {
  await openReady(page)
  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  const scrubDuration = await slider.evaluate((element) => {
    performance.mark('scrub-start')
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    performance.mark('scrub-end')
    return performance.measure('keyboard-scrub', 'scrub-start', 'scrub-end').duration
  })
  const keyboardTime = await page.locator('.hero-score').getAttribute('data-timestamp')
  expect(keyboardTime).toMatch(/:([0134][05]):00\.000Z$/)
  expect(scrubDuration).toBeLessThan(16)

  // focus() on the SVG slider does not scroll; centre it so the fixed mobile bar cannot cover it.
  await slider.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  )
  const box = await slider.boundingBox()
  expect(box).toBeTruthy()
  await page.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height / 2)
  // React commits the pointer update asynchronously; poll instead of reading once.
  await expect
    .poll(() => page.locator('.hero-score').getAttribute('data-timestamp'))
    .not.toBe(keyboardTime)
  const pointerTime = await page.locator('.hero-score').getAttribute('data-timestamp')
  expect(pointerTime).toMatch(/:([0134][05]):00\.000Z$/)

  await page.locator('.heat-cell').nth(5).click()
  const timestamps = await Promise.all(
    ['.hero-score', '.map-panel', '.regions-section'].map((selector) =>
      page.locator(selector).getAttribute('data-timestamp'),
    ),
  )
  expect(new Set(timestamps).size).toBe(1)
})

test('Europe/Berlin changes from summer to standard time at the DST boundary', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T00:59:58Z') })
  await page.goto('')
  await expect(page.locator('.live-clock small')).toContainText(/MESZ|GMT\+2/)
  await page.clock.runFor(3_000)
  await expect(page.locator('.live-clock small')).toContainText(/MEZ|GMT\+1/)
})
