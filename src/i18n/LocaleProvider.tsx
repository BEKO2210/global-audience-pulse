import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { INTL_LOCALE, STORAGE_KEY, detectLocale, type Locale, type Messages } from './locale'

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
