// Test cage – fluid layouts hit in-between values (6.4vw at 390 px = 24.96 px). Sweep the common widths so type,
// spacing and overflow hold everywhere, not only at the two project viewports.
import { expect, test } from '@playwright/test'
import { TYPE_SCALE, WEIGHTS, openCaged, probe } from './probe'

const WIDTHS = [360, 412, 600, 720, 768, 820, 900, 1024, 1280, 1440, 1920]

test.describe('cage: widths', () => {
  for (const width of WIDTHS)
    test(`cage: ${width}px`, async ({ page }) => {
      test.skip(test.info().project.name !== 'chromium-desktop', 'one sweep is enough')
      await page.setViewportSize({ width, height: 900 })
      await openCaged(page, 'praezision', 'light')
      const p = await probe(page)
      expect(p.findings, 'rule breaks').toEqual([])
      expect(
        p.fontSizes.filter((size) => !TYPE_SCALE.includes(size)),
        'off the type scale',
      ).toEqual([])
      expect(
        p.weights.filter((weight) => !WEIGHTS.includes(weight)),
        'off the weight set',
      ).toEqual([])
    })
})
