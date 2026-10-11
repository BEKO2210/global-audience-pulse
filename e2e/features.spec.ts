import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { allowClipboard, openReady } from './helpers'

test('audience selection renormalizes and persists in URL and localStorage', async ({ page }) => {
  await openReady(page)
  const toggle = page.getByRole('switch', { name: /Berlin in der Zielgruppe/ })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(page).toHaveURL(/audience=/)
  expect(await page.evaluate(() => localStorage.getItem('gap-audience'))).not.toContain(
    'eu_central',
  )
  await page.reload()
  await expect(page.getByRole('switch', { name: /Berlin in der Zielgruppe/ })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  const visibleWeights = await page.locator('.compact-share').allTextContents()
  expect(visibleWeights.filter((value) => value !== '—').length).toBeGreaterThan(1)
})

test('switches weighting and planner tabs, exports a UTC ICS, and copies the plan', async ({
  page,
  context,
  browserName,
}) => {
  await allowClipboard(page, context, browserName)
  await openReady(page)
  await page.getByRole('button', { name: 'Reichweite' }).click()
  await expect(page).toHaveURL(/weight=reach/)
  expect(await page.evaluate(() => localStorage.getItem('gap-weighting'))).toBe('reach')

  const planner = page.getByRole('region', { name: 'Die nächsten starken Fenster' })
  await planner.getByRole('tab', { name: /Morgen/ }).click()
  await expect(planner.getByRole('tab', { name: /Morgen/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Als Kalenderdatei laden' }).first().click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  // UTC instead of TZID: a TZID without VTIMEZONE is rejected or misread by several calendars (T-080)
  expect(await readFile(path!, 'utf8')).toMatch(/DTSTART:\d{8}T\d{6}Z\r\n/)

  await page.getByRole('button', { name: /Plan kopieren/ }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/^1\./)
})

test('an empty today tab points to the available windows tomorrow', async ({
  page,
  browserName,
}) => {
  test.fixme(browserName === 'webkit', 'page.clock.install freezes WebKit')
  await page.clock.install({ time: new Date('2026-10-09T21:40:00Z') })
  await openReady(page)

  const planner = page.getByRole('region', { name: 'Die nächsten starken Fenster' })
  await expect(planner.getByRole('tab', { name: 'Heute (0)' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(planner.getByRole('tabpanel')).toContainText(
    'Heute kein starkes Fenster mehr – das nächste morgen.',
  )

  await planner.getByRole('tab', { name: /Morgen/ }).click()
  await expect(planner.locator('.planner-list article')).not.toHaveCount(0)
  await expect(planner.locator('.planner-empty')).toHaveCount(0)
})

test('share link round-trips audience and weighting state', async ({
  page,
  context,
  browserName,
}) => {
  await allowClipboard(page, context, browserName)
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await openReady(page)
  await page.getByRole('switch', { name: /Berlin in der Zielgruppe/ }).click()
  await page.getByRole('button', { name: 'Reichweite' }).click()
  await page.getByRole('button', { name: /Link teilen/ }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('audience=')
  expect(link).toContain('weight=reach')
  await page.goto(link)
  await expect(page.getByRole('switch', { name: /Berlin in der Zielgruppe/ })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(page.getByRole('button', { name: 'Reichweite' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('supports System, Hell, and Dunkel including OS color changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('')
  const menu = page.getByRole('button', { name: 'Darstellung' })
  await menu.click()
  await page.getByRole('radio', { name: 'System' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('radio', { name: 'Hell' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('radio', { name: 'Dunkel' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('three styles can be chosen, are remembered and load their own fonts (O-014)', async ({
  page,
}) => {
  await page.goto('')
  await expect(page.locator('html')).toHaveAttribute('data-style', 'tafel')
  await page.getByRole('button', { name: 'Darstellung' }).click()
  await expect(page.getByRole('radio', { name: /Abflugtafel/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByRole('radio', { name: /Atlas/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-style', 'atlas')
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('600 32px "Source Serif 4 Variable"')))
    .toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('radio', { name: /Atlas/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Darstellung' })).toBeFocused()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-style', 'atlas')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    /#(eef1ee|0f1a1d)/,
  )
})

test('every chart carries a one-sentence caption that follows the time machine (T-017)', async ({
  page,
}) => {
  await openReady(page)
  for (let y = 0; y < 12_000; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(40)
  }
  const captions = page.locator('.chart-caption')
  await expect(captions).toHaveCount(4)
  await expect(captions.first()).toContainText(/^Jetzt: \d von 8 wach/)
  // one line each (a wrapping caption made the content below jump while scrubbing on phones)
  for (const caption of await captions.all()) {
    const { height, line } = await caption.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      line: parseFloat(getComputedStyle(el).lineHeight),
    }))
    expect(height).toBeLessThan(line * 1.5)
  }
  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(captions.first()).toContainText(/^\d{2}:\d{2}: \d von 8 wach/)
})

test('the optimal window is the best-scoring one, not just the next in time', async ({ page }) => {
  await openReady(page)
  const second = Number(
    (await page.getByText(/^\d{2}:\d{2} \S+ · Score \d+$/).innerText()).match(/Score (\d+)/)?.[1] ??
      0,
  )
  // the hero number counts up (AnimatedNumber); poll until it settles
  await expect
    .poll(async () =>
      Number((await page.locator('.hero-window-benefit').innerText()).match(/Score (\d+)/)?.[1]),
    )
    .toBeGreaterThanOrEqual(Math.max(1, second))
})

test('"In Kalender" at the optimal window downloads a valid UTC event (T-080)', async ({
  page,
}) => {
  await openReady(page)
  const button = page.locator('.hero-window-actions').getByRole('button', { name: 'In Kalender' })
  await expect(button).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()])
  expect(download.suggestedFilename()).toBe('posting-fenster.ics')
  const ics = await readFile((await download.path())!, 'utf8')
  expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z\r\n/)
  expect(ics).toMatch(/DTEND:\d{8}T\d{6}Z\r\n/)
  expect(ics).toContain('SUMMARY:Posting-Fenster (Global Audience Pulse)')
  expect(ics).not.toContain('TZID')
})

test('"Erinnern" sets a reminder that survives a reload and can be removed (T-081)', async ({
  page,
}) => {
  // headless Chromium always reports "denied"; a stand-in with granted permission tests the app's own logic
  await page.addInitScript(() => {
    class FakeNotification {
      static permission = 'granted'
      static requestPermission = () => Promise.resolve('granted')
    }
    Object.defineProperty(window, 'Notification', { value: FakeNotification })
  })
  await openReady(page)
  const button = page.locator('.hero-window-actions').getByRole('button', { name: /Erinnern/ })
  await button.click()
  const active = page.locator('.hero-window-actions button[aria-pressed="true"]')
  // under a full parallel run the state change can take longer than the default 5 s (seen flaky twice)
  await expect(active).toContainText(/Erinnerung \d{2}:\d{2}/, { timeout: 10_000 })
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gap-reminders') ?? '[]').length),
  ).toBe(1)

  await page.reload()
  await expect(page.locator('.hero-window-actions button[aria-pressed="true"]')).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('.hero-window-actions button[aria-pressed="true"]').click()
  await expect(
    page.locator('.hero-window-actions').getByRole('button', { name: /Erinnern/ }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gap-reminders') ?? '[]').length),
  ).toBe(0)
})

test('"Ganze Woche planen" opens the planner on the 7-day view (O-011)', async ({ page }) => {
  await openReady(page)
  await page.locator('.hero-aside').getByRole('link', { name: 'Ganze Woche planen' }).click()
  await expect(page).toHaveURL(/#planer$/)
  const tab = page.getByRole('tab', { name: /7 Tage/ })
  await expect(tab).toBeVisible()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
})

for (const theme of ['light', 'dark'] as const)
  test(`appearance menu passes axe (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('gap-theme', t), theme)
    await openReady(page)
    await page.getByRole('button', { name: 'Darstellung' }).click()
    await expect(page.getByRole('radio', { name: 'Deutsch' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.waitForTimeout(300)
    const results = await new AxeBuilder({ page })
      .include('.dm-panel')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
    ).toEqual([])
  })

for (const theme of ['light', 'dark'] as const)
  test(`region detail opens as a full row below the tile's row, tiles keep their size, passes axe (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem('gap-theme', t), theme)
    await openReady(page)
    const tiles = page.locator('.region-card')
    await expect(tiles).toHaveCount(8)
    const widthsBefore = await tiles.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().width),
    )
    const card = page.locator('.region-card', {
      has: page.getByRole('switch', { name: /Berlin in der Zielgruppe/ }),
    })
    await card.locator('.card-main').click()
    await expect(card).toHaveClass(/expanded/)
    const detail = page.locator('.card-detail')
    await expect(detail.getByRole('img', { name: /über den Tag in Ortszeit/ })).toBeVisible()
    await expect(detail.locator('.card-share b')).toHaveText(/\d+\s?%/)
    // bento: every tile keeps its width, the detail spans the grid and starts right below the tile's row
    const widthsAfter = await tiles.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().width),
    )
    expect(widthsAfter).toEqual(widthsBefore)
    const [gridBox, cardBox, detailBox] = await Promise.all([
      page.locator('.region-grid').boundingBox(),
      card.boundingBox(),
      detail.boundingBox(),
    ])
    expect(Math.abs(detailBox!.width - gridBox!.width)).toBeLessThanOrEqual(1)
    expect(detailBox!.y - (cardBox!.y + cardBox!.height)).toBeGreaterThan(0)
    expect(detailBox!.y - (cardBox!.y + cardBox!.height)).toBeLessThanOrEqual(12)
    // switch: knob centred vertically in its track
    const [track, knob] = await Promise.all([
      card.locator('.region-switch-track').boundingBox(),
      card.locator('.region-switch-knob').boundingBox(),
    ])
    expect(
      Math.abs(track!.y + track!.height / 2 - (knob!.y + knob!.height / 2)),
    ).toBeLessThanOrEqual(0.5)
    const results = await new AxeBuilder({ page })
      .include('.region-grid')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
    ).toEqual([])
  })
