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

export const SITE_URL = 'https://beko2210.github.io/global-audience-pulse/'

/** German is the root URL, English lives at ?lang=en (one page, two hreflang alternates). */
export const localeUrl = (locale: Locale) => (locale === 'de' ? SITE_URL : `${SITE_URL}?lang=en`)

/** Page title and description per language; index.html repeats them for the static shell (checked by a test). */
export const SEO: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  de: {
    title: 'Beste Posting-Zeit weltweit, live – Global Audience Pulse',
    description:
      'Live-Weltuhr für Creator: Wann ist dein Publikum in Europa, Amerika und Asien wach? Score, 7-Tage-Planer und geprüfte Posting-Zeiten für Instagram, TikTok & Co.',
    ogLocale: 'de_DE',
  },
  en: {
    title: 'Best time to post worldwide, live – Global Audience Pulse',
    description:
      'Live world clock for creators: when is your audience in Europe, the Americas and Asia awake? Score, 7-day planner and sourced posting times for Instagram, TikTok and more.',
    ogLocale: 'en_GB',
  },
}

/** Per-component messages: the English object must have exactly the German keys. */
export type Messages<T> = { de: T; en: T }
