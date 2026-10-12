import type { Locale } from '../i18n/locale'

/**
 * "28 %" (de) / "28%" (en). The German gap is a plain space on purpose: the e2e suite matches
 * it with a RegExp (`\d+ % deiner Zielgruppe`), and Playwright does not whitespace-normalise
 * RegExp matchers. Elements that must not wrap use CSS `white-space: nowrap`.
 */
export function formatPercent(value: number, locale: Locale): string {
  return `${value}${locale === 'de' ? ' %' : '%'}`
}

/**
 * Keeps a number with its unit on one line in balanced headlines ("36 points", "36 Punkten",
 * "3 Std", "15 min"): a no-break space (U+00A0) replaces the gap, so the unit never orphans.
 */
export function glueNumberUnits(text: string): string {
  return text.replace(/(\d+) (Punkten?|points?|pts|Min|Std|Tage?n?|min|h|days?)\b/g, '$1\u00A0$2')
}
