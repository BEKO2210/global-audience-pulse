import { expect, test } from '@playwright/test'
import { openReady } from './helpers'

test('loads without runtime errors and exposes complete metadata and app icons', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await openReady(page)

  await expect(page).toHaveTitle('Global Audience Pulse')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/)
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/)

  const assetHrefs = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href))
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifestResponse = await page.request.get(new URL(manifestHref!, page.url()).toString())
  expect(manifestResponse.ok()).toBe(true)
  const manifest = (await manifestResponse.json()) as { icons: { src: string }[] }
  for (const href of [
    ...assetHrefs,
    ...manifest.icons.map((icon) => new URL(icon.src, page.url()).href),
  ]) {
    expect((await page.request.get(href)).ok(), href).toBe(true)
  }
  expect(errors).toEqual([])
})
