type Locale = 'de' | 'en'

/**
 * "12 Min", "3 Std 5 Min", "4 Tagen" / "12 min", "3 h 5 min", "4 days" — readable at any age.
 * Plain spaces on purpose: the e2e suite matches this output with RegExps (`\d+ (Min|Std)`),
 * and Playwright does not whitespace-normalise RegExp matchers.
 */
export function humanAgo(minutes: number, locale: Locale = 'de') {
  const [h, m] = locale === 'de' ? ['Std', 'Min'] : ['h', 'min']
  if (minutes < 60) return `${minutes} ${m}`
  if (minutes < 48 * 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest ? `${hours} ${h} ${rest} ${m}` : `${hours} ${h}`
  }
  const days = Math.floor(minutes / 1440)
  return locale === 'de' ? `${days} Tagen` : `${days} days`
}

export function minutesAgo(value: string, now: number) {
  return Math.max(0, Math.round((now - Date.parse(value)) / 60_000))
}

/** "2 Min 5 s" / "2 min 5 s": a no-break space (U+00A0) binds each number to its unit. */
export function formatDuration(seconds: number, locale: Locale = 'de') {
  if (seconds < 60) return `${seconds}\u00A0s`
  return `${Math.floor(seconds / 60)}\u00A0${locale === 'de' ? 'Min' : 'min'} ${seconds % 60}\u00A0s`
}

/** "vor 12 Min" / "12 min ago" */
export function agoPhrase(minutes: number, locale: Locale = 'de') {
  return locale === 'de' ? `vor ${humanAgo(minutes, locale)}` : `${humanAgo(minutes, locale)} ago`
}
