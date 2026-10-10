import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Desktop, Moon, Sun, X } from '@phosphor-icons/react'
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
const ReportHealth = lazy(() => import('./components/ReportHealth'))
import {
  circularMean,
  fastZonedParts,
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
import { LogoMark } from './components/LogoMark'

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

function joinGerman(items: readonly string[]) {
  if (items.length < 2) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`
}

function yearRange(dataYears: Record<string, number>, indicator: string) {
  const years = Object.entries(dataYears)
    .filter(([key]) => key.endsWith(`.${indicator}`))
    .map(([, year]) => year)
  if (!years.length) return 'Jahr unbekannt'
  const min = Math.min(...years)
  const max = Math.max(...years)
  return `Datenjahr ${min}${min === max ? '' : `–${max}`}`
}

function freshness(date: string) {
  if (!date) return 'wird geladen'
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000))
  if (minutes < 60) return `vor ${minutes} Min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `vor ${hours} Std`
  const days = Math.round(hours / 24)
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}

function Header({
  snapshot,
  liveScore,
  themePreference,
  onTheme,
  onRefresh,
}: {
  snapshot: Snapshot
  liveScore?: number
  themePreference: ThemePreference
  onTheme: (theme: ThemePreference) => void
  onRefresh: () => void
}) {
  return (
    <motion.header
      className="site-header"
      // No entrance: the static shell in index.html already shows the header before React runs.
      initial={false}
    >
      <a className="wordmark" href="#top" aria-label="Global Audience Pulse Start">
        <LogoMark score={liveScore} />
        <span>
          Global Audience
          <br />
          Pulse
        </span>
      </a>
      <div className="header-actions">
        <button
          className="freshness"
          onClick={onRefresh}
          title={`Automatischer Abruf alle ${MODEL_CONFIG.liveRefreshMinutes} Min. · Klick lädt sofort neu`}
        >
          <i className={snapshot.generatedAt ? '' : 'offline'} />
          {snapshot.generatedAt
            ? `Messdaten ${freshness(snapshot.sources.wikimedia.fetchedAt)}`
            : 'Messdaten nicht verfügbar'}
        </button>
        <LiveClock />
        <div className="theme-toggle" aria-label="Darstellung" role="group">
          {(
            [
              ['system', Desktop, 'System'],
              ['light', Sun, 'Hell'],
              ['dark', Moon, 'Dunkel'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              onClick={() => onTheme(value)}
              aria-pressed={themePreference === value}
              aria-label={label}
              title={label}
            >
              <Icon size={16} weight="regular" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </motion.header>
  )
}

type ThemePreference = 'system' | 'light' | 'dark'

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
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', activeTheme === 'light' ? '#f4f0e7' : '#11110f')
    try {
      localStorage.setItem('gap-theme', themePreference)
    } catch {
      /* optional */
    }
  }, [activeTheme, themePreference])
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
    return findBestWindows(
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
  const worldMean = circularMean(
    selected.map((id) => localDecimalHourFast(date, REGION_BY_ID[id].timeZone)),
    selected.map((id) => weights[id] ?? 0),
  )
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
            onTheme={(theme) => {
              track('Theme', { wert: theme })
              setThemePreference(theme)
            }}
            onRefresh={refreshSnapshot}
          />
          <main>
            <Section className="hero" immediate>
              <div className="hero-copy">
                <p className="eyebrow" data-testid="data-state">
                  {snapshotState === 'live'
                    ? 'Aktuelles Publikumsradar'
                    : snapshotState === 'fallback'
                      ? 'Beispieldaten · Offline-Modell'
                      : 'Daten werden geladen'}{' '}
                  · {selected.length} Regionen aktiv
                </p>
                <h1>Jetzt posten oder warten?</h1>
                {selected.length === 0 ? (
                  <div className="empty-selection-banner">
                    <strong>Keine Regionen ausgewählt</strong>
                    <p>
                      Wähle mindestens einen Markt aus, um weltweite Posting-Fenster zu berechnen.
                    </p>
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
                      Alle Regionen aktivieren
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
                          {status.label}
                        </span>
                      ) : (
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={status.label}
                            className={`status ${status.tone}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: MOTION.change, ease: MOTION.ease }}
                          >
                            <i />
                            {status.label}
                          </motion.span>
                        </AnimatePresence>
                      )}
                      <strong>{status.verdict}</strong>
                      <p>
                        {regionScores[0]?.region.city} führt mit{' '}
                        {Math.round(regionScores[0]?.score ?? 0)}.{' '}
                        {sleeping.length
                          ? `${joinGerman(sleeping.map(({ region }) => region.city))} ${sleeping.length === 1 ? 'schläft' : 'schlafen'}.`
                          : 'Alle Kernmärkte sind wach.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="hero-aside">
                <ReportTeaser data={liveReport} now={minuteNow} />
                <div className="hero-recommendation">
                  <span className="eyebrow">Optimales Zeitfenster</span>
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
                        <small>{timeZoneName(windows24[0].start)}</small>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  {windows24[0] && (
                    <p className="hero-window-benefit">
                      Score <AnimatedNumber value={windows24[0].score} /> ·{' '}
                      {windows24[0].score >= score
                        ? `+${Math.round(windows24[0].score - score)} Pkt. Potenzial`
                        : 'bestes verbleibendes Fenster'}
                    </p>
                  )}
                </div>
                <dl>
                  <div>
                    <dt>Beste Region</dt>
                    <dd className="best-region">
                      {regionScores[0] && (
                        <Flag
                          code={regionScores[0].region.flag}
                          label={regionScores[0].region.name}
                          size={20}
                        />
                      )}{' '}
                      {regionScores[0]?.region.city ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Gerade Primetime</dt>
                    <dd>
                      {regionsInPrime} von {selected.length} Regionen
                    </dd>
                  </div>
                </dl>
              </div>
            </Section>
            <div className="desktop-grid">
              <Section className="map-slot" delay={MOTION.stagger * 3}>
                <Suspense
                  fallback={<div className="panel map-skeleton" aria-label="Karte wird geladen" />}
                >
                  <WorldMap
                    date={date}
                    grid={scoreGrid}
                    selected={selected}
                    onRegion={showRegionDetails}
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
                />
              </Section>
            </div>
            {liveReport && (
              <Suspense fallback={null}>
                <LiveReport now={minuteNow} data={liveReport} />
              </Suspense>
            )}
            <Section>
              <div className="insight-strip">
                <div>
                  <span className="eyebrow">Nächster Wechsel</span>
                  <strong>
                    {nextPrime
                      ? `In ${relativeTime(nextPrime.date, date)} beginnt Primetime in ${nextPrime.region.city}`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="eyebrow">Zweites Zeitfenster heute</span>
                  <strong>
                    {windows24[1]
                      ? `${formatTime(windows24[1].start, Intl.DateTimeFormat().resolvedOptions().timeZone)} ${timeZoneName(windows24[1].start)} · Score ${Math.round(windows24[1].score)}`
                      : 'Kein weiteres Fenster heute'}
                  </strong>
                  {dst && (dst.date.getTime() - date.getTime()) / 3_600_000 <= 48 && (
                    <small>
                      Zeitumstellung: {dst.region.city} ·{' '}
                      {dst.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
                    </small>
                  )}
                </div>
              </div>
            </Section>
            <Section defer placeholderHeight={520}>
              <section className="presets" aria-labelledby="presets-title">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Berechnete Szenarien</p>
                    <h2 id="presets-title">Strategische Posting-Korridore</h2>
                  </div>
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
                        <span className="eyebrow">{preset.ids.length} Regionen</span>
                        <h3>{preset.name}</h3>
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
                              <small>{timeZoneName(window.start)}</small>
                            </div>
                            <div className="preset-score">
                              Score <AnimatedNumber value={window.score} />
                            </div>
                            <p>
                              {preset.ids
                                .map((id) => {
                                  const r = REGION_BY_ID[id]
                                  return `${r.city} ${formatTime(window.start, r.timeZone)} · ${phaseAt(localDecimalHourFast(window.start, r.timeZone)).name}`
                                })
                                .join(' · ')}
                            </p>
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
                />
              </Section>
              <Section defer placeholderHeight={620}>
                <Dial date={date} selected={selected} worldMean={worldMean} />
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
                  Alle {REGIONS.length} Regionen aktivieren
                </button>
              )}
            </Section>
            <Section defer placeholderHeight={640}>
              <Planner windowSets={plannerSets} selected={selected} dst={dst} />
            </Section>
            <Section defer placeholderHeight={1200}>
              <Playbooks />
            </Section>
            <Section defer placeholderHeight={900}>
              <section className="method" aria-labelledby="method-title">
                <div>
                  <p className="eyebrow">Methodik & Quellen</p>
                  <h2 id="method-title">
                    Messbar, modelliert,
                    <br />
                    transparent.
                  </h2>
                </div>
                <div className="method-copy">
                  <Suspense fallback={null}>
                    <ReportHealth />
                  </Suspense>
                  <div className="weighting">
                    <span className="weighting-label" id="weighting-label">
                      Gewichtung der Regionen
                    </span>
                    <div
                      className="weighting-toggle"
                      role="group"
                      aria-labelledby="weighting-label"
                    >
                      <button
                        aria-pressed={weightingMode === 'value'}
                        onClick={() => changeWeighting('value')}
                      >
                        Werbewert
                        <small>nach Kaufkraft</small>
                      </button>
                      <button
                        aria-pressed={weightingMode === 'reach'}
                        onClick={() => changeWeighting('reach')}
                      >
                        Reichweite
                        <small>nach Nutzerzahl</small>
                      </button>
                    </div>
                  </div>
                  <p>
                    Der Score verbindet die geglättete menschliche Aufmerksamkeitskurve mit den
                    stündlichen Wikipedia-Abrufen der jeweiligen Sprachregion:{' '}
                    <strong>
                      {MODEL_CONFIG.measuredBlend * 100} % Messprofil +{' '}
                      {MODEL_CONFIG.baselineBlend * 100} % Baseline
                    </strong>
                    . <strong>Reichweite</strong> basiert auf Internetnutzern;{' '}
                    <strong>Werbewert</strong> multipliziert sie mit dem BIP pro Kopf. Beide
                    Weltbank-Gewichte werden für deine Auswahl live neu normiert. Der
                    US-Ost/West-Split ist eine dokumentierte statische Census-Näherung; USA und UK
                    bleiben bewusst modellbasiert.
                  </p>
                  {snapshotState === 'live' ? (
                    <div className="share-table">
                      {REGIONS.map((region) => (
                        <div key={region.id}>
                          <span>
                            <Flag code={region.flag} label={region.name} size={16} /> {region.city}
                          </span>
                          <span>
                            Reichweite {Math.round(activeSnapshot.weights.reach[region.id] * 100)} %
                          </span>
                          <span>
                            Werbewert {Math.round(activeSnapshot.weights.value[region.id] * 100)} %
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="data-unavailable">
                      Gewichtungsdaten sind derzeit nicht verfügbar.
                    </p>
                  )}
                  <div className="source-list">
                    <a href={DATA_SOURCES.worldBankPopulation}>
                      Weltbank · Bevölkerung{' '}
                      <span>{yearRange(snapshot.dataYears, 'population')}</span>
                    </a>
                    <a href={DATA_SOURCES.worldBankInternet}>
                      Weltbank · Internetnutzung{' '}
                      <span>{yearRange(snapshot.dataYears, 'internet')}</span>
                    </a>
                    <a href={DATA_SOURCES.worldBankGdpPerCapita}>
                      Weltbank · BIP pro Kopf{' '}
                      <span>{yearRange(snapshot.dataYears, 'gdpPerCapita')}</span>
                    </a>
                    <a href={DATA_SOURCES.wikimedia}>
                      Wikimedia Pageviews{' '}
                      <span>Datenprofil · {freshness(snapshot.sources.wikimedia.fetchedAt)}</span>
                    </a>
                    <div className="source-fetched">
                      Abruf: Weltbank {freshness(snapshot.sources.worldBank.fetchedAt)} · Wikimedia{' '}
                      {freshness(snapshot.sources.wikimedia.fetchedAt)}
                    </div>
                    <a href={DATA_SOURCES.diagramDesign}>
                      diagram-design, MIT <span>Design-Tokens</span>
                    </a>
                  </div>
                  <p className="limitations">
                    Wikipedia ist ein Aktivitäts-Proxy, keine Social-Plattform-Messung.
                    Englischsprachige Wikipedia wird bewusst nicht für USA/UK verwendet, da sie
                    Zeitzonen mischt. Ländergruppen und der dokumentierte US-Split approximieren
                    globale Zielgruppen; sie ersetzen keine eigenen Analytics.
                  </p>
                </div>
              </section>
            </Section>
          </main>
          <SiteFooter
            worldBankFreshness={freshness(snapshot.sources.worldBank.fetchedAt)}
            worldBankYears={yearRange(snapshot.dataYears, 'internet')}
            wikimediaFreshness={freshness(snapshot.sources.wikimedia.fetchedAt)}
          />
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
                  aria-label="Schließen"
                >
                  <X size={22} weight="regular" aria-hidden="true" />
                </button>
                <Flag code={detailRegion.flag} label={detailRegion.name} size={28} />
                <p className="eyebrow">Region im Fokus</p>
                <h2 id="detail-title">{detailRegion.name}</h2>
                <div className="detail-score">
                  <AnimatedNumber value={scoreGrid.activityAt(detailRegion.id, date)} />
                  <small>/100</small>
                </div>
                <p>
                  {detailRegion.city} · {formatTime(date, detailRegion.timeZone)} ·{' '}
                  {timeZoneName(date, detailRegion.timeZone)}
                </p>
                <p>
                  <PhaseIcon
                    icon={phaseAt(localDecimalHourFast(date, detailRegion.timeZone)).icon}
                  />{' '}
                  {phaseAt(localDecimalHourFast(date, detailRegion.timeZone)).name}
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
                  {selected.includes(detailRegion.id)
                    ? 'Ist in deiner Zielgruppe'
                    : 'Zur Zielgruppe hinzufügen'}
                </button>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </MotionConfig>
  )
}
