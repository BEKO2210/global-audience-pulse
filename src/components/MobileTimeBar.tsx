import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { area, curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import { STATUS_LEVELS } from '../config/model'
import { MOTION } from '../config/motion'
import { statusFor, type PostingWindow } from '../lib/model'
import { formatOffset, formatTime } from '../lib/time'
import type { ForecastPoint } from './Forecast'
import { AnimatedNumber } from './AnimatedNumber'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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
  const reduceMotion = useReducedMotion()
  const maxMinutes = horizon * 60
  const externalMinutes = clamp(
    Math.round((selectedDate.getTime() - now.getTime()) / 60_000 / 15) * 15,
    0,
    maxMinutes,
  )
  const [localMinutes, setLocalMinutes] = useState(externalMinutes)
  const [dragging, setDragging] = useState(false)
  const frame = useRef(0)
  const pending = useRef(localMinutes)
  const bestState = useRef(false)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

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
      result.push({
        left,
        label:
          horizon === 24
            ? formatTime(cursor, Intl.DateTimeFormat().resolvedOptions().timeZone)
            : cursor.toLocaleDateString('de-DE', { weekday: 'short' }),
      })
      if (horizon === 24) cursor.setHours(cursor.getHours() + 6)
      else cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [horizon, now])

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

  return (
    <div className="mobile-bar" role="region" aria-label="Zeit vorspulen">
      <div className="mobile-bar-top">
        <div className="mobile-bar-when">
          <span className="mobile-bar-eyebrow">Zielzeit</span>
          <span className="mobile-bar-readout">
            {displayedMinutes === 0
              ? `Jetzt · ${formatTime(now, Intl.DateTimeFormat().resolvedOptions().timeZone)}`
              : date.toLocaleString('de-DE', {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </span>
          <span className="mobile-bar-relative">
            {formatOffset(date.getTime() - now.getTime())}
          </span>
        </div>
        <div className={`mobile-bar-score ${status.tone}`} aria-label="Gesamtwert">
          <b>{ready ? <AnimatedNumber value={score} /> : '—'}</b>
          <span>{status.label}</span>
        </div>
      </div>
      <div className="mobile-bar-slider">
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
            return <i key={window.start.toISOString()} style={{ left: `${left}%` }} />
          })}
          <span className="mobile-now-marker">jetzt</span>
        </div>
        {dragging && (
          <div className="mobile-value-bubble" style={{ left: `${position}%` }} aria-hidden="true">
            {formatTime(date, Intl.DateTimeFormat().resolvedOptions().timeZone)}
          </div>
        )}
        <input
          aria-label="Mobile Zeitmaschine"
          type="range"
          min={0}
          max={maxMinutes}
          step={15}
          value={displayedMinutes}
          onPointerDown={() => {
            setLocalMinutes(externalMinutes)
            setDragging(true)
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onBlur={() => setDragging(false)}
          onChange={(event) => update(Number(event.target.value))}
        />
        <div className="mobile-bar-scale" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick.left} style={{ left: `${tick.left}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mobile-bar-actions">
        <div className="mobile-horizon" role="group" aria-label="Zeitraum des Schiebers">
          <button aria-pressed={horizon === 24} onClick={() => onHorizon(24)}>
            {horizon === 24 && (
              <motion.span
                className="mobile-horizon-indicator"
                layoutId="mobile-horizon-indicator"
                transition={reduceMotion ? { duration: 0 } : MOTION.spring}
              />
            )}
            <span>24 h</span>
          </button>
          <button aria-pressed={horizon === 168} onClick={() => onHorizon(168)}>
            {horizon === 168 && (
              <motion.span
                className="mobile-horizon-indicator"
                layoutId="mobile-horizon-indicator"
                transition={reduceMotion ? { duration: 0 } : MOTION.spring}
              />
            )}
            <span>7 Tage</span>
          </button>
        </div>
        {displayedMinutes ? (
          <button className="mobile-bar-live" onClick={onLive}>
            Zurück zu jetzt
          </button>
        ) : (
          <span className="mobile-bar-live is-live" role="status">
            <i aria-hidden="true" /> Live
          </span>
        )}
      </div>
      <span className="sr-only">Beste Fenster beginnen ab Score {STATUS_LEVELS[1].min}.</span>
    </div>
  )
}
