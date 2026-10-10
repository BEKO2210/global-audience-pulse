import { useRef } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import type { PostingWindow } from '../lib/model'
import { MODEL_CONFIG } from '../config/model'
import { MOTION } from '../config/motion'
import { formatDateTime, formatTime, snapToMinutes } from '../lib/time'
import { track } from '../lib/analytics'

export interface ForecastPoint {
  date: Date
  score: number
}

export function Forecast({
  points,
  selectedDate,
  windows,
  minuteNow,
  onScrub,
  onLive,
  isLive,
  recommendationThreshold,
}: {
  points: readonly ForecastPoint[]
  selectedDate: Date
  windows: readonly PostingWindow[]
  minuteNow: Date
  onScrub: (date: Date) => void
  onLive: () => void
  isLive: boolean
  recommendationThreshold: number
}) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const width = 720
  const height = 270
  const pad = { l: 32, r: 12, t: 18, b: 34 }
  const domain: [Date, Date] = [points[0]?.date ?? new Date(), points.at(-1)?.date ?? new Date()]
  const x = scaleTime()
    .domain(domain)
    .range([pad.l, width - pad.r])
  const y = scaleLinear()
    .domain([0, 100])
    .range([height - pad.b, pad.t])
  const linePath =
    line<ForecastPoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.score))
      .curve(curveMonotoneX)(points) ?? ''
  const areaPath =
    area<ForecastPoint>()
      .x((d) => x(d.date))
      .y0(y(0))
      .y1((d) => y(d.score))
      .curve(curveMonotoneX)(points) ?? ''
  const touchStart = useRef<{ x: number; y: number; scrubbing: boolean } | null>(null)
  const lastScrub = useRef<Date | null>(null)
  const scrub = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = Math.min(
      width - pad.r,
      Math.max(pad.l, ((clientX - rect.left) / rect.width) * width),
    )
    const next = snapToMinutes(x.invert(px), MODEL_CONFIG.scanStepMinutes)
    lastScrub.current = next
    onScrub(next)
  }
  const trackScrub = (quelle: 'prognose' | 'tastatur', next: Date) =>
    track('Scrub', {
      quelle,
      horizont: '24h',
      offsetStunden: Math.round((next.getTime() - minuteNow.getTime()) / 3_600_000),
    })
  const ticks = x.ticks(5)
  const selectedInDomain = new Date(
    Math.min(domain[1].getTime(), Math.max(domain[0].getTime(), selectedDate.getTime())),
  )
  const selectedIndex = Math.min(
    points.length - 1,
    Math.max(
      0,
      Math.round(
        (selectedInDomain.getTime() - domain[0].getTime()) /
          (MODEL_CONFIG.scanStepMinutes * 60_000),
      ),
    ),
  )
  return (
    <section className="panel forecast-panel" aria-labelledby="forecast-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">24-Stunden-Prognose</p>
          <h2 id="forecast-title">Das nächste Momentum</h2>
        </div>
        <span className="micro">Skala: 0–100 Aktivitäts-Score</span>
      </div>
      <svg
        ref={ref}
        className="forecast"
        viewBox={`0 0 ${width} ${height}`}
        role="slider"
        tabIndex={0}
        aria-label="Zeitmaschine"
        aria-valuemin={domain[0].getTime()}
        aria-valuemax={domain[1].getTime()}
        aria-valuenow={selectedInDomain.getTime()}
        aria-valuetext={formatDateTime(
          selectedDate,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        )}
        onPointerDown={(e) => {
          // Mouse/pen scrub immediately. Touch waits for intent: the browser keeps vertical
          // pans (touch-action: pan-y) so scrolling over the chart scrolls the page.
          touchStart.current = { x: e.clientX, y: e.clientY, scrubbing: false }
          lastScrub.current = null
          if (e.pointerType !== 'touch') {
            e.currentTarget.setPointerCapture(e.pointerId)
            scrub(e.clientX)
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'touch') {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientX)
            return
          }
          const start = touchStart.current
          if (!start) return
          if (!start.scrubbing && Math.abs(e.clientX - start.x) > 8) {
            start.scrubbing = Math.abs(e.clientX - start.x) > Math.abs(e.clientY - start.y)
            if (start.scrubbing) e.currentTarget.setPointerCapture(e.pointerId)
          }
          if (start.scrubbing) scrub(e.clientX)
        }}
        onPointerUp={(e) => {
          const start = touchStart.current
          // A deliberate tap (no movement) on touch also moves the time machine.
          if (
            e.pointerType === 'touch' &&
            start &&
            !start.scrubbing &&
            Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8
          )
            scrub(e.clientX)
          touchStart.current = null
          if (lastScrub.current) trackScrub('prognose', lastScrub.current)
        }}
        onPointerCancel={() => {
          touchStart.current = null
        }}
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home'].includes(e.key))
            e.preventDefault()
          const next =
            e.key === 'ArrowLeft'
              ? new Date(selectedDate.getTime() - 15 * 60_000)
              : e.key === 'ArrowRight'
                ? new Date(selectedDate.getTime() + 15 * 60_000)
                : e.key === 'PageUp'
                  ? new Date(selectedDate.getTime() + 12 * 3_600_000)
                  : e.key === 'PageDown'
                    ? new Date(selectedDate.getTime() - 12 * 3_600_000)
                    : e.key === 'Home'
                      ? minuteNow
                      : null
          if (next) {
            onScrub(next)
            trackScrub('tastatur', next)
          }
        }}
      >
        {[25, 50, 75].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} className="grid-line" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" className="forecast-y-label">
              {v}
            </text>
          </g>
        ))}
        {windows.map((win, index) => (
          <g key={win.start.toISOString()}>
            <rect
              x={x(win.start)}
              y={pad.t}
              width={Math.max(2, x(win.end) - x(win.start))}
              height={height - pad.t - pad.b}
              className="window-band"
            />
            <text
              x={x(win.start) + (x(win.end) - x(win.start)) / 2}
              y={pad.t + 12}
              textAnchor="middle"
              className="window-band-label"
            >
              Nr. {index + 1}
            </text>
          </g>
        ))}
        <motion.path
          d={areaPath}
          className="forecast-area"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : MOTION.entrance, ease: MOTION.ease }}
        />
        <motion.path
          d={linePath}
          className="forecast-line"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          animate={{ d: linePath }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
        />
        {ticks.map((tick) => (
          <g key={tick.getTime()} transform={`translate(${x(tick)} ${height - pad.b})`}>
            <line y2="5" className="axis-tick" />
            <text y="20" textAnchor="middle">
              {formatTime(tick, Intl.DateTimeFormat().resolvedOptions().timeZone)}
            </text>
          </g>
        ))}
        <motion.line
          x1={x(selectedInDomain)}
          x2={x(selectedInDomain)}
          y1={pad.t}
          y2={height - pad.b}
          className="now-line"
          animate={{ x1: x(selectedInDomain), x2: x(selectedInDomain) }}
          transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
        />
        <motion.circle
          cx={x(selectedInDomain)}
          cy={y(points[selectedIndex]?.score ?? 0)}
          r="5"
          className="now-point"
          animate={{ cx: x(selectedInDomain), cy: y(points[selectedIndex]?.score ?? 0) }}
          transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
        />
      </svg>
      <div className="forecast-legend">
        <i /> Optimales Posting-Fenster (Score ab {recommendationThreshold})
      </div>
      <div className="scrub-readout">
        <span>Zeitmaschine</span>
        <strong>
          {selectedDate.toLocaleString('de-DE', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </strong>
        <span>Ziehen · Pfeiltasten</span>
        <button type="button" onClick={onLive} disabled={isLive}>
          Live
        </button>
      </div>
    </section>
  )
}
