import { useRef } from 'react'
import { useSvgBox } from '../hooks/useSvgBox'
import { scaleLinear, scaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import type { PostingWindow } from '../lib/model'
import { MODEL_CONFIG } from '../config/model'
import { MOTION } from '../config/motion'
import { formatTime, snapToMinutes } from '../lib/time'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'

const DE = {
  title: 'Das nächste Momentum',
  scale: 'Skala: 0–100 Aktivitäts-Score',
  timeMachine: 'Zeitmaschine',
  windowNo: (n: number) => (n === 1 ? 'Bestes Fenster' : `${n}. Fenster`),
  legend: (min: number) => `Optimales Posting-Fenster (Score ab ${min})`,
  hint: 'Ziehen',
  keyHint: 'Pfeiltasten',
}
const EN: typeof DE = {
  title: 'The next momentum',
  scale: 'Scale: 0–100 activity score',
  timeMachine: 'Time machine',
  windowNo: (n) =>
    n === 1 ? 'Best window' : `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} window`,
  legend: (min) => `Best posting window (score ${min}+)`,
  hint: 'Drag',
  keyHint: 'arrow keys',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

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
  caption,
}: {
  points: readonly ForecastPoint[]
  selectedDate: Date
  windows: readonly PostingWindow[]
  minuteNow: Date
  onScrub: (date: Date) => void
  onLive: () => void
  isLive: boolean
  recommendationThreshold: number
  caption?: string
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const reduceMotion = useReducedMotion()
  // 1 SVG unit = 1 CSS px: the height is set in CSS, the width follows the panel.
  const { ref, width, height } = useSvgBox<SVGSVGElement>({ width: 720, height: 240 })
  const pad = { l: 32, r: 12, t: 18, b: 34 }
  const domain: [Date, Date] = [points[0]?.date ?? new Date(), points.at(-1)?.date ?? new Date()]
  const x = scaleTime()
    .domain(domain)
    .range([pad.l, width - pad.r])
  // Window labels sit in rows above the plot, so the curve never crosses them. Rows are packed greedily: a label
  // only moves down a row when it would touch one to its left – usually one row, so the plot keeps its height.
  const labelRowHeight = 16
  const LABEL_CHAR_PX = 7 // 12 px UI font, generous average glyph width
  const rowEnds: number[] = []
  const labelRows = windows.map((win, index) => {
    const centre = x(win.start) + (x(win.end) - x(win.start)) / 2
    const half = (t.windowNo(index + 1).length * LABEL_CHAR_PX) / 2 + 4
    let row = rowEnds.findIndex((end) => end < centre - half)
    if (row < 0) row = rowEnds.length
    rowEnds[row] = centre + half
    return row
  })
  const plotTop = pad.t + Math.max(1, rowEnds.length) * labelRowHeight + 4
  const y = scaleLinear()
    .domain([0, 100])
    .range([height - pad.b, plotTop])
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
        <h2 id="forecast-title">{t.title}</h2>
        <span className="micro">{t.scale}</span>
      </div>
      <svg
        ref={ref}
        className="forecast"
        viewBox={`0 0 ${width} ${height}`}
        role="slider"
        tabIndex={0}
        aria-label={t.timeMachine}
        aria-valuemin={domain[0].getTime()}
        aria-valuemax={domain[1].getTime()}
        aria-valuenow={selectedInDomain.getTime()}
        aria-valuetext={selectedDate.toLocaleString(intl, {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          weekday: 'short',
          day: locale === 'en' ? 'numeric' : '2-digit',
          month: locale === 'en' ? 'short' : '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })}
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
              className={`window-band ${index === 0 ? 'window-band-best' : 'window-band-neutral'}`}
            />
            <text
              x={x(win.start) + (x(win.end) - x(win.start)) / 2}
              y={pad.t + 12 + (labelRows[index] ?? 0) * labelRowHeight}
              textAnchor="middle"
              className="window-band-label"
            >
              {t.windowNo(index + 1)}
            </text>
          </g>
        ))}
        <motion.path d={areaPath} className="forecast-area" />
        <motion.path
          d={linePath}
          className="forecast-line"
          initial={false}
          animate={{ d: linePath }}
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
        <i /> {t.legend(recommendationThreshold)}
      </div>
      <div className="scrub-readout">
        <span>{t.timeMachine}</span>
        <strong>
          {selectedDate.toLocaleString(intl, {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </strong>
        <span className="scrub-hint">
          {t.hint}
          <span className="scrub-key-hint"> · {t.keyHint}</span>
        </span>
        <button type="button" onClick={onLive} disabled={isLive}>
          Live
        </button>
      </div>
      {caption && (
        <p className="chart-caption" title={caption}>
          {caption}
        </p>
      )}
    </section>
  )
}
