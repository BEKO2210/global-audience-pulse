// Language selection (T-065): ?lang= in the URL wins, then the viewer's saved choice, then the system language
// (German → German, everything else → English). Pure functions so they run in the static shell and in tests.

export type Locale = 'de' | 'en'
export const LOCALES: readonly Locale[] = ['de', 'en']
export const STORAGE_KEY = 'gap-lang'

export function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en'
}

/** First system language that is German → 'de'; anything else (or nothing) → 'en'. */
export function fromLanguages(languages: readonly string[] | undefined): Locale {
  const first = languages?.find(Boolean)
  return first?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export function detectLocale(input: {
  search?: string
  stored?: string | null
  languages?: readonly string[]
}): Locale {
  const param = new URLSearchParams(input.search ?? '').get('lang')
  if (isLocale(param)) return param
  if (isLocale(input.stored)) return input.stored
  return fromLanguages(input.languages)
}

/** BCP 47 tag for Intl formatting; en-GB keeps the 24-hour clock and day-month order. */
export const INTL_LOCALE: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' }

/** Per-component messages: the English object must have exactly the German keys. */
export type Messages<T> = { de: T; en: T }
