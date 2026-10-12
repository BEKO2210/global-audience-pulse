import { expect, test, type Locator, type Page } from '@playwright/test'
import { STYLES, THEMES, openCaged } from './probe'

const CONTROLS = [
  ['header wordmark', '.site-header .wordmark'],
  ['footer wordmark', '.footer-wordmark'],
  ['freshness', '.freshness'],
  ['map pin', ".world-map g[role='button']", 'circle:last-of-type'],
  ['region switch', ".region-switch[aria-checked='false']", '.region-switch-track'],
  ['question', ".ap-question:not([aria-checked='true'])"],
  ['posting chip', ".pp-chip:not([aria-pressed='true'])"],
  ['weighting option', ".wt-option:not([aria-pressed='true'])"],
  ['live button', '.scrub-readout button:not(:disabled)'],
  ['dial legend', ".dial-legend button:not([aria-pressed='true'])"],
  ['region filter', ".filter-row:not(.planner-tabs) button:not([aria-pressed='true'])"],
  ['planner tab', ".planner-tabs button:not([aria-selected='true'])"],
  ['playbook tab', ".pb-tabs button:not([aria-selected='true'])"],
  ['report summary', '.lr-details:not([open]) > summary'],
  ['playbook summary', '.pb-details:not([open]) > summary'],
  ['footer link', '.footer-group a'],
  ['source link', '.source-list a'],
  ['playbook reference', '.pb-ref'],
] as const

async function prepareStates(page: Page) {
  await page.locator('.lr-details').evaluate((details: HTMLDetailsElement) => {
    details.open = false
  })
  const firstSwitch = page.locator('.region-switch').first()
  if ((await firstSwitch.getAttribute('aria-checked')) === 'true') await firstSwitch.click()
  const forecast = page.locator('.forecast')
  await forecast.focus()
  await forecast.press('ArrowRight')
  await expect(page.locator('.scrub-readout button')).toBeEnabled()
}

function carrier(control: Locator, selector?: string) {
  return selector ? control.locator(selector) : control
}

test('states: visible interactive targets are at least 24 × 24 px', async ({ page }) => {
  await openCaged(page, 'praezision', 'light')
  const tooSmall = await page.evaluate(() => {
    const selector =
      'a[href], button, [role=button], [role=switch], [role=tab], [role=radio], summary'
    return (
      [...document.querySelectorAll<HTMLElement>(selector)]
        .filter((el) => !el.closest('.mobile-bar'))
        // WCAG 2.5.8 exempts inline targets in a sentence (their height is the line height of the text around
        // them): the report scope link is one such link, one 15 px line from 600 px
        .filter((el) => !(el.matches('p > a') && getComputedStyle(el).display === 'inline'))
        .map((el) => {
          const rect = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          let width = rect.width
          let height = rect.height
          if (el.matches('.pb-ref')) {
            const hit = getComputedStyle(el, '::after')
            width += Math.abs(parseFloat(hit.left)) + Math.abs(parseFloat(hit.right))
            height += Math.abs(parseFloat(hit.top)) + Math.abs(parseFloat(hit.bottom))
          }
          return { el, width, height, visible: style.display !== 'none' && rect.width > 0 }
        })
        .filter(({ visible, width, height }) => visible && (width < 24 || height < 24))
        .map(({ el, width, height }) => ({
          target: `${el.tagName.toLowerCase()}.${el.className}`,
          size: `${width.toFixed(1)} × ${height.toFixed(1)}`,
        }))
    )
  })
  expect(tooSmall, 'undersized interactive targets').toEqual([])
})

for (const style of STYLES)
  for (const theme of THEMES) {
    test(`states: ${style} ${theme} controls react on hover`, async ({ page }) => {
      test.skip(test.info().project.name !== 'chromium-desktop', 'mouse hover is desktop-only')
      await openCaged(page, style, theme)
      await prepareStates(page)
      let checked = 0
      for (const [name, selector, carrierSelector] of CONTROLS) {
        const control = page.locator(selector).first()
        // some controls only exist in one layout (e.g. .freshness is header-only ≥ 768 px): skip, never fail
        if (!(await control.isVisible())) continue
        checked += 1
        // hold the element: a hovered control may change its own attributes (the dial legend sets aria-pressed
        // while hovered), which would make a re-resolving locator pick a different element
        const handle = (await carrier(control, carrierSelector).elementHandle())!
        const snapshot = () =>
          handle.evaluate((el) => {
            const s = getComputedStyle(el)
            return [
              s.backgroundColor,
              s.color,
              s.borderColor,
              s.textDecorationLine,
              s.textDecorationThickness,
              s.stroke,
              el.getAttribute('aria-pressed'),
            ]
          })
        const before = await snapshot()
        await expect
          .poll(
            async () => {
              await control.hover()
              return snapshot()
            },
            { message: `${name} hover` },
          )
          .not.toEqual(before)
      }
      expect(checked, 'controls checked').toBeGreaterThanOrEqual(12)
    })

    test(`states: ${style} ${theme} controls show keyboard focus`, async ({ page }) => {
      await openCaged(page, style, theme)
      await prepareStates(page)
      let checked = 0
      for (const [name, selector, carrierSelector] of CONTROLS) {
        const control = page.locator(selector).first()
        if (!(await control.isVisible())) continue
        checked += 1
        const target = carrier(control, carrierSelector)
        const before = await target.evaluate((el) => {
          const s = getComputedStyle(el)
          return { boxShadow: s.boxShadow, stroke: s.stroke }
        })
        await expect
          .poll(
            async () => {
              await control.evaluate((el) => (el as HTMLElement).focus({ focusVisible: true }))
              return target.evaluate((el, before) => {
                const s = getComputedStyle(el)
                if (el.matches('circle')) return s.stroke !== before.stroke
                return (
                  (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
                  s.boxShadow !== before.boxShadow
                )
              }, before)
            },
            { message: `${name} focus ring` },
          )
          .toBe(true)
      }
      expect(checked, 'controls checked').toBeGreaterThanOrEqual(12)
    })
  }
