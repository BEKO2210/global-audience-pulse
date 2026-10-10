type Primitive = string | number | boolean

type Region =
  'us_west' | 'us_east' | 'latam' | 'eu_uk' | 'eu_central' | 'mena' | 'india' | 'east_asia' | 'alle'

export interface AnalyticsEvents {
  Scrub: {
    quelle: 'leiste' | 'prognose' | 'heatmap' | 'tastatur'
    horizont: '24h' | '7d'
    offsetStunden: number
  }
  Horizont: { wert: '24h' | '7d' }
  'Live zurück': undefined
  Gewichtung: { modus: 'value' | 'reach' }
  Zielgruppe: { region: Region; aktiv: boolean; anzahl: number }
  Preset: { name: 'Transatlantik' | 'USA coast-to-coast' | 'Ost-Welle' }
  'Planer Tab': { tab: 'heute' | 'morgen' | '7-tage' }
  'ICS Download': { zielgruppe: 'leer' | 'alle' | 'eigene-auswahl' }
  'Plan kopiert': undefined
  'Link geteilt': { methode: 'native' | 'zwischenablage' }
  'Bericht aufgeklappt': undefined
  Theme: { wert: 'system' | 'light' | 'dark' }
  'Region Details': { region: Exclude<Region, 'alle'> }
  Rechtsseite: { seite: 'impressum' | 'datenschutz' }
  'Web Vitals': {
    metric: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'
    rating: 'good' | 'needs-improvement' | 'poor'
    wert: number
  }
}

export type AnalyticsEventName = keyof AnalyticsEvents

type Plausible = (name: string, options?: { props: Record<string, Primitive> }) => void

declare global {
  interface Window {
    plausible?: Plausible & { q?: unknown[][] }
  }
}

const allowedValues = {
  Scrub: {
    quelle: ['leiste', 'prognose', 'heatmap', 'tastatur'],
    horizont: ['24h', '7d'],
  },
  Horizont: { wert: ['24h', '7d'] },
  'Live zurück': {},
  Gewichtung: { modus: ['value', 'reach'] },
  Zielgruppe: {
    region: [
      'us_west',
      'us_east',
      'latam',
      'eu_uk',
      'eu_central',
      'mena',
      'india',
      'east_asia',
      'alle',
    ],
  },
  Preset: { name: ['Transatlantik', 'USA coast-to-coast', 'Ost-Welle'] },
  'Planer Tab': { tab: ['heute', 'morgen', '7-tage'] },
  'ICS Download': { zielgruppe: ['leer', 'alle', 'eigene-auswahl'] },
  'Plan kopiert': {},
  'Link geteilt': { methode: ['native', 'zwischenablage'] },
  'Bericht aufgeklappt': {},
  Theme: { wert: ['system', 'light', 'dark'] },
  'Region Details': {
    region: ['us_west', 'us_east', 'latam', 'eu_uk', 'eu_central', 'mena', 'india', 'east_asia'],
  },
  Rechtsseite: { seite: ['impressum', 'datenschutz'] },
  'Web Vitals': {
    metric: ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'],
    rating: ['good', 'needs-improvement', 'poor'],
  },
} as const satisfies Record<AnalyticsEventName, Record<string, readonly string[]>>

const numericProps: Partial<Record<AnalyticsEventName, readonly string[]>> = {
  Scrub: ['offsetStunden'],
  Zielgruppe: ['anzahl'],
  'Web Vitals': ['wert'],
}
const booleanProps: Partial<Record<AnalyticsEventName, readonly string[]>> = {
  Zielgruppe: ['aktiv'],
}
const lastSent = new Map<string, number>()

function cleanProps(name: AnalyticsEventName, props: unknown): Record<string, Primitive> {
  if (!props || typeof props !== 'object') return {}
  const result: Record<string, Primitive> = {}
  const input = props as Record<string, unknown>
  for (const [key, values] of Object.entries(allowedValues[name])) {
    if (typeof input[key] === 'string' && (values as readonly string[]).includes(input[key])) {
      result[key] = input[key]
    }
  }
  for (const key of numericProps[name] ?? []) {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) result[key] = input[key]
  }
  for (const key of booleanProps[name] ?? []) {
    if (typeof input[key] === 'boolean') result[key] = input[key]
  }
  return result
}

/** Sends only the explicitly modelled, non-personal event properties. Safe without Plausible. */
export function track<Name extends AnalyticsEventName>(
  name: Name,
  ...args: AnalyticsEvents[Name] extends undefined ? [] : [props: AnalyticsEvents[Name]]
) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return
  const props = cleanProps(name, args[0])
  const signature = `${name}:${JSON.stringify(props)}`
  const now = Date.now()
  const throttleMs = name === 'Scrub' ? 500 : name === 'Rechtsseite' ? 1_000 : 0
  if (throttleMs && now - (lastSent.get(signature) ?? 0) < throttleMs) return
  lastSent.set(signature, now)
  try {
    window.plausible(name, Object.keys(props).length ? { props } : undefined)
  } catch {
    // Analytics must never affect the application when a blocker replaces or breaks the script.
  }
}

type Metric = AnalyticsEvents['Web Vitals']['metric']
type Rating = AnalyticsEvents['Web Vitals']['rating']

const thresholds: Record<Metric, readonly [number, number]> = {
  LCP: [2_500, 4_000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1_800, 3_000],
  TTFB: [800, 1_800],
}

function reportMetric(metric: Metric, value: number) {
  const [good, poor] = thresholds[metric]
  const rating: Rating = value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor'
  const rounded = metric === 'CLS' ? Math.round(value * 1_000) / 1_000 : Math.round(value)
  track('Web Vitals', { metric, rating, wert: rounded })
}

let vitalsStarted = false

/** Registers small, dependency-free observers and reports final LCP/CLS/INP values. */
export function initWebVitals() {
  if (vitalsStarted || typeof window === 'undefined' || !('PerformanceObserver' in window)) return
  vitalsStarted = true

  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined
  if (navigation) reportMetric('TTFB', navigation.responseStart)

  let lcp = 0
  let cls = 0
  let clsWindow = 0
  let clsWindowStart = 0
  let lastShift = 0
  let inp = 0
  const observers: PerformanceObserver[] = []
  const observe = (
    type: string,
    callback: (entries: PerformanceEntry[]) => void,
    durationThreshold?: number,
  ) => {
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()))
      observer.observe({ type, buffered: true, durationThreshold } as PerformanceObserverInit)
      observers.push(observer)
    } catch {
      // Unsupported entry types are expected on older browsers.
    }
  }

  observe('paint', (entries) => {
    const fcp = entries.find((entry) => entry.name === 'first-contentful-paint')
    if (fcp) reportMetric('FCP', fcp.startTime)
  })
  observe('largest-contentful-paint', (entries) => {
    lcp = entries.at(-1)?.startTime ?? lcp
  })
  observe('layout-shift', (entries) => {
    for (const entry of entries as (PerformanceEntry & {
      value: number
      hadRecentInput: boolean
    })[]) {
      if (entry.hadRecentInput) continue
      if (entry.startTime - lastShift > 1_000 || entry.startTime - clsWindowStart > 5_000) {
        clsWindow = entry.value
        clsWindowStart = entry.startTime
      } else {
        clsWindow += entry.value
      }
      lastShift = entry.startTime
      cls = Math.max(cls, clsWindow)
    }
  })
  observe(
    'event',
    (entries) => {
      for (const entry of entries as (PerformanceEntry & {
        duration: number
        interactionId?: number
      })[]) {
        if (entry.interactionId && entry.duration > inp) inp = entry.duration
      }
    },
    40,
  )

  let reported = false
  const reportFinal = () => {
    if (reported) return
    reported = true
    if (lcp) reportMetric('LCP', lcp)
    reportMetric('CLS', cls)
    if (inp) reportMetric('INP', inp)
    observers.forEach((observer) => observer.disconnect())
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') reportFinal()
  })
  window.addEventListener('pagehide', reportFinal, { once: true })
}
