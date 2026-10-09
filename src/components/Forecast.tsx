import { useRef } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { motion } from 'motion/react'
import type { PostingWindow } from '../lib/model'
import { formatDateTime, formatTime } from '../lib/time'

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
  recommendationThreshold,
}: {
  points: readonly ForecastPoint[]
  selectedDate: Date
  windows: readonly PostingWindow[]
  minuteNow: Date
  onScrub: (date: Date) => void
  recommendationThreshold: number
}) {
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
  const scrub = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = Math.min(
      width - pad.r,
      Math.max(pad.l, ((clientX - rect.left) / rect.width) * width),
    )
    onScrub(x.invert(px))
  }
  const ticks = x.ticks(5)
  const selectedInDomain = new Date(
    Math.min(domain[1].getTime(), Math.max(domain[0].getTime(), selectedDate.getTime())),
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
          e.currentTarget.setPointerCapture(e.pointerId)
          scrub(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientX)
        }}
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home'].includes(e.key))
            e.preventDefault()
          if (e.key === 'ArrowLeft') onScrub(new Date(selectedDate.getTime() - 15 * 60_000))
          if (e.key === 'ArrowRight') onScrub(new Date(selectedDate.getTime() + 15 * 60_000))
          if (e.key === 'PageUp') onScrub(new Date(selectedDate.getTime() + 12 * 3_600_000))
          if (e.key === 'PageDown') onScrub(new Date(selectedDate.getTime() - 12 * 3_600_000))
          if (e.key === 'Home') onScrub(minuteNow)
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
              Top {index + 1}
            </text>
          </g>
        ))}
        <path d={areaPath} className="forecast-area" />
        <motion.path
          d={linePath}
          className="forecast-line"
          initial={false}
          animate={{ d: linePath }}
        />
        {ticks.map((tick) => (
          <g key={tick.getTime()} transform={`translate(${x(tick)} ${height - pad.b})`}>
            <line y2="5" className="axis-tick" />
            <text y="20" textAnchor="middle">
              {formatTime(tick, Intl.DateTimeFormat().resolvedOptions().timeZone)}
            </text>
          </g>
        ))}
        <line
          x1={x(selectedInDomain)}
          x2={x(selectedInDomain)}
          y1={pad.t}
          y2={height - pad.b}
          className="now-line"
        />
        <circle
          cx={x(selectedInDomain)}
          cy={y(
            points.reduce(
              (best, p) =>
                Math.abs(p.date.getTime() - selectedInDomain.getTime()) <
                Math.abs(best.date.getTime() - selectedInDomain.getTime())
                  ? p
                  : best,
              points[0]!,
            ).score,
          )}
          r="5"
          className="now-point"
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
      </div>
    </section>
  )
}
