import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { DATA_SOURCES, MODEL_CONFIG, PHASES, STATUS_LEVELS } from './config/model'
import { MOTION } from './config/motion'
import { PRESETS, REGIONS, REGION_BY_ID, type RegionId } from './config/regions'
import { useAudience } from './hooks/useAudience'
import { useLiveData } from './hooks/useLiveData'
import { useScoreGrid } from './hooks/useScoreGrid'
import { useDeferredMount } from './hooks/useDeferredMount'
import { ReportTeaser, useLiveReport } from './components/reportShared'
const LiveReport = lazy(() => import('./components/LiveReport'))
const AiPipeline = lazy(() => import('./components/AiPipeline'))
const WeeklyReview = lazy(() => import('./components/WeeklyReview'))
import {
  circularMean,
  fastZonedParts,
  formatDecimalHour,
  findNextOffsetChange,
  formatTime,
  localDecimalHourFast,
  getOffsetTable,
  offsetAt,
  relativeTime,
  snapToMinutes,
  startOfNextZonedDay,
  timeZoneName,
} from './lib/time'

import { findBestWindows, normalizedWeights, phaseAt, statusFor } from './lib/model'
import { initWebVitals, track } from './lib/analytics'
import { FALLBACK_SNAPSHOT, loadSnapshot, type Snapshot } from './lib/snapshot'
import { Dial } from './components/Dial'
import { Forecast } from './components/Forecast'
import { Heatmap } from './components/Heatmap'
import { LiveClock } from './components/Clock'
import { Planner } from './components/Planner'
import { RegionCards } from './components/RegionCards'
import { AnimatedNumber } from './components/AnimatedNumber'
import { Flag } from './components/Flag'
import { PhaseIcon } from './components/PhaseIcon'
import { MobileTimeBar } from './components/MobileTimeBar'
import { SiteFooter } from './components/SiteFooter'
import { Playbooks } from './components/Playbooks'
import { WeightingToggle } from './components/WeightingToggle'
import { PostingPlan } from './components/PostingPlan'
import { AskPulse } from './components/AskPulse'
import { CalendarButton } from './components/CalendarButton'
import { ReminderButton } from './components/ReminderButton'
import { DisplayMenu, type ThemePreference } from './components/DisplayMenu'
import { STYLES, STYLE_KEY, readStoredStyle, type StyleId } from './config/styles'
import { loadStyleFonts } from './lib/styleFonts'
import { restoreReminders } from './lib/reminder'
import { pickPostingTimes } from './lib/postingPlan'
import { awakeSummary, forecastPeak, overlapHour } from './lib/captions'
import { Wordmark } from './components/LogoMark'
import { UpdateToast } from './components/UpdateToast'
import { useLocale, useMessages } from './i18n/LocaleProvider'
import type { Locale, Messages } from './i18n/locale'
import { cityName, phaseName, presetName, regionName, statusText } from './i18n/labels'
import { agoPhrase } from './lib/ago'

const DE = {
  and: 'und',
  yearUnknown: 'Jahr unbekannt',
  dataYear: 'Datenjahr',
  loading: 'wird geladen',
  refreshTitle: (min: number) => `Automatischer Abruf alle ${min} Min. · Klick lädt sofort neu`,
  measured: (ago: string) => `Messdaten ${ago}`,
  noData: 'Messdaten nicht verfügbar',
  language: 'Sprache',
  eyebrowFallback: 'Beispieldaten, Offline-Modell',
  eyebrowLoading: 'Daten werden geladen',
  regionsActive: (n: number) => `${n} Regionen aktiv`,
  headline: 'Jetzt posten oder warten?',
  noneSelected: 'Keine Regionen ausgewählt',
  noneSelectedHint: 'Wähle mindestens einen Markt aus, um weltweite Posting-Fenster zu berechnen.',
  activateAll: 'Alle Regionen aktivieren',
  leads: (city: string, score: number) => `${city} führt mit ${score}.`,
  sleeps: (cities: string, n: number) => `${cities} ${n === 1 ? 'schläft' : 'schlafen'}.`,
  allAwake: 'Alle Kernmärkte sind wach.',
  bestWindow: 'Optimales Zeitfenster',
  potential: (n: number) => `+${n} Pkt. Potenzial`,
  bestRemaining: 'bestes verbleibendes Fenster',
  bestRegion: 'Beste Region',
  primeNow: 'Gerade Primetime',
  ofRegions: (a: number, b: number) => `${a} von ${b} Regionen`,
  mapLoading: 'Karte wird geladen',
  nextChange: 'Nächster Wechsel',
  primeStarts: (when: string, city: string) => `In ${when} beginnt Primetime in ${city}`,
  secondWindow: 'Zweites Zeitfenster heute',
  noSecondWindow: 'Kein weiteres Fenster heute',
  dstChange: 'Zeitumstellung',
  corridors: 'Strategische Posting-Korridore',
  nRegions: (n: number) => `${n} Regionen`,
  activateAllN: (n: number) => `Alle ${n} Regionen aktivieren`,
  method: 'Methodik & Quellen',
  methodTitle: ['Messbar, modelliert,', 'transparent.'],
  methodText: (measured: number, base: number) => (
    <>
      Der Score verbindet die geglättete menschliche Aufmerksamkeitskurve mit den stündlichen
      Wikipedia-Abrufen der jeweiligen Sprachregion:{' '}
      <strong>
        {measured} % Messprofil + {base} % Baseline
      </strong>
      . <strong>Reichweite</strong> basiert auf Internetnutzern; <strong>Werbewert</strong>{' '}
      multipliziert sie mit dem BIP pro Kopf. Beide Weltbank-Gewichte werden für deine Auswahl live
      neu normiert. Der US-Ost/West-Split ist eine dokumentierte statische Census-Näherung; USA und
      UK bleiben bewusst modellbasiert.
    </>
  ),
  reach: 'Reichweite',
  value: 'Werbewert',
  weightsUnavailable: 'Gewichtungsdaten sind derzeit nicht verfügbar.',
  wbPopulation: 'Weltbank · Bevölkerung',
  wbInternet: 'Weltbank · Internetnutzung',
  wbGdp: 'Weltbank · BIP pro Kopf',
  wikiProfile: 'Datenprofil',
  fetched: (wb: string, wiki: string) => `Abruf: Weltbank ${wb} · Wikimedia ${wiki}`,
  holidaysSource: 'Nager.Date · Feiertage',
  holidaysNote: 'bundesweit, beim Build',
  tokens: 'Design-Tokens',
  limitations:
    'Wikipedia ist ein Aktivitäts-Proxy, keine Social-Plattform-Messung. Englischsprachige Wikipedia wird bewusst nicht für USA/UK verwendet, da sie Zeitzonen mischt. Ländergruppen und der dokumentierte US-Split approximieren globale Zielgruppen; sie ersetzen keine eigenen Analytics. Bundesweite Feiertage (USA, Brasilien, UK, Deutschland, Japan) werden wie ein Sonntag gerechnet; für Nahost und Indien liefert die Quelle keine Feiertage.',
  close: 'Schließen',
  inAudience: 'Ist in deiner Zielgruppe',
  addAudience: 'Zur Zielgruppe hinzufügen',
  calSummary: 'Posting-Fenster (Global Audience Pulse)',
  remindTitle: 'Jetzt posten',
  remindBody: (score: number) => `Dein Posting-Fenster beginnt – Score ${score}.`,
  capMap: (when: string | null, awake: number, total: number, prime: string) =>
    `${when ? `Um ${when}` : 'Gerade'} wach: ${awake} von ${total} Märkten · ${prime ? `Primetime in ${prime}` : 'kein Markt in der Primetime'}.`,
  capForecast: (score: number, at: string, now: number) =>
    `Höhepunkt der nächsten 24 Stunden: Score ${score} um ${at} (jetzt ${now}).`,
  capHeatmap: (count: number, total: number, at: string, threshold: number) =>
    `Die meisten Märkte gleichzeitig aktiv: ${count} von ${total} um ${at} (Score ab ${threshold}).`,
  capHeatmapNone: (threshold: number) =>
    `In den nächsten 24 Stunden erreicht kein Markt Score ${threshold}.`,
  capDial: (time: string, phase: string) =>
    `Gewichtete Ortszeit deines Publikums: ${time} – ${phase}.`,
}
// English must provide exactly the German keys.
const EN: typeof DE = {
  and: 'and',
  yearUnknown: 'year unknown',
  dataYear: 'Data year',
  loading: 'loading',
  refreshTitle: (min: number) => `Refreshes every ${min} min · click to refresh now`,
  measured: (ago: string) => `Data ${ago}`,
  noData: 'Data unavailable',
  language: 'Language',
  eyebrowFallback: 'Sample data, offline model',
  eyebrowLoading: 'Loading data',
  regionsActive: (n: number) => `${n} regions active`,
  headline: 'Post now or wait?',
  noneSelected: 'No regions selected',
  noneSelectedHint: 'Pick at least one market to calculate posting windows worldwide.',
  activateAll: 'Select all regions',
  leads: (city: string, score: number) => `${city} leads with ${score}.`,
  sleeps: (cities: string, n: number) => `${cities} ${n === 1 ? 'is' : 'are'} asleep.`,
  allAwake: 'All core markets are awake.',
  bestWindow: 'Best posting window',
  potential: (n: number) => `+${n} pts potential`,
  bestRemaining: 'best window left today',
  bestRegion: 'Top region',
  primeNow: 'In prime time now',
  ofRegions: (a: number, b: number) => `${a} of ${b} regions`,
  mapLoading: 'Loading map',
  nextChange: 'Next change',
  primeStarts: (when: string, city: string) => `Prime time starts in ${city} in ${when}`,
  secondWindow: 'Second window today',
  noSecondWindow: 'No further window today',
  dstChange: 'Clock change',
  corridors: 'Strategic posting corridors',
  nRegions: (n: number) => `${n} regions`,
  activateAllN: (n: number) => `Select all ${n} regions`,
  method: 'Method & sources',
  methodTitle: ['Measured, modelled,', 'transparent.'],
  methodText: (measured: number, base: number) => (
    <>
      The score combines a smoothed human attention curve with hourly Wikipedia page views in each
      language region:{' '}
      <strong>
        {measured} % measured profile + {base} % baseline
      </strong>
      . <strong>Reach</strong> is based on internet users; <strong>Ad value</strong> multiplies it
      by GDP per capita. Both World Bank weightings are re-normalised live for your selection. The
      US east/west split is a documented static census approximation; the US and UK stay
      deliberately model-based.
    </>
  ),
  reach: 'Reach',
  value: 'Ad value',
  weightsUnavailable: 'Weighting data is currently unavailable.',
  wbPopulation: 'World Bank · Population',
  wbInternet: 'World Bank · Internet use',
  wbGdp: 'World Bank · GDP per capita',
  wikiProfile: 'Data profile',
  fetched: (wb: string, wiki: string) => `Fetched: World Bank ${wb} · Wikimedia ${wiki}`,
  holidaysSource: 'Nager.Date · Public holidays',
  holidaysNote: 'nationwide, at build time',
  tokens: 'Design tokens',
  limitations:
    'Wikipedia is a proxy for activity, not a social-platform measurement. English Wikipedia is deliberately not used for the US/UK because it mixes time zones. Country groups and the documented US split approximate global audiences; they do not replace your own analytics. Nationwide public holidays (US, Brazil, UK, Germany, Japan) count like a Sunday; the source has no holidays for the Middle East and India.',
  close: 'Close',
  inAudience: 'In your audience',
  addAudience: 'Add to audience',
  calSummary: 'Posting window (Global Audience Pulse)',
  remindTitle: 'Post now',
  remindBody: (score) => `Your posting window starts – score ${score}.`,
  capMap: (when, awake, total, prime) =>
    `${when ? `At ${when}` : 'Right now'}, ${awake} of ${total} markets are awake · ${prime ? `prime time in ${prime}` : 'no market in prime time'}.`,
  capForecast: (score, at, now) =>
    `Peak of the next 24 hours: score ${score} at ${at} (now ${now}).`,
  capHeatmap: (count, total, at, threshold) =>
    `Most markets active at once: ${count} of ${total} at ${at} (score ${threshold}+).`,
  capHeatmapNone: (threshold) => `No market reaches score ${threshold} in the next 24 hours.`,
  capDial: (time, phase) =>
    `Your audience’s weighted local time: ${time} – ${phase.toLowerCase()}.`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const WorldMap = lazy(() =>
  import('./components/WorldMap').then((module) => ({ default: module.WorldMap })),
)

function Section({
  children,
  className = '',
  delay = 0,
  immediate = false,
  defer = false,
  placeholderHeight = 640,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  /** Render without entrance fade (used for the hero, which holds the LCP element). */
  immediate?: boolean
  /** Below-the-fold: mount after first paint (idle slot) or when scrolled near. */
  defer?: boolean
  placeholderHeight?: number
}) {
  const { attach: attachPlaceholder, mounted } = useDeferredMount<HTMLDivElement>(defer)
  const [visible, setVisible] = useState(false)
  // MotionConfig "user" still runs opacity fades; skip the entrance entirely for reduced motion.
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    const fallback = window.setTimeout(() => setVisible(true), 1_200)
    return () => clearTimeout(fallback)
  }, [])
  if (!mounted)
    return (
      <div
        ref={attachPlaceholder}
        className={`${className} deferred-placeholder`}
        style={{ minHeight: placeholderHeight }}
        aria-busy="true"
      />
    )
  return (
    <motion.div
      className={className}
      initial={reduceMotion || immediate ? false : { opacity: 0, y: 8 }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setVisible(true)}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduceMotion ? 0 : MOTION.entrance, delay, ease: MOTION.ease }}
    >
      {children}
    </motion.div>
  )
}

function nextPhaseStart(region: (typeof REGIONS)[number], from: Date, phaseId = 'prime') {
  const targetHour = PHASES.find((phase) => phase.id === phaseId)?.from ?? PHASES[0].from
  const parts = fastZonedParts(from, region.timeZone)
  const afterStart = parts.hour + parts.minute / 60 + parts.second / 3_600 >= targetHour
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day + (afterStart ? 1 : 0), targetHour)
  const table = getOffsetTable(region.timeZone, from)
  let result = wall - offsetAt(from, table) * 60_000
  result = wall - offsetAt(new Date(result), table) * 60_000
  return new Date(result)
}

function joinList(items: readonly string[], and: string) {
  if (items.length < 2) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`
}

function yearRange(dataYears: Record<string, number>, indicator: string, t = DE) {
  const years = Object.entries(dataYears)
    .filter(([key]) => key.endsWith(`.${indicator}`))
    .map(([, year]) => year)
  if (!years.length) return t.yearUnknown
  const min = Math.min(...years)
  const max = Math.max(...years)
  return `${t.dataYear} ${min}${min === max ? '' : `–${max}`}`
}

/** "vor 25 Min" / "25 min ago"; hours and days round like before. */
function freshness(date: string, locale: Locale = 'de') {
  if (!date) return M[locale].loading
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000))
  const rounded =
    minutes < 60
      ? minutes
      : minutes < 48 * 60
        ? Math.round(minutes / 60) * 60
        : Math.round(minutes / 1440) * 1440
  return agoPhrase(rounded, locale)
}

function Header({
  snapshot,
  liveScore,
  themePreference,
  activeTheme,
  onTheme,
  style,
  onStyle,
  onRefresh,
}: {
  snapshot: Snapshot
  liveScore?: number
  themePreference: ThemePreference
  activeTheme: 'light' | 'dark'
  onTheme: (theme: ThemePreference) => void
  style: StyleId
  onStyle: (style: StyleId) => void
  onRefresh: () => void
}) {
  const { locale, setLocale } = useLocale()
  const t = M[locale]
  return (
    <motion.header
      className="site-header"
      // No entrance: the static shell in index.html already shows the header before React runs.
      initial={false}
    >
      <Wordmark score={liveScore} />
      <div className="header-actions">
        <button
          className="freshness"
          onClick={onRefresh}
          title={t.refreshTitle(MODEL_CONFIG.liveRefreshMinutes)}
        >
          <i className={snapshot.generatedAt ? '' : 'offline'} />
          <span className="freshness-text">
            {snapshot.generatedAt
              ? t.measured(freshness(snapshot.sources.wikimedia.fetchedAt, locale))
              : t.noData}
          </span>
        </button>
        <LiveClock />
        <div className="lang-toggle" aria-label={t.language} role="group">
          {(['de', 'en'] as const).map((value) => (
            <button
              key={value}
              lang={value}
              onClick={() => {
                track('Sprache', { wert: value })
                setLocale(value)
              }}
              aria-pressed={locale === value}
              aria-label={value === 'de' ? 'Deutsch' : 'English'}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <DisplayMenu
          style={style}
          onStyle={onStyle}
          theme={themePreference}
          activeTheme={activeTheme}
          onTheme={onTheme}
        />
      </div>
    </motion.header>
  )
}

function initialThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem('gap-theme')
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export default function App() {
  // reducedMotion="user" alone still runs opacity/colour tweens; make them instant as well.
  const reduceMotion = useReducedMotion()
  const { locale, intl } = useLocale()
  const t = useMessages(M)
  const [snapshot, setSnapshot] = useState<Snapshot>(FALLBACK_SNAPSHOT)
  const [snapshotState, setSnapshotState] = useState<'loading' | 'live' | 'fallback'>('loading')
  const [minuteNow, setMinuteNow] = useState(() => new Date())
  const liveReport = useLiveReport()
  const [scrubbed, setScrubbed] = useState<Date | null>(null)
  const [detail, setDetail] = useState<RegionId | null>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(initialThemePreference)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  )
  const activeTheme = themePreference === 'system' ? systemTheme : themePreference
  const [style, setStyle] = useState<StyleId>(readStoredStyle)
  const [mobileHorizon, setMobileHorizon] = useState<24 | 168>(24)
  const [heroCountsFromZero] = useState(() => {
    try {
      const seen = sessionStorage.getItem('gap-entrance-seen') === '1'
      sessionStorage.setItem('gap-entrance-seen', '1')
      return !seen
    } catch {
      return true
    }
  })
  const { selected, toggle, selectAll, setSelected, weightingMode, setWeightingMode } =
    useAudience()
  useEffect(() => initWebVitals(), [])
  // T-081: reminders set in an earlier visit fire again while the page is open
  useEffect(() => restoreReminders(), [])
  const refreshSnapshot = useCallback(() => {
    void loadSnapshot(import.meta.env.BASE_URL, true).then((next) => {
      setSnapshot(next)
      setSnapshotState(next.generatedAt ? 'live' : 'fallback')
    })
  }, [])
  useEffect(() => refreshSnapshot(), [refreshSnapshot])
  useEffect(() => {
    let interval = 0
    const timeout = window.setTimeout(
      () => {
        setMinuteNow(new Date())
        interval = window.setInterval(() => setMinuteNow(new Date()), 60_000)
      },
      60_000 - (Date.now() % 60_000),
    )
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const update = (event: MediaQueryListEvent | MediaQueryList) =>
      setSystemTheme(event.matches ? 'light' : 'dark')
    update(media)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme
    document.documentElement.dataset.style = style
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', STYLES[style].themeColor[activeTheme])
    void loadStyleFonts(style)
    try {
      localStorage.setItem('gap-theme', themePreference)
      localStorage.setItem(STYLE_KEY, style)
    } catch {
      /* optional */
    }
  }, [activeTheme, themePreference, style])
  useEffect(() => {
    if (!detail) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetail(null)
      if (event.key === 'Tab' && sheetRef.current) {
        const controls = [
          ...sheetRef.current.querySelectorAll<HTMLElement>(
            'button,[href],[tabindex]:not([tabindex="-1"])',
          ),
        ]
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [detail])
  const { live, status: liveStatus } = useLiveData(snapshot)
  const activeSnapshot = useMemo<Snapshot>(
    () => ({
      ...snapshot,
      weightingMode,
      profiles: Object.fromEntries(
        Object.entries(snapshot.profiles).map(([id, profile]) => {
          const measure = live[id as RegionId]
          return [id, measure ? { ...profile, deviation: measure.deviation } : profile]
        }),
      ) as Snapshot['profiles'],
    }),
    [snapshot, weightingMode, live],
  )
  const date = scrubbed ?? minuteNow
  const scrubTo = useCallback(
    (next: Date) => setScrubbed(snapToMinutes(next, MODEL_CONFIG.scanStepMinutes)),
    [],
  )
  const { grid: scoreGrid, ready: scoreGridReady } = useScoreGrid(activeSnapshot, minuteNow)
  const score = scoreGrid.globalAt(selected, date)
  const status = statusFor(score)
  const forecast = useMemo(
    () => scoreGrid.points(selected, minuteNow, 24),
    [scoreGrid, minuteNow, selected],
  )
  const mobileForecast = useMemo(
    () => scoreGrid.points(selected, minuteNow, mobileHorizon),
    [scoreGrid, minuteNow, selected, mobileHorizon],
  )
  const windows24 = useMemo(() => {
    const searchStart = new Date(minuteNow.getTime() - MODEL_CONFIG.windowMinutes * 60_000)
    return (
      findBestWindows(
        (d) => scoreGrid.globalAt(selected, d),
        searchStart,
        24 + MODEL_CONFIG.windowMinutes / 60,
        MODEL_CONFIG.windowMinutes,
        4,
      )
        .filter(
          (window) =>
            window.end > minuteNow && window.start < new Date(minuteNow.getTime() + 24 * 3_600_000),
        )
        .slice(0, 3)
        // Ranked by score: [0] is the best window shown in the hero, [1] the second best.
        .sort((a, b) => b.score - a.score)
    )
  }, [minuteNow, selected, scoreGrid])
  const plannerSets = useMemo(() => {
    const tomorrow = startOfNextZonedDay(
      minuteNow,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    )
    const todayHours = Math.max(1, (tomorrow.getTime() - minuteNow.getTime()) / 3_600_000)
    return {
      today: findBestWindows(
        (d) => scoreGrid.globalAt(selected, d),
        minuteNow,
        todayHours,
        MODEL_CONFIG.windowMinutes,
        3,
      ),
      tomorrow: findBestWindows(
        (d) => scoreGrid.globalAt(selected, d),
        tomorrow,
        24,
        MODEL_CONFIG.windowMinutes,
        3,
      ),
      week: findBestWindows(
        (d) => scoreGrid.globalAt(selected, d),
        minuteNow,
        24 * 7,
        MODEL_CONFIG.windowMinutes,
        5,
      ),
    }
  }, [minuteNow, selected, scoreGrid])
  const regionScores = REGIONS.filter((r) => selected.includes(r.id))
    .map((region) => ({ region, score: scoreGrid.activityAt(region.id, date) }))
    .sort((a, b) => b.score - a.score)
  const regionsInPrime = regionScores.filter(
    ({ region }) => phaseAt(localDecimalHourFast(date, region.timeZone)).id === 'prime',
  ).length
  const weights = normalizedWeights(selected, activeSnapshot)
  // T-072: next good + study-backed hour per platform, recomputed each minute (not while scrubbing).
  const postingPicks = useMemo(() => {
    if (!scoreGridReady) return []
    const audienceWeights = normalizedWeights(selected, activeSnapshot)
    return pickPostingTimes({
      scoreAt: (d) => scoreGrid.globalAt(selected, d),
      regions: selected.map((id) => ({
        id,
        city: REGION_BY_ID[id].city,
        timeZone: REGION_BY_ID[id].timeZone,
        weight: audienceWeights[id] ?? 0,
      })),
      from: minuteNow,
      goodScore: STATUS_LEVELS[1].min,
    })
  }, [scoreGridReady, scoreGrid, selected, activeSnapshot, minuteNow])
  const worldMean = circularMean(
    selected.map((id) => localDecimalHourFast(date, REGION_BY_ID[id].timeZone)),
    selected.map((id) => weights[id] ?? 0),
  )
  // T-017: one sentence per chart from the same numbers the chart draws.
  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const captions = useMemo(() => {
    if (!selected.length) return null
    const phases = REGIONS.filter((r) => selected.includes(r.id)).map((r) => {
      const phase = phaseAt(localDecimalHourFast(date, r.timeZone))
      return { city: cityName(r.id, r.city, locale), phase: phase.id }
    })
    const awake = awakeSummary(phases)
    const peak = forecastPeak(forecast)
    const threshold = STATUS_LEVELS[1].min
    const hours = Array.from(
      { length: 24 },
      (_, i) => new Date(minuteNow.getTime() + i * 3_600_000),
    )
    const overlap = overlapHour(
      hours,
      selected,
      (id, d) => scoreGrid.activityAt(id as RegionId, d),
      threshold,
    )
    const meanPhase = phaseAt(worldMean)
    return {
      map: t.capMap(
        scrubbed ? formatTime(date, viewerZone) : null,
        awake.awake,
        awake.total,
        joinList(awake.prime, t.and),
      ),
      forecast: peak
        ? t.capForecast(
            peak.score,
            formatTime(snapToMinutes(peak.date, 15), viewerZone),
            Math.round(forecast[0]?.score ?? 0),
          )
        : undefined,
      heatmap: overlap
        ? t.capHeatmap(
            overlap.count,
            selected.length,
            formatTime(snapToMinutes(overlap.date, 15), viewerZone),
            threshold,
          )
        : t.capHeatmapNone(threshold),
      dial: t.capDial(
        formatDecimalHour(worldMean),
        phaseName(meanPhase.id, meanPhase.name, locale),
      ),
    }
  }, [selected, date, locale, forecast, minuteNow, scoreGrid, worldMean, scrubbed, t, viewerZone])
  const sleeping = regionScores
    .filter((x) => phaseAt(localDecimalHourFast(date, x.region.timeZone)).id === 'sleep')
    .sort((a, b) => (weights[b.region.id] ?? 0) - (weights[a.region.id] ?? 0))
  const nextPrime = REGIONS.filter((r) => selected.includes(r.id))
    .map((r) => ({ region: r, date: nextPhaseStart(r, date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  const dstHourKey = Math.floor(date.getTime() / 3_600_000)
  const dst = useMemo(() => {
    const from = new Date(dstHourKey * 3_600_000)
    return REGIONS.map((r) => ({ region: r, date: findNextOffsetChange(r.timeZone, from, 365) }))
      .filter((x): x is { region: (typeof REGIONS)[number]; date: Date } => Boolean(x.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  }, [dstHourKey])
  const presetWindows = useMemo(
    () =>
      PRESETS.map((preset) => ({
        preset,
        window: findBestWindows(
          (d) => scoreGrid.globalAt(preset.ids, d),
          minuteNow,
          24,
          MODEL_CONFIG.windowMinutes,
          1,
        )[0],
      })),
    [minuteNow, scoreGrid],
  )
  const detailRegion = detail ? REGION_BY_ID[detail] : null
  const showRegionDetails = (region: RegionId) => {
    track('Region Details', { region })
    setDetail(region)
  }
  const changeWeighting = (modus: 'value' | 'reach') => {
    track('Gewichtung', { modus })
    setWeightingMode(modus)
  }
  return (
    <MotionConfig reducedMotion="user" transition={reduceMotion ? { duration: 0 } : undefined}>
      <>
        <div id="top" className="app-shell" inert={detail ? true : undefined}>
          <Header
            snapshot={snapshot}
            liveScore={scoreGridReady ? scoreGrid.globalAt(selected, minuteNow) : undefined}
            themePreference={themePreference}
            activeTheme={activeTheme}
            onTheme={(theme) => {
              track('Theme', { wert: theme })
              setThemePreference(theme)
            }}
            style={style}
            onStyle={(next) => {
              track('Stil', { wert: next })
              setStyle(next)
            }}
            onRefresh={refreshSnapshot}
          />
          <main>
            <Section className="hero" immediate>
              <div className="hero-copy">
                <p className="hero-meta" data-testid="data-state">
                  {snapshotState === 'live' ? (
                    t.regionsActive(selected.length)
                  ) : (
                    <>
                      {snapshotState === 'fallback' ? t.eyebrowFallback : t.eyebrowLoading} ·{' '}
                      {t.regionsActive(selected.length)}
                    </>
                  )}
                </p>
                <h1>{t.headline}</h1>
                {selected.length === 0 ? (
                  <div className="empty-selection-banner">
                    <strong>{t.noneSelected}</strong>
                    <p>{t.noneSelectedHint}</p>
                    <button
                      className="button primary"
                      onClick={() => {
                        track('Zielgruppe', {
                          region: 'alle',
                          aktiv: true,
                          anzahl: REGIONS.length,
                        })
                        selectAll()
                      }}
                    >
                      {t.activateAll}
                    </button>
                  </div>
                ) : (
                  <div className="score-row">
                    <div
                      className={`hero-score ${status.tone}`}
                      data-timestamp={date.toISOString()}
                      aria-live={scrubbed ? 'off' : 'polite'}
                    >
                      {scoreGridReady ? (
                        <AnimatedNumber
                          value={score}
                          initialValue={heroCountsFromZero ? 0 : score}
                          delayMs={heroCountsFromZero ? 120 : 0}
                          accentOnChange={!scrubbed}
                        />
                      ) : (
                        <span>—</span>
                      )}
                      <small>/100</small>
                    </div>
                    <div className="score-meta">
                      {reduceMotion ? (
                        <span className={`status ${status.tone}`}>
                          <i />
                          {statusText(status.tone, locale).label}
                        </span>
                      ) : (
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={status.tone}
                            className={`status ${status.tone}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: MOTION.change, ease: MOTION.ease }}
                          >
                            <i />
                            {statusText(status.tone, locale).label}
                          </motion.span>
                        </AnimatePresence>
                      )}
                      <strong>{statusText(status.tone, locale).verdict}</strong>
                      <p>
                        {regionScores[0]
                          ? t.leads(
                              cityName(
                                regionScores[0].region.id,
                                regionScores[0].region.city,
                                locale,
                              ),
                              Math.round(regionScores[0].score),
                            )
                          : ''}{' '}
                        {sleeping.length
                          ? t.sleeps(
                              joinList(
                                sleeping.map(({ region }) =>
                                  cityName(region.id, region.city, locale),
                                ),
                                t.and,
                              ),
                              sleeping.length,
                            )
                          : t.allAwake}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="hero-aside">
                <ReportTeaser data={liveReport} now={minuteNow} />
                <div className="hero-recommendation">
                  <span className="eyebrow">{t.bestWindow}</span>
                  <div className="hero-window-time">
                    {windows24[0] ? (
                      <>
                        {formatTime(
                          windows24[0].start,
                          Intl.DateTimeFormat().resolvedOptions().timeZone,
                        )}
                        –
                        {formatTime(
                          windows24[0].end,
                          Intl.DateTimeFormat().resolvedOptions().timeZone,
                        )}{' '}
                        <small>{timeZoneName(windows24[0].start, undefined, intl)}</small>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  {/* fixed-height row: the window arrives with the score grid, nothing below may jump (T-080) */}
                  <p className="hero-window-benefit">
                    {windows24[0] && (
                      <>
                        Score <AnimatedNumber value={windows24[0].score} /> ·{' '}
                        {windows24[0].score >= score
                          ? t.potential(Math.round(windows24[0].score - score))
                          : t.bestRemaining}
                      </>
                    )}
                  </p>
                  <div className="hero-window-actions">
                    {windows24[0] && (
                      <>
                        <CalendarButton
                          start={windows24[0].start}
                          end={windows24[0].end}
                          summary={t.calSummary}
                          detail={`Score ${Math.round(windows24[0].score)}`}
                          ort="hero"
                        />
                        <ReminderButton
                          at={windows24[0].start}
                          title={t.remindTitle}
                          body={t.remindBody(Math.round(windows24[0].score))}
                          ort="hero"
                        />
                      </>
                    )}
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>{t.bestRegion}</dt>
                    <dd className="best-region">
                      {regionScores[0] && (
                        <Flag
                          code={regionScores[0].region.flag}
                          label={regionName(regionScores[0].region.id, locale)}
                          size={20}
                        />
                      )}{' '}
                      {regionScores[0]
                        ? cityName(regionScores[0].region.id, regionScores[0].region.city, locale)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.primeNow}</dt>
                    <dd>{t.ofRegions(regionsInPrime, selected.length)}</dd>
                  </div>
                </dl>
              </div>
            </Section>
            <div className="desktop-grid">
              <Section className="map-slot" delay={MOTION.stagger * 3}>
                <Suspense
                  fallback={<div className="panel map-skeleton" aria-label={t.mapLoading} />}
                >
                  <WorldMap
                    date={date}
                    grid={scoreGrid}
                    selected={selected}
                    onRegion={showRegionDetails}
                    caption={captions?.map}
                  />
                </Suspense>
              </Section>
              <Section className="forecast-slot" delay={MOTION.stagger * 4}>
                <Forecast
                  points={forecast}
                  selectedDate={date}
                  windows={windows24}
                  minuteNow={minuteNow}
                  onScrub={scrubTo}
                  onLive={() => {
                    track('Live zurück')
                    setScrubbed(null)
                  }}
                  isLive={!scrubbed}
                  recommendationThreshold={STATUS_LEVELS[1].min}
                  caption={captions?.forecast}
                />
              </Section>
            </div>
            {liveReport && (
              <Suspense fallback={null}>
                <LiveReport now={minuteNow} data={liveReport} />
              </Suspense>
            )}
            <Section defer placeholderHeight={1100}>
              <Suspense fallback={null}>
                <WeeklyReview />
                <AiPipeline />
              </Suspense>
            </Section>
            <Section>
              <div className="insight-strip">
                <div>
                  <span className="eyebrow">{t.nextChange}</span>
                  <strong>
                    {nextPrime
                      ? t.primeStarts(
                          relativeTime(nextPrime.date, date, locale),
                          cityName(nextPrime.region.id, nextPrime.region.city, locale),
                        )
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="eyebrow">{t.secondWindow}</span>
                  <strong>
                    {windows24[1]
                      ? `${formatTime(windows24[1].start, Intl.DateTimeFormat().resolvedOptions().timeZone)} ${timeZoneName(windows24[1].start, undefined, intl)} · Score ${Math.round(windows24[1].score)}`
                      : t.noSecondWindow}
                  </strong>
                  {dst && (dst.date.getTime() - date.getTime()) / 3_600_000 <= 48 && (
                    <small>
                      {t.dstChange}: {cityName(dst.region.id, dst.region.city, locale)} ·{' '}
                      {dst.date.toLocaleDateString(intl, { day: '2-digit', month: 'long' })}
                    </small>
                  )}
                </div>
              </div>
            </Section>
            <Section defer placeholderHeight={520}>
              <section className="presets" aria-labelledby="presets-title">
                <div className="section-head">
                  <h2 id="presets-title">{t.corridors}</h2>
                </div>
                <div className="preset-grid">
                  {presetWindows.map(({ preset, window }) => {
                    const active =
                      preset.ids.length === selected.length &&
                      preset.ids.every((id) => selected.includes(id))
                    return (
                      <button
                        key={preset.name}
                        className={active ? 'preset-card active' : 'preset-card'}
                        aria-pressed={active}
                        onClick={() => {
                          track('Preset', { name: preset.name })
                          setSelected([...preset.ids])
                        }}
                      >
                        <span className="eyebrow">{t.nRegions(preset.ids.length)}</span>
                        <h3>{presetName(preset.name, locale)}</h3>
                        {window && (
                          <>
                            <div className="preset-time">
                              {formatTime(
                                window.start,
                                Intl.DateTimeFormat().resolvedOptions().timeZone,
                              )}
                              –
                              {formatTime(
                                window.end,
                                Intl.DateTimeFormat().resolvedOptions().timeZone,
                              )}{' '}
                              <small>{timeZoneName(window.start, undefined, intl)}</small>
                            </div>
                            <div className="preset-score">
                              Score <AnimatedNumber value={window.score} />
                            </div>
                            <ul className="preset-cities">
                              {preset.ids.map((id) => {
                                const r = REGION_BY_ID[id]
                                const phase = phaseAt(
                                  localDecimalHourFast(window.start, r.timeZone),
                                )
                                return (
                                  <li key={id}>
                                    <span>{cityName(r.id, r.city, locale)}</span>
                                    <time>{formatTime(window.start, r.timeZone)}</time>
                                    <span>{phaseName(phase.id, phase.name, locale)}</span>
                                  </li>
                                )
                              })}
                            </ul>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            </Section>
            <div className="analysis-grid">
              <Section defer placeholderHeight={620}>
                <Heatmap
                  start={minuteNow}
                  selectedDate={date}
                  selected={selected}
                  grid={scoreGrid}
                  onScrub={scrubTo}
                  caption={captions?.heatmap}
                />
              </Section>
              <Section defer placeholderHeight={620}>
                <Dial
                  date={date}
                  selected={selected}
                  worldMean={worldMean}
                  caption={captions?.dial}
                />
              </Section>
            </div>
            <Section defer placeholderHeight={1100}>
              <RegionCards
                date={date}
                selected={selected}
                snapshot={activeSnapshot}
                grid={scoreGrid}
                live={live}
                liveStatus={liveStatus}
                onToggle={toggle}
                onSelectAll={selectAll}
                onReset={() => setSelected([])}
                isLive={!scrubbed}
              />
              {selected.length < REGIONS.length && (
                <button
                  className="text-button"
                  onClick={() => {
                    track('Zielgruppe', {
                      region: 'alle',
                      aktiv: true,
                      anzahl: REGIONS.length,
                    })
                    selectAll()
                  }}
                >
                  {t.activateAllN(REGIONS.length)}
                </button>
              )}
            </Section>
            <Section defer placeholderHeight={640}>
              <Planner windowSets={plannerSets} selected={selected} dst={dst} />
            </Section>
            <Section defer placeholderHeight={560}>
              <AskPulse
                grid={scoreGrid}
                now={minuteNow}
                report={liveReport}
                goodScore={STATUS_LEVELS[1].min}
                onJump={(at) => {
                  scrubTo(at)
                  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
                }}
              />
            </Section>
            <Section defer placeholderHeight={640}>
              <PostingPlan
                picks={postingPicks}
                now={minuteNow}
                regionCount={selected.length}
                goodScore={STATUS_LEVELS[1].min}
                onJump={(at) => {
                  scrubTo(at)
                  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
                }}
              />
            </Section>
            <Section defer placeholderHeight={1200}>
              <Playbooks />
            </Section>
            <Section defer placeholderHeight={900}>
              <section className="method" aria-labelledby="method-title">
                <div>
                  <p className="eyebrow">{t.method}</p>
                  <h2 id="method-title">
                    {t.methodTitle[0]}
                    <br />
                    {t.methodTitle[1]}
                  </h2>
                </div>
                <div className="method-copy">
                  <WeightingToggle
                    mode={weightingMode}
                    weights={activeSnapshot.weights}
                    onChange={changeWeighting}
                  />
                  <p>
                    {t.methodText(
                      MODEL_CONFIG.measuredBlend * 100,
                      MODEL_CONFIG.baselineBlend * 100,
                    )}
                  </p>
                  {snapshotState === 'live' ? (
                    <div className="share-table">
                      {REGIONS.map((region) => (
                        <div key={region.id}>
                          <span>
                            <Flag
                              code={region.flag}
                              label={regionName(region.id, locale)}
                              size={16}
                            />{' '}
                            {cityName(region.id, region.city, locale)}
                          </span>
                          <span>
                            {t.reach} {Math.round(activeSnapshot.weights.reach[region.id] * 100)} %
                          </span>
                          <span>
                            {t.value} {Math.round(activeSnapshot.weights.value[region.id] * 100)} %
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="data-unavailable">{t.weightsUnavailable}</p>
                  )}
                  <div className="source-list">
                    <a href={DATA_SOURCES.worldBankPopulation}>
                      {t.wbPopulation} <span>{yearRange(snapshot.dataYears, 'population', t)}</span>
                    </a>
                    <a href={DATA_SOURCES.worldBankInternet}>
                      {t.wbInternet} <span>{yearRange(snapshot.dataYears, 'internet', t)}</span>
                    </a>
                    <a href={DATA_SOURCES.worldBankGdpPerCapita}>
                      {t.wbGdp} <span>{yearRange(snapshot.dataYears, 'gdpPerCapita', t)}</span>
                    </a>
                    <a href={DATA_SOURCES.wikimedia}>
                      Wikimedia Pageviews{' '}
                      <span>
                        {t.wikiProfile} · {freshness(snapshot.sources.wikimedia.fetchedAt, locale)}
                      </span>
                    </a>
                    <div className="source-fetched">
                      {t.fetched(
                        freshness(snapshot.sources.worldBank.fetchedAt, locale),
                        freshness(snapshot.sources.wikimedia.fetchedAt, locale),
                      )}
                    </div>
                    <a href={DATA_SOURCES.holidays}>
                      {t.holidaysSource} <span>{t.holidaysNote}</span>
                    </a>
                    <a href={DATA_SOURCES.diagramDesign}>
                      diagram-design, MIT <span>{t.tokens}</span>
                    </a>
                  </div>
                  <p className="limitations">{t.limitations}</p>
                </div>
              </section>
            </Section>
          </main>
          <SiteFooter
            worldBankFreshness={freshness(snapshot.sources.worldBank.fetchedAt, locale)}
            worldBankYears={yearRange(snapshot.dataYears, 'internet', t)}
            wikimediaFreshness={freshness(snapshot.sources.wikimedia.fetchedAt, locale)}
          />
          <UpdateToast />
          <MobileTimeBar
            now={minuteNow}
            selectedDate={date}
            horizon={mobileHorizon}
            points={mobileForecast}
            windows={mobileHorizon === 24 ? windows24 : plannerSets.week}
            ready={scoreGridReady}
            onHorizon={(hours) => {
              track('Horizont', { wert: hours === 24 ? '24h' : '7d' })
              setMobileHorizon(hours)
            }}
            onScrub={scrubTo}
            onLive={() => {
              track('Live zurück')
              setScrubbed(null)
            }}
          />
        </div>
        <AnimatePresence>
          {detailRegion && (
            <motion.div
              className="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: MOTION.change, ease: MOTION.ease }}
              onClick={() => setDetail(null)}
            >
              <motion.aside
                ref={sheetRef}
                className="detail-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={MOTION.spring}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 500) setDetail(null)
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="detail-title"
              >
                <button
                  ref={closeRef}
                  className="sheet-close"
                  onClick={() => setDetail(null)}
                  aria-label={t.close}
                >
                  <X size={22} weight="regular" aria-hidden="true" />
                </button>
                <Flag
                  code={detailRegion.flag}
                  label={regionName(detailRegion.id, locale)}
                  size={28}
                />
                <h2 id="detail-title">{regionName(detailRegion.id, locale)}</h2>
                <div className="detail-score">
                  <AnimatedNumber value={scoreGrid.activityAt(detailRegion.id, date)} />
                  <small>/100</small>
                </div>
                <p className="detail-place-time">
                  <span>{cityName(detailRegion.id, detailRegion.city, locale)}</span>
                  <span>
                    {formatTime(date, detailRegion.timeZone)} ·{' '}
                    {timeZoneName(date, detailRegion.timeZone, intl)}
                  </span>
                </p>
                <p>
                  <PhaseIcon
                    icon={phaseAt(localDecimalHourFast(date, detailRegion.timeZone)).icon}
                  />{' '}
                  {(() => {
                    const phase = phaseAt(localDecimalHourFast(date, detailRegion.timeZone))
                    return phaseName(phase.id, phase.name, locale)
                  })()}
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    if (!selected.includes(detailRegion.id)) {
                      track('Zielgruppe', {
                        region: detailRegion.id,
                        aktiv: true,
                        anzahl: selected.length + 1,
                      })
                      toggle(detailRegion.id)
                    }
                    setDetail(null)
                  }}
                >
                  {selected.includes(detailRegion.id) ? t.inAudience : t.addAudience}
                </button>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </MotionConfig>
  )
}
