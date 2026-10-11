import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  INTL_LOCALE,
  SEO,
  SITE_URL,
  STORAGE_KEY,
  detectLocale,
  localeUrl,
  type Locale,
  type Messages,
} from './locale'

interface LocaleState {
  locale: Locale
  intl: string
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleState>({
  locale: 'de',
  intl: INTL_LOCALE.de,
  setLocale: () => undefined,
})

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'de'
  return detectLocale({
    search: window.location.search,
    stored: readStored(),
    languages: navigator.languages?.length ? navigator.languages : [navigator.language],
  })
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>(initialLocale)
  const setLocale = useCallback((next: Locale) => {
    setState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode: choice lasts for this page view */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    const seo = SEO[locale]
    document.title = seo.title
    const set = (selector: string, attr: string, value: string) =>
      document.head.querySelector(selector)?.setAttribute(attr, value)
    set('meta[name="description"]', 'content', seo.description)
    set('meta[property="og:title"]', 'content', seo.title)
    set('meta[property="og:description"]', 'content', seo.description)
    set('meta[property="og:locale"]', 'content', seo.ogLocale)
    set('meta[property="og:url"]', 'content', localeUrl(locale))
    set('meta[name="twitter:title"]', 'content', seo.title)
    set('meta[name="twitter:description"]', 'content', seo.description)
    set('link[rel="canonical"]', 'href', localeUrl(locale))
    // O-010: preview image per language (crawlers that run JS; the static HTML keeps the German one)
    const image = `${SITE_URL}${locale === 'en' ? 'og-image-en.png' : 'og-image.png'}`
    set('meta[property="og:image"]', 'content', image)
    set('meta[name="twitter:image"]', 'content', image)
  }, [locale])
  const value = useMemo(
    () => ({ locale, intl: INTL_LOCALE[locale], setLocale }),
    [locale, setLocale],
  )
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}

/** The current language's half of a component's message object. */
export function useMessages<T>(messages: Messages<T>): T {
  return messages[useContext(LocaleContext).locale]
}
