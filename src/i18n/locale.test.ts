import { describe, expect, it } from 'vitest'
import { detectLocale, fromLanguages } from './locale'

describe('locale detection', () => {
  it('follows the system language: German → de, anything else → en', () => {
    expect(fromLanguages(['de-DE', 'en-US'])).toBe('de')
    expect(fromLanguages(['de-AT'])).toBe('de')
    expect(fromLanguages(['en-US', 'de-DE'])).toBe('en')
    expect(fromLanguages(['fr-FR'])).toBe('en')
    expect(fromLanguages([])).toBe('en')
  })

  it('lets ?lang= win over a saved choice, and a saved choice win over the system', () => {
    expect(detectLocale({ search: '?lang=en', stored: 'de', languages: ['de-DE'] })).toBe('en')
    expect(detectLocale({ search: '', stored: 'de', languages: ['en-US'] })).toBe('de')
    expect(detectLocale({ search: '?lang=xx', stored: null, languages: ['de-CH'] })).toBe('de')
  })
})
