import { useState, type CSSProperties } from 'react'
import { PHASES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import { formatDecimalHour, localDecimalHourFast } from '../lib/time'
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
  explainer: 'Jedes Ringsegment zeigt die Aktivitätsphase zur lokalen Stunde.',
  phases: 'Aktivitätsphasen',
  phaseRange: (from: string, to: string) => `${from}–${to} Uhr`,
  direction: (outer: string, inner: string) => `Außen ${outer}, innen ${inner}`,
  order: 'Ringreihenfolge außen nach innen',
}
const EN: typeof DE = {
  title: 'When your markets are awake',
  dialLabel: 'Activity phases of the selected markets over 24 hours',
  ring: (n, region, city) => `Ring ${n}: ${region} (${city})`,
  centre: 'Centre',
  markets: (n) => `${n} ${n === 1 ? 'market' : 'markets'}`,
  explainer: 'Each ring segment shows the activity phase at the local hour.',
  phases: 'Activity phases',
  phaseRange: (from, to) => `${from}–${to}`,
  direction: (outer, inner) => `Outer ${outer}, inner ${inner}`,
  order: 'Ring order, outer to inner',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

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
  caption,
}: {
  date: Date
  selected: readonly RegionId[]
  worldMean: number
  caption?: string
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const city = (region: (typeof REGIONS)[number]) => cityName(region.id, region.city, locale)
  const cx = 150
  const cy = 150
  const selectedRegions = REGIONS.filter((region) => selected.includes(region.id))
  const [highlighted, setHighlighted] = useState<RegionId | null>(null)
  // the dial keeps its 300-unit geometry; its text divides by the rendered scale so it lands on the type scale
  const { ref, width } = useSvgBox<SVGSVGElement>({ width: 300, height: 300 })
  const outer = selectedRegions[0]
  const inner = selectedRegions.at(-1)
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
          role="img"
          aria-label={t.dialLabel}
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
            const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60
            const offset = localHour - utcHour
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
          <text x={cx} y={cy - 10} textAnchor="middle" className="dial-center-label">
            {t.centre}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="dial-mean">
            {formatDecimalHour(worldMean)}
          </text>
          <text x={cx} y={cy + 30} textAnchor="middle" className="dial-date">
            {t.markets(selected.length)}
          </text>
        </svg>
        <p className="dial-explainer">{t.explainer}</p>
        <div className="phase-colour-legend" aria-label={t.phases}>
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
        <div className="dial-legend" aria-label={t.order}>
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
              <Flag code={region.flag} label={regionName(region.id, locale)} size={16} />
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
