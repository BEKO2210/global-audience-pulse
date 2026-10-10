import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

async function openPlaybooks(page: Page) {
  await openReady(page)
  const section = page.locator('section.playbooks')
  // The section mounts lazily below the fold.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75))
  await expect(section).toBeVisible({ timeout: 15_000 })
  await section.scrollIntoViewIfNeeded()
  return section
}

test('playbooks show sourced facts, study times and numbered sources', async ({ page }) => {
  const section = await openPlaybooks(page)
  await expect(section.getByRole('heading', { name: 'Was die Algorithmen belohnen' })).toBeVisible()
  await expect(section.getByText(/Stand \d{2}\.\d{2}\.\d{4}/)).toBeVisible()
  const tabs = section.getByRole('tab')
  await expect(tabs).toHaveCount(7)
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')

  const panel = section.getByRole('tabpanel')
  await expect(panel.locator('.week-row')).toHaveCount(7)
  const sources = panel.locator('.playbook-sources li')
  expect(await sources.count()).toBeGreaterThan(0)
  for (const link of await sources.locator('a').all())
    expect(await link.getAttribute('href')).toMatch(/^https:\/\//)

  // Every reference number points to a source listed in this panel.
  for (const ref of await panel.locator('.playbook-ref').all()) {
    const target = (await ref.getAttribute('href'))!.slice(1)
    await expect(panel.locator(`[id="${target}"]`)).toHaveCount(1)
  }
})

test('switching platforms by click and arrow keys updates the panel', async ({ page }) => {
  const section = await openPlaybooks(page)
  await section.getByRole('tab', { name: 'LinkedIn' }).click()
  const panel = section.getByRole('tabpanel')
  await expect(panel).toContainText('Mo–Fr 15–20 Uhr')
  await expect(panel).toContainText('Beide Studien')

  await section.getByRole('tab', { name: 'LinkedIn' }).press('ArrowRight')
  const x = section.getByRole('tab', { name: 'X', exact: true })
  await expect(x).toHaveAttribute('aria-selected', 'true')
  await expect(x).toBeFocused()
  await expect(panel).toContainText('x-algorithm')

  await x.press('End')
  await expect(section.getByRole('tab', { name: 'Hacker News' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(panel).toContainText('Keine Studie mit offengelegter Methodik')
})

test('playbooks fit 360 px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openPlaybooks(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

for (const scheme of ['light', 'dark'] as const) {
  test(`playbooks pass axe in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    const section = await openPlaybooks(page)
    await section.getByRole('tab', { name: 'LinkedIn' }).click()
    // Measure after the panel's short fade-in, not mid-transition.
    await expect(section.getByRole('tabpanel')).toHaveCSS('opacity', '1')
    const results = await new AxeBuilder({ page })
      .include('section.playbooks')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
  })
}
