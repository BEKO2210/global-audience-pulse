import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { allowClipboard, openReady } from './helpers'

test('audience selection renormalizes and persists in URL and localStorage', async ({ page }) => {
  await openReady(page)
  const toggle = page.getByRole('button', { name: /Berlin abwählen/ })
  await toggle.click()
  await expect(page).toHaveURL(/audience=/)
  expect(await page.evaluate(() => localStorage.getItem('gap-audience'))).not.toContain(
    'eu_central',
  )
  await page.reload()
  await expect(page.getByRole('button', { name: /Berlin auswählen/ })).toBeVisible()
  const visibleWeights = await page.locator('.weight-label b').allTextContents()
  expect(visibleWeights.filter((value) => value !== '—').length).toBeGreaterThan(1)
})

test('switches weighting and planner tabs, exports TZID ICS, and copies the plan', async ({
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
  expect(await readFile(path!, 'utf8')).toMatch(/DTSTART;TZID=Europe\/Berlin:/)

  await page.getByRole('button', { name: /Plan kopieren/ }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/^1\./)
})

test('share link round-trips audience and weighting state', async ({
  page,
  context,
  browserName,
}) => {
  await allowClipboard(page, context, browserName)
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await openReady(page)
  await page.getByRole('button', { name: /Berlin abwählen/ }).click()
  await page.getByRole('button', { name: 'Reichweite' }).click()
  await page.getByRole('button', { name: /Link teilen/ }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('audience=')
  expect(link).toContain('weight=reach')
  await page.goto(link)
  await expect(page.getByRole('button', { name: /Berlin auswählen/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reichweite' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('supports System, Hell, and Dunkel including OS color changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('')
  await page.getByRole('button', { name: 'System' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Hell' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Dunkel' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
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
  await expect(captions.first()).toContainText(/^Gerade wach: \d von 8 Märkten/)
  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(captions.first()).toContainText(/^Um \d{2}:\d{2} wach/)
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
