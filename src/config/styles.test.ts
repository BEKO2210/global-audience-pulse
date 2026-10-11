import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { STYLES, STYLE_IDS } from './styles'

describe('styles (O-014)', () => {
  it('the static shell knows every style and the same theme colours', () => {
    for (const id of STYLE_IDS) {
      expect(html).toContain(
        `${id}: { light: '${STYLES[id].themeColor.light}', dark: '${STYLES[id].themeColor.dark}' }`,
      )
    }
  })
})
