import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openReady } from './helpers'

function formatHeatmapCursorLabel(iso: string, timeZone: string) {
  const date = new Date(iso)
  const weekday = new Intl.DateTimeFormat('de-DE', { timeZone, weekday: 'short' })
    .format(date)
    .replace(/\.$/, '')
  const clock = new Intl.DateTimeFormat('de-DE', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
  return `${weekday} ${clock}`
}

test.describe('heatmap time cursors', () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test('shows selected and now cursors, labels, and full city names', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openReady(page)

    const selectedCursor = page.getByTestId('heatmap-selected-cursor')
    await expect(selectedCursor).toBeVisible()
    const cursorBox = await selectedCursor.boundingBox()
    expect(cursorBox?.width).toBeGreaterThanOrEqual(2)

    await expect(selectedCursor.locator('.heatmap-cursor-label')).toHaveText('jetzt')

    const labels = page.locator('.heatmap-label')
    await expect(labels.first()).toBeVisible()
    const labelOverflow = await labels.evaluateAll((nodes) =>
      nodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
    )
    expect(labelOverflow).toBe(true)

    const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    const timestamp = await page.locator('.hero-score').getAttribute('data-timestamp')
    expect(timestamp).toBeTruthy()
    const expected = formatHeatmapCursorLabel(timestamp!, 'Europe/Berlin')
    await expect(selectedCursor.locator('.heatmap-cursor-label')).toHaveText(expected)

    await expect(page.locator('.heatmap-cursor--now .heatmap-cursor-label')).toHaveText('jetzt')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
    ).toEqual([])
  })
})

test('selected cursor sits inside the highlighted hour column', async ({ page }) => {
  await openReady(page)
  const panel = page.locator('.heatmap-panel')
  await panel.scrollIntoViewIfNeeded()
  const slider = page.getByRole('slider', { name: 'Zeitmaschine', exact: true })
  await slider.focus()
  for (let i = 0; i < 11; i += 1) await page.keyboard.press('ArrowRight') // +2 h 45 min
  await page.waitForTimeout(300)
  const cursor = await page.getByTestId('heatmap-selected-cursor').boundingBox()
  const cell = await page.locator('.selected-col').first().boundingBox()
  expect(cursor && cell).toBeTruthy()
  const x = cursor!.x + cursor!.width / 2
  expect(x).toBeGreaterThanOrEqual(cell!.x - 1)
  expect(x).toBeLessThanOrEqual(cell!.x + cell!.width + 1)
})
