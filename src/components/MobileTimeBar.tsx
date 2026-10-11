import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { area, curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import { STATUS_LEVELS } from '../config/model'
import { MOTION } from '../config/motion'
import { statusFor, type PostingWindow } from '../lib/model'
import { formatOffset, formatTime } from '../lib/time'
import type { ForecastPoint } from './Forecast'
import { AnimatedNumber } from './AnimatedNumber'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { statusText } from '../i18n/labels'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const DE = {
  /** Compact distance for the slim bar: "+45 Min", "+15 Std", "+3 Tage". */
  shortOffset: (minutes: number) => {
    if (minutes < 60) return `+${minutes} Min`
    if (minutes < 1440) return `+${Math.round(minutes / 60)} Std`
    const days = Math.round(minutes / 1440)
    return `+${days} ${days === 1 ? 'Tag' : 'Tage'}`
  },
  region: 'Zeit vorspulen',
  expand: 'Zeitleiste ausklappen',
  backToNow: (offset: string) => `Zurück zu jetzt (gewählt: ${offset})`,
  now: 'Jetzt',
  slider: 'Mobile Zeitmaschine',
  horizon24: 'Zeitraum: 24 Stunden, auf 7 Tage umschalten',
  horizon7: 'Zeitraum: 7 Tage, auf 24 Stunden umschalten',
  short24: '24 h',
  short7: '7 T',
  total: 'Gesamtwert',
  bestFrom: (min: number) => `Beste Fenster beginnen ab Score ${min}.`,
}
const EN: typeof DE = {
  shortOffset: (minutes) => {
    if (minutes < 60) return `+${minutes} min`
    if (minutes < 1440) return `+${Math.round(minutes / 60)} h`
    const days = Math.round(minutes / 1440)
    return `+${days} ${days === 1 ? 'day' : 'days'}`
  },
  region: 'Scrub through time',
  expand: 'Expand time bar',
  backToNow: (offset) => `Back to now (selected: ${offset})`,
  now: 'Now',
  slider: 'Mobile time machine',
  horizon24: 'Range: 24 hours, switch to 7 days',
  horizon7: 'Range: 7 days, switch to 24 hours',
  short24: '24 h',
  short7: '7 d',
  total: 'Overall score',
  bestFrom: (min) => `Best windows start at score ${min}.`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const SHORT_STATUS: Record<string, Record<'de' | 'en', string>> = {
  strong: { de: 'Hoch', en: 'Peak' },
  good: { de: 'Gut', en: 'Good' },
  medium: { de: 'Aufbau', en: 'Building' },
  quiet: { de: 'Ruhig', en: 'Quiet' },
}

export function MobileTimeBar({
  now,
  selectedDate,
  horizon,
  points,
  windows,
  ready,
  onHorizon,
  onScrub,
  onLive,
}: {
  now: Date
  selectedDate: Date
  horizon: 24 | 168
  points: readonly ForecastPoint[]
  windows: readonly PostingWindow[]
  ready: boolean
  onHorizon: (hours: 24 | 168) => void
  onScrub: (date: Date) => void
  onLive: () => void
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const reduceMotion = useReducedMotion()
  const maxMinutes = horizon * 60
  const externalMinutes = clamp(
    Math.round((selectedDate.getTime() - now.getTime()) / 60_000 / 15) * 15,
    0,
    maxMinutes,
  )
  const [localMinutes, setLocalMinutes] = useState(externalMinutes)
  const [dragging, setDragging] = useState(false)
  const [compact, setCompact] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const pending = useRef(localMinutes)
  const bestState = useRef(false)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  useEffect(() => {
    let scrollFrame = 0
    let lastScrollPosition = window.scrollY
    let lastHeight = document.documentElement.scrollHeight
    let direction = 0
    let distance = 0

    const updateBar = () => {
      scrollFrame = 0
      // while the bar is being used (focus inside it, e.g. keyboard scrubbing) it never collapses
      if (barRef.current?.contains(document.activeElement)) {
        setCompact(false)
        return
      }
      const scrollPosition = window.scrollY
      // a scroll that comes with a page-height change is content reflowing under the viewport (e.g. while a chart
      // is scrubbed), not the user scrolling: never toggle the bar on it
      const height = document.documentElement.scrollHeight
      if (height !== lastHeight) {
        lastHeight = height
        // only while something is focused (a chart slider being scrubbed): plain scrolling past lazily mounting
        // sections also changes the height and must still collapse the bar
        const active = document.activeElement
        if (active && active !== document.body && active !== document.documentElement) {
          lastScrollPosition = scrollPosition
          return
        }
      }
      if (scrollPosition <= 0) {
        setCompact(false)
        lastScrollPosition = 0
        distance = 0
        return
      }

      const delta = scrollPosition - lastScrollPosition
      lastScrollPosition = scrollPosition
      if (delta === 0) return

      const nextDirection = Math.sign(delta)
      if (nextDirection !== direction) {
        direction = nextDirection
        distance = 0
      }
      distance += Math.abs(delta)
      if (distance <= 24) return

      setCompact(direction > 0)
      distance = 0
    }
    const onScroll = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateBar)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(scrollFrame)
    }
  }, [])

  const displayedMinutes = dragging ? localMinutes : externalMinutes
  const date = new Date(now.getTime() + displayedMinutes * 60_000)
  const pointIndex = clamp(Math.round(displayedMinutes / 15), 0, Math.max(0, points.length - 1))
  const score = points[pointIndex]?.score ?? 0
  const status = statusFor(score)
  const position = maxMinutes ? (displayedMinutes / maxMinutes) * 100 : 0
  const width = 1000
  const height = 58
  const linePath =
    line<ForecastPoint>()
      .x((_, index) => (index / Math.max(1, points.length - 1)) * width)
      .y((point) => height - 5 - (point.score / 100) * (height - 12))
      .curve(curveMonotoneX)(points) ?? ''
  const areaPath =
    area<ForecastPoint>()
      .x((_, index) => (index / Math.max(1, points.length - 1)) * width)
      .y0(height)
      .y1((point) => height - 5 - (point.score / 100) * (height - 12))
      .curve(curveMonotoneX)(points) ?? ''
  // Ticks sit on round local times (every 6 h, or each midnight for 7 days) at their true position.
  const ticks = useMemo(() => {
    const spanMs = horizon * 3_600_000
    const cursor = new Date(now)
    if (horizon === 24) {
      cursor.setMinutes(0, 0, 0)
      do cursor.setHours(cursor.getHours() + 1)
      while (cursor.getHours() % 6 !== 0)
    } else {
      cursor.setHours(24, 0, 0, 0)
    }
    const result: { label: string; left: number }[] = []
    while (cursor.getTime() < now.getTime() + spanMs) {
      const left = ((cursor.getTime() - now.getTime()) / spanMs) * 100
      // hour only ("18") like the heatmap axis – full "18:00" labels collided at 360px; none at the very edges
      if (left > 4 && left < 94)
        result.push({
          left,
          label:
            horizon === 24
              ? formatTime(cursor, Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 2)
              : cursor.toLocaleDateString(intl, { weekday: 'short' }),
        })
      if (horizon === 24) cursor.setHours(cursor.getHours() + 6)
      else cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [horizon, now, intl])

  const update = (minutes: number) => {
    const next = clamp(minutes, 0, maxMinutes)
    setLocalMinutes(next)
    pending.current = next
    const nextDate = new Date(now.getTime() + next * 60_000)
    const nextBest = windows.some((window) => nextDate >= window.start && nextDate <= window.end)
    if (nextBest !== bestState.current) {
      bestState.current = nextBest
      if (window.matchMedia('(max-width: 1023px)').matches && 'vibrate' in navigator)
        navigator.vibrate(5)
    }
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const committed = pending.current
      startTransition(() => onScrub(new Date(now.getTime() + committed * 60_000)))
    })
  }

  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const live = displayedMinutes === 0
  const cursorY = height - 5 - (score / 100) * (height - 12)
  const trackScrub = (quelle: 'leiste' | 'tastatur') =>
    track('Scrub', {
      quelle,
      horizont: horizon === 24 ? '24h' : '7d',
      offsetStunden: Math.round(pending.current / 60),
    })

  return (
    <div
      className={`mobile-bar${compact ? ' is-compact' : ''}`}
      ref={barRef}
      role="region"
      aria-label={t.region}
      onFocusCapture={() => setCompact(false)}
      // any touch on the compact bar expands it; the scrubber stays enabled, so a drag keeps working
      onPointerDownCapture={() => {
        if (compact) setCompact(false)
      }}
    >
      {compact && (
        <button
          className="mobile-bar-expand"
          type="button"
          aria-expanded="false"
          aria-label={t.expand}
          onClick={() => setCompact(false)}
        />
      )}
      <div className="mobile-bar-when">
        <span className="mobile-bar-readout">{formatTime(live ? now : date, userZone)}</span>
        {live ? (
          <span className="mobile-bar-live is-live" role="status">
            <i aria-hidden="true" /> Live
          </span>
        ) : (
          <button
            className="mobile-bar-live"
            onClick={onLive}
            aria-label={t.backToNow(formatOffset(date.getTime() - now.getTime(), locale))}
          >
            {t.shortOffset(displayedMinutes)}
            <span className="mobile-bar-back">{t.now}</span>
          </button>
        )}
      </div>

      <div className={`mobile-bar-slider${dragging ? ' is-dragging' : ''}`}>
        <div className="mobile-track-visual" aria-hidden="true">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <path d={areaPath} className="mobile-forecast-area" />
            <motion.path
              d={linePath}
              className="mobile-forecast-line"
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduceMotion ? 0 : MOTION.entrance, ease: MOTION.ease }}
            />
          </svg>
          {windows.map((window) => {
            const left = clamp(
              ((window.start.getTime() - now.getTime()) / (horizon * 3_600_000)) * 100,
              0,
              100,
            )
            return (
              <i
                key={window.start.toISOString()}
                className="window-tick"
                style={{ left: `${left}%` }}
              />
            )
          })}
          {ticks.map((tick) => (
            <span key={tick.left} className="scale-label" style={{ left: `${tick.left}%` }}>
              {tick.label}
            </span>
          ))}
          <span className="mobile-cursor" style={{ left: `${position}%` }}>
            <b style={{ top: `${(cursorY / height) * 100}%` }} />
          </span>
        </div>
        <input
          aria-label={t.slider}
          aria-valuetext={`${date.toLocaleString(intl, { weekday: 'long', hour: '2-digit', minute: '2-digit' })}, Score ${Math.round(score)}`}
          type="range"
          min={0}
          max={maxMinutes}
          step={15}
          value={displayedMinutes}
          onPointerDown={() => {
            setLocalMinutes(externalMinutes)
            setDragging(true)
          }}
          onPointerUp={() => {
            setDragging(false)
            trackScrub('leiste')
          }}
          onPointerCancel={() => setDragging(false)}
          onBlur={() => setDragging(false)}
          onChange={(event) => update(Number(event.target.value))}
          onKeyUp={(event) => {
            if (
              ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)
            )
              trackScrub('tastatur')
          }}
        />
      </div>

      <button
        className="mobile-horizon-toggle"
        onClick={() => onHorizon(horizon === 24 ? 168 : 24)}
        aria-label={horizon === 24 ? t.horizon24 : t.horizon7}
      >
        {horizon === 24 ? t.short24 : t.short7}
      </button>
      <div className={`mobile-bar-score ${status.tone}`} aria-label={t.total}>
        <b>{ready ? <AnimatedNumber value={score} /> : '—'}</b>
        {/* short word in a fixed-width column: a long status widened the column and shifted the whole bar */}
        <span title={statusText(status.tone, locale).label}>
          {SHORT_STATUS[status.tone]?.[locale]}
        </span>
      </div>
      <span className="sr-only">{t.bestFrom(STATUS_LEVELS[1].min)}</span>
    </div>
  )
}
