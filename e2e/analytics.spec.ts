import { expect, test, type Page } from '@playwright/test'
import { ANALYTICS } from '../src/config/legal'
import { openReady } from './helpers'

interface PlausiblePayload {
  n: string
  d: string
  u: string
  p?: Record<string, unknown>
}

async function mockPlausible(page: Page, payloads: PlausiblePayload[]) {
  await page.route(`${ANALYTICS.host}/**`, async (route) => {
    const request = route.request()
    if (request.url().endsWith('/api/event')) {
      payloads.push(request.postDataJSON() as PlausiblePayload)
      await route.fulfill({ status: 202, body: '' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(() => {
        const script = document.currentScript;
        const queued = window.plausible && window.plausible.q || [];
        const send = (name, options) => fetch('${ANALYTICS.host}/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ n: name, d: script.dataset.domain, u: location.href, p: options && options.props })
        });
        window.plausible = send;
        queued.forEach((args) => send(...args));
        send('pageview');
      })();`,
    })
  })
}

test('sends pageview and interaction events without flooding scrub', async ({ page }) => {
  const payloads: PlausiblePayload[] = []
  await mockPlausible(page, payloads)
  await openReady(page, false)

  await expect.poll(() => payloads.some((payload) => payload.n === 'pageview')).toBe(true)
  expect(payloads.find((payload) => payload.n === 'pageview')?.d).toBe(ANALYTICS.domain)

  await page.getByRole('button', { name: 'Reichweite' }).click()
  await expect.poll(() => payloads.some((payload) => payload.n === 'Gewichtung')).toBe(true)
  expect(payloads.find((payload) => payload.n === 'Gewichtung')?.p).toEqual({ modus: 'reach' })

  const mobileSlider = page.getByRole('slider', { name: 'Mobile Zeitmaschine' })
  if (await mobileSlider.isVisible()) {
    const box = await mobileSlider.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + 10, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height / 2, { steps: 8 })
    await page.mouse.up()
  } else {
    const forecast = page.getByRole('slider', { name: 'Zeitmaschine' })
    await forecast.scrollIntoViewIfNeeded()
    const box = await forecast.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + 30, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height / 2, { steps: 8 })
    await page.mouse.up()
  }

  await expect.poll(() => payloads.filter((payload) => payload.n === 'Scrub').length).toBe(1)
  expect(payloads.filter((payload) => payload.n === 'Scrub')).toHaveLength(1)
})

test('keeps the page functional when Plausible is blocked', async ({ page }) => {
  await page.route(`${ANALYTICS.host}/**`, (route) => route.abort('blockedbyclient'))
  await openReady(page, false)
  await expect(page.getByRole('button', { name: 'Reichweite' })).toBeEnabled()
  await page.getByRole('button', { name: 'Reichweite' }).click()
  await expect(page.getByRole('button', { name: 'Reichweite' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
