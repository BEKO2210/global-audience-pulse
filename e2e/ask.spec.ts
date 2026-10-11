import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openReady } from './helpers'

async function openAsk(page: Page) {
  await openReady(page)
  for (let y = 0; y < 16_000; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(30)
  }
  const section = page.locator('section.ask-pulse')
  await expect(section).toBeVisible()
  await section.scrollIntoViewIfNeeded()
  return section
}

test('"Frag den Pulse" answers per audience with the best window (T-016)', async ({ page }) => {
  const section = await openAsk(page)
  const questions = section.getByRole('radio')
  await expect(questions).toHaveCount(5)
  await expect(questions.first()).toHaveAttribute('aria-checked', 'true')
  await expect(section.locator('.ap-window strong')).toHaveText(/^\d{2}:\d{2}–\d{2}:\d{2} /)

  await section.getByRole('radio', { name: 'Wann poste ich für USA?' }).click()
  await expect(section.getByRole('radio', { name: 'Wann poste ich für USA?' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(section.locator('.ap-regions')).toContainText('USA Ost')
  await expect(section.locator('.ap-verdict')).toHaveText(/^(Jetzt posten|Warte bis)/)
  await page.waitForTimeout(500)
  const results = await new AxeBuilder({ page })
    .include('section.ask-pulse')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
  ).toEqual([])
})

test.describe('English', () => {
  test.use({ locale: 'en-US' })
  test('asks in English', async ({ page }) => {
    const section = await openAsk(page)
    await expect(section.getByRole('radio', { name: 'When do I post for the US?' })).toBeVisible()
    await expect(
      section.getByRole('radio', { name: 'When do I post for Eastern wave?' }),
    ).toBeVisible()
  })
})
