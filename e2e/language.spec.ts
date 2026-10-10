import { expect, test } from '@playwright/test'
import { openReady } from './helpers'

// T-065: the page follows the system language (German → German, anything else → English).
test.describe('English system language', () => {
  test.use({ locale: 'en-US' })

  test('renders English with matching SEO tags', async ({ page }) => {
    await openReady(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post now or wait?')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle('Best time to post worldwide, live – Global Audience Pulse')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://beko2210.github.io/global-audience-pulse/?lang=en',
    )
  })

  test('leaves no German UI text outside the German-only AI briefing', async ({ page }) => {
    await openReady(page)
    await page.mouse.wheel(0, 20_000)
    await page.waitForTimeout(800)
    const leftovers = await page.evaluate(() => {
      const found: string[] = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent?.trim() ?? ''
        if (!/[äöüÄÖÜß]/.test(text)) continue
        if (node.parentElement?.closest('[lang="de"], script, style, noscript')) continue
        found.push(text)
      }
      return found
    })
    expect(leftovers).toEqual([])
  })

  test('the toggle switches to German and remembers it', async ({ page }) => {
    await openReady(page)
    await page.getByRole('button', { name: 'Deutsch' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetzt posten oder warten?')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetzt posten oder warten?')
  })

  test('?lang=de wins over the system language', async ({ page }) => {
    await openReady(page, true, '?lang=de')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetzt posten oder warten?')
  })
})

test('German system language stays German; ?lang=en switches', async ({ page }) => {
  await openReady(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetzt posten oder warten?')
  await openReady(page, true, '?lang=en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post now or wait?')
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
