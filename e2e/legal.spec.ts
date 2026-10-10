import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { LEGAL } from '../src/config/legal'

const pages = [
  {
    path: 'impressum/',
    title: 'Impressum – Global Audience Pulse',
    heading: 'Impressum',
    section: 'Angaben gemäß § 5 DDG',
  },
  {
    path: 'datenschutz/',
    title: 'Datenschutz – Global Audience Pulse',
    heading: 'Datenschutz',
    section: 'Verantwortlicher',
  },
] as const

for (const legal of pages) {
  test(`${legal.heading} loads as its own accessible page`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(legal.path)

    await expect(page).toHaveTitle(legal.title)
    await expect(page.getByRole('heading', { level: 1, name: legal.heading })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: legal.section })).toBeVisible()
    await expect(page.getByText(LEGAL.contact.name, { exact: true })).toBeVisible()
    await expect(page.getByText(LEGAL.contact.street, { exact: true })).toBeVisible()
    await expect(page.getByText(LEGAL.contact.postalCodeCity, { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: LEGAL.contact.email })).toHaveAttribute(
      'href',
      `mailto:${LEGAL.contact.email}`,
    )
    await expect(page.getByRole('link', { name: 'Zur Startseite' })).toHaveAttribute(
      'href',
      '/global-audience-pulse/',
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/global-audience-pulse\//,
    )

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
    ).toEqual([])
  })
}

test('Datenschutz lists every processing area', async ({ page }) => {
  await page.goto('datenschutz/')
  for (const heading of [
    'Hosting (GitHub Pages)',
    'Direkte Abrufe (Wikimedia)',
    'Lokaler Lagebericht',
    'Schriften (self-hosted)',
    'Speicher im Browser (localStorage, Service Worker)',
    'Keine Cookies/kein Tracking',
    'Rechtsgrundlagen',
    'Deine Rechte + Aufsichtsbehörde BW',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
  }
})
