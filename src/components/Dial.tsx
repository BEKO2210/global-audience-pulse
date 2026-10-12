import { useRef, useState, type CSSProperties } from 'react'
import { MODEL_CONFIG, PHASES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import { formatDecimalHour, localDecimalHourFast, snapToMinutes, timeValueText } from '../lib/time'
import { track } from '../lib/analytics'
import { Flag } from './Flag'
import { useSvgBox } from '../hooks/useSvgBox'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { cityName, phaseName, regionName } from '../i18n/labels'

const DE = {
  title: 'Wann deine Märkte wach sind',
  dialLabel: 'Aktivitätsphasen der ausgewählten Märkte über 24 Stunden',
  ring: (n: number, region: string, city: string) => `Ring ${n}: ${region} (${city})`,
  centre: 'Schwerpunkt',
  markets: (n: number) => `${n} ${n === 1 ? 'Markt' : 'Märkte'}`,
  explainer:
    'Ringe in deiner Zeitzone: Jedes Segment zeigt die Aktivitätsphase eines Markts, der Zeiger die gewählte Zeit.',
  phases: 'Aktivitätsphasen',
  phaseRange: (from: string, to: string) => `${from}–${to} Uhr`,
  direction: (outer: string, inner: string) => `Außen ${outer}, innen ${inner}`,
  order: 'Ringreihenfolge außen nach innen',
}
const EN: typeof DE = {
  title: 'When your markets are awake',
  dialLabel: 'Activity phases of the selected markets over 24 hours',
  ring: (n, region, city) => `Ring ${n}: ${region} (${city})`,
  centre: 'Weighted mean',
  markets: (n) => `${n} ${n === 1 ? 'market' : 'markets'}`,
  explainer:
    'Rings in your time zone: each segment shows a market’s activity phase, the hand the selected time.',
  phases: 'Activity phases',
  phaseRange: (from, to) => `${from}–${to}`,
  direction: (outer, inner) => `Outer ${outer}, inner ${inner}`,
  order: 'Ring order, outer to inner',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const SLIDER_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]

const polar = (cx: number, cy: number, radius: number, hour: number) => {
  const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const
}

function arc(cx: number, cy: number, radius: number, from: number, to: number) {
  const start = polar(cx, cy, radius, from)
  const end = polar(cx, cy, radius, to)
  return `M ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${to - from > 12 ? 1 : 0} 1 ${end[0]} ${end[1]}`
}

export function Dial({
  date,
  selected,
  worldMean,
  viewerZone,
  minuteNow,
  score,
  onScrub,
  caption,
}: {
  date: Date
  selected: readonly RegionId[]
  worldMean: number
  viewerZone: string
  minuteNow: Date
  /** Overall score at `date`, spoken with the time so the three sliders announce the same value. */
  score?: number
  onScrub: (date: Date) => void
  caption?: string
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const city = (region: (typeof REGIONS)[number]) => cityName(region.id, region.city, locale)
  const cx = 150
  const cy = 150
  const selectedRegions = REGIONS.filter((region) => selected.includes(region.id))
  const [highlighted, setHighlighted] = useState<RegionId | null>(null)
  const touchStart = useRef<{ x: number; y: number; scrubbing: boolean } | null>(null)
  const lastScrub = useRef<Date | null>(null)
  // the dial keeps its 300-unit geometry; its text divides by the rendered scale so it lands on the type scale
  const { ref, width } = useSvgBox<SVGSVGElement>({ width: 300, height: 300 })
  // the centre lines keep their CSS size, so their spacing must scale the same way or they collide on a small dial
  const unit = 300 / Math.max(width, 1)
  const outer = selectedRegions[0]
  const inner = selectedRegions.at(-1)
  const minimum = minuteNow.getTime()
  const maximum = minimum + 24 * 3_600_000
  const selectedInDomain = new Date(Math.min(maximum, Math.max(minimum, date.getTime())))
  const hand = polar(cx, cy, 116, localDecimalHourFast(date, viewerZone))
  const handStart = polar(cx, cy, 40, localDecimalHourFast(date, viewerZone))
  const scrub = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((clientX - rect.left) / rect.width) * 300
    const y = ((clientY - rect.top) / rect.height) * 300
    const hour = (((Math.atan2(y - cy, x - cx) + Math.PI / 2) / (2 * Math.PI)) * 24 + 24) % 24
    const h0 = localDecimalHourFast(minuteNow, viewerZone)
    const delta = (((hour - h0) % 24) + 24) % 24
    // A DST transition inside these 24 hours may shift the resulting wall-clock time by one hour.
    const next = snapToMinutes(
      new Date(minuteNow.getTime() + delta * 3_600_000),
      MODEL_CONFIG.scanStepMinutes,
    )
    lastScrub.current = next
    onScrub(next)
  }
  const trackScrub = (quelle: 'uhr' | 'tastatur', next: Date) =>
    track('Scrub', {
      quelle,
      horizont: '24h',
      offsetStunden: Math.round((next.getTime() - minuteNow.getTime()) / 3_600_000),
    })
  return (
    <section className="panel dial-panel" aria-labelledby="dial-title">
      <div className="section-head">
        <h2 id="dial-title">{t.title}</h2>
      </div>
      <div className="dial-wrap">
        <svg
          ref={ref}
          viewBox="0 0 300 300"
          className="dial"
          style={{ '--dial-scale': width / 300 } as CSSProperties}
          role="slider"
          tabIndex={0}
          aria-label={t.dialLabel}
          aria-valuemin={minimum}
          aria-valuemax={maximum}
          aria-valuenow={selectedInDomain.getTime()}
          aria-valuetext={timeValueText(date, viewerZone, locale, intl, score)}
          aria-keyshortcuts="Home"
          onPointerDown={(e) => {
            // Mouse/pen scrub immediately. Touch waits for intent: the browser keeps vertical
            // pans (touch-action: pan-y) so scrolling over the chart scrolls the page.
            touchStart.current = { x: e.clientX, y: e.clientY, scrubbing: false }
            lastScrub.current = null
            if (e.pointerType !== 'touch') {
              e.currentTarget.setPointerCapture(e.pointerId)
              scrub(e.clientX, e.clientY)
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== 'touch') {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientX, e.clientY)
              return
            }
            const start = touchStart.current
            if (!start) return
            if (!start.scrubbing && Math.abs(e.clientX - start.x) > 8) {
              start.scrubbing = Math.abs(e.clientX - start.x) > Math.abs(e.clientY - start.y)
              if (start.scrubbing) e.currentTarget.setPointerCapture(e.pointerId)
            }
            if (start.scrubbing) scrub(e.clientX, e.clientY)
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
              scrub(e.clientX, e.clientY)
            touchStart.current = null
            if (lastScrub.current) trackScrub('uhr', lastScrub.current)
          }}
          onPointerCancel={() => {
            touchStart.current = null
          }}
          onKeyDown={(e) => {
            // role=slider promises Up/Down as well as Left/Right (APG); Home is "now", End the last hour
            if (SLIDER_KEYS.includes(e.key)) e.preventDefault()
            const next =
              e.key === 'ArrowLeft' || e.key === 'ArrowDown'
                ? new Date(date.getTime() - 15 * 60_000)
                : e.key === 'ArrowRight' || e.key === 'ArrowUp'
                  ? new Date(date.getTime() + 15 * 60_000)
                  : e.key === 'PageUp'
                    ? new Date(date.getTime() + 12 * 3_600_000)
                    : e.key === 'PageDown'
                      ? new Date(date.getTime() - 12 * 3_600_000)
                      : e.key === 'Home'
                        ? minuteNow
                        : e.key === 'End'
                          ? new Date(maximum)
                          : null
            if (next) {
              onScrub(next)
              trackScrub('tastatur', next)
            }
          }}
        >
          {Array.from({ length: 24 }, (_, hour) => {
            const outer = polar(cx, cy, 130, hour)
            const inner = polar(cx, cy, hour % 6 === 0 ? 119 : 124, hour)
            return (
              <line
                key={hour}
                x1={inner[0]}
                y1={inner[1]}
                x2={outer[0]}
                y2={outer[1]}
                className="dial-tick"
              />
            )
          })}
          {selectedRegions.map((region, index) => {
            const radius = 110 - index * 9
            const localHour = localDecimalHourFast(date, region.timeZone)
            const offset = localHour - localDecimalHourFast(date, viewerZone)
            return (
              <g
                key={region.id}
                className={
                  highlighted && highlighted !== region.id ? 'dial-region muted' : 'dial-region'
                }
              >
                <title>{t.ring(index + 1, regionName(region.id, locale), city(region))}</title>
                {PHASES.map((phase) => {
                  const from = (((phase.from - offset) % 24) + 24) % 24
                  const duration = phase.to - phase.from
                  const firstEnd = Math.min(24, from + duration)
                  return (
                    <g key={phase.id}>
                      <path
                        d={arc(cx, cy, radius, from, firstEnd)}
                        fill="none"
                        stroke={phase.color}
                        strokeWidth="6"
                      />
                      {from + duration > 24 && (
                        <path
                          d={arc(cx, cy, radius, 0, from + duration - 24)}
                          fill="none"
                          stroke={phase.color}
                          strokeWidth="6"
                        />
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}
          <line
            className="dial-hand"
            x1={handStart[0]}
            y1={handStart[1]}
            x2={hand[0]}
            y2={hand[1]}
          />
          <circle className="dial-hand-point" cx={hand[0]} cy={hand[1]} r={3.5} />
          {selectedRegions.map((region, index) => {
            const radius = 110 - index * 9
            return (
              <text
                key={`ring-number-${region.id}`}
                // rings are 9 units apart, less than the 12 px numbers on a phone: alternate sides of the 00 axis
                x={cx + (index % 2 ? 7 : -7)}
                y={cy - radius + 3}
                textAnchor="middle"
                className="dial-ring-number"
              >
                {index + 1}
              </text>
            )
          })}
          {[0, 6, 12, 18].map((hour) => {
            const point = polar(cx, cy, 141, hour)
            return (
              <text key={hour} x={point[0]} y={point[1] + 4} textAnchor="middle">
                {String(hour).padStart(2, '0')}
              </text>
            )
          })}
          <text x={cx} y={cy - 10 * unit} textAnchor="middle" className="dial-center-label">
            {t.centre}
          </text>
          <text x={cx} y={cy + 14 * unit} textAnchor="middle" className="dial-mean">
            {formatDecimalHour(worldMean)}
          </text>
          <text x={cx} y={cy + 30 * unit} textAnchor="middle" className="dial-date">
            {t.markets(selected.length)}
          </text>
        </svg>
        <p className="dial-explainer">{t.explainer}</p>
        <div className="phase-colour-legend" role="group" aria-label={t.phases}>
          {PHASES.map((phase) => (
            <span key={phase.id}>
              <i style={{ background: phase.color }} />
              {phaseName(phase.id, phase.name, locale)} ·{' '}
              {t.phaseRange(String(phase.from).padStart(2, '0'), String(phase.to).padStart(2, '0'))}
            </span>
          ))}
        </div>
        {outer && inner && (
          <p className="ring-direction">{t.direction(city(outer), city(inner))}</p>
        )}
        <div className="dial-legend" role="group" aria-label={t.order}>
          {selectedRegions.map((region, index) => (
            <button
              key={region.id}
              type="button"
              aria-pressed={highlighted === region.id}
              onClick={() => setHighlighted(highlighted === region.id ? null : region.id)}
              onPointerEnter={() => setHighlighted(region.id)}
              onPointerLeave={() => setHighlighted(null)}
            >
              <span>{index + 1}</span>
              <Flag code={region.flag} label="" size={16} />
              {city(region)}
            </button>
          ))}
        </div>
      </div>
      {caption && (
        <p className="chart-caption" title={caption}>
          {caption}
        </p>
      )}
    </section>
  )
}
