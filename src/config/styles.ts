// O-014: three visual styles the viewer can choose (Belkis 2026-10-11: "alle 3, der User entscheidet"), each in
// light and dark. Tokens live in styles.css under [data-style]; this file names them and holds the bits JS needs.

export const STYLE_IDS = ['tafel', 'atlas', 'praezision', 'archiv'] as const
export type StyleId = (typeof STYLE_IDS)[number]
export const DEFAULT_STYLE: StyleId = 'tafel'
export const STYLE_KEY = 'gap-style'

export const STYLES: Record<
  StyleId,
  {
    name: { de: string; en: string }
    note: { de: string; en: string }
    /** browser UI colour (meta theme-color) and the three swatch colours shown in the picker */
    themeColor: { light: string; dark: string }
    swatch: { light: [string, string, string]; dark: [string, string, string] }
  }
> = {
  tafel: {
    name: { de: 'Abflugtafel', en: 'Departure board' },
    note: { de: 'Dunkle Tafel, Bernstein', en: 'Board black, amber' },
    themeColor: { light: '#f4f4f1', dark: '#0f1113' },
    swatch: { light: ['#f4f4f1', '#15171a', '#d98a0b'], dark: ['#0f1113', '#eceae4', '#f5a524'] },
  },
  atlas: {
    name: { de: 'Atlas', en: 'Atlas' },
    note: { de: 'Kartenpapier, Signalrot', en: 'Map paper, signal red' },
    themeColor: { light: '#eef1ee', dark: '#0f1a1d' },
    swatch: { light: ['#eef1ee', '#16292e', '#d7263d'], dark: ['#0f1a1d', '#e6eeec', '#ff5a6e'] },
  },
  praezision: {
    name: { de: 'Präzision', en: 'Precision' },
    note: { de: 'Klares Weiß, Kobalt', en: 'Clean white, cobalt' },
    themeColor: { light: '#fafaf8', dark: '#0b0d12' },
    swatch: { light: ['#fafaf8', '#0d1117', '#2546f0'], dark: ['#0b0d12', '#eef0f4', '#6d84ff'] },
  },
  // Antigravity's "archival paper" palette from the visual audit (Belkis 2026-10-11: "nimm die Farben mit auf")
  archiv: {
    name: { de: 'Archiv', en: 'Archive' },
    note: { de: 'Archivpapier, Zinnober', en: 'Archival paper, vermilion' },
    themeColor: { light: '#f8f6f0', dark: '#161513' },
    swatch: { light: ['#f8f6f0', '#191816', '#d95a1e'], dark: ['#161513', '#ede8de', '#e8743a'] },
  },
}

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && (STYLE_IDS as readonly string[]).includes(value)
}

export function readStoredStyle(): StyleId {
  try {
    const stored = localStorage.getItem(STYLE_KEY)
    return isStyleId(stored) ? stored : DEFAULT_STYLE
  } catch {
    return DEFAULT_STYLE
  }
}
