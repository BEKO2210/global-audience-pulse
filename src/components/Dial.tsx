import { useState } from 'react'
import { PHASES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import { formatDecimalHour, localDecimalHourFast } from '../lib/time'
import { Flag } from './Flag'

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
}: {
  date: Date
  selected: readonly RegionId[]
  worldMean: number
}) {
  const cx = 150
  const cy = 150
  const selectedRegions = REGIONS.filter((region) => selected.includes(region.id))
  const [highlighted, setHighlighted] = useState<RegionId | null>(null)
  return (
    <section className="panel dial-panel" aria-labelledby="dial-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">24-Stunden-Aktivitätsrad</p>
          <h2 id="dial-title">Wann deine Märkte wach sind</h2>
        </div>
      </div>
      <div className="dial-wrap">
        <svg
          viewBox="0 0 300 300"
          className="dial"
          role="img"
          aria-label="Aktivitätsphasen der ausgewählten Märkte über 24 Stunden"
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
            const radius = 108 - index * 7
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
                <title>
                  Ring {index + 1}: {region.name} ({region.city})
                </title>
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
                        strokeWidth="5"
                      />
                      {from + duration > 24 && (
                        <path
                          d={arc(cx, cy, radius, 0, from + duration - 24)}
                          fill="none"
                          stroke={phase.color}
                          strokeWidth="5"
                        />
                      )}
                    </g>
                  )
                })}
              </g>
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
            Schwerpunkt
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="dial-mean">
            {formatDecimalHour(worldMean)}
          </text>
          <text x={cx} y={cy + 35} textAnchor="middle" className="dial-date">
            {selected.length} Märkte aktiv
          </text>
        </svg>
        <p className="dial-explainer">
          Jedes Ringsegment zeigt die Aktivitätsphase zur lokalen Stunde.
        </p>
        <div className="dial-legend" aria-label="Ringreihenfolge außen nach innen">
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
              <Flag code={region.flag} label={region.name} size={16} />
              {region.city}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
