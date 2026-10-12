import type { Locale } from '../i18n/locale'

export function formatPercent(value: number, locale: Locale): string {
  return `${value}${locale === 'de' ? ' %' : '%'}`
}

/** Keeps a number with its unit on one line in balanced headlines ("36 points", "36 Punkten"). */
export function glueNumberUnits(text: string): string {
  return text.replace(/(\d+) (Punkten?|points?|pts)\b/g, '$1 $2')
}
