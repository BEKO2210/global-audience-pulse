import { REGIONS, type RegionId } from '../config/regions'
import { SERIES } from '../config/model'
import { formatDecimalHour, formatTime, localDecimalHour } from '../lib/time'

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
  const radius = 108
  return (
    <section className="panel dial-panel" aria-labelledby="dial-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">24-Stunden-Zifferblatt</p>
          <h2 id="dial-title">Ein Tag, acht Orte</h2>
        </div>
      </div>
      <div className="dial-wrap">
        <svg viewBox="0 0 300 300" className="dial" aria-label="Ortszeiten als kreisförmige Uhr">
          <circle cx={cx} cy={cy} r={radius} className="dial-ring" />
          {Array.from({ length: 24 }, (_, h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2
            const outer = radius + 5
            const inner = radius + (h % 6 === 0 ? -8 : -3)
            return (
              <g key={h}>
                <line
                  x1={cx + Math.cos(a) * inner}
                  y1={cy + Math.sin(a) * inner}
                  x2={cx + Math.cos(a) * outer}
                  y2={cy + Math.sin(a) * outer}
                  className="dial-tick"
                />
                {h % 6 === 0 && (
                  <text
                    x={cx + Math.cos(a) * (radius - 22)}
                    y={cy + Math.sin(a) * (radius - 22) + 4}
                    textAnchor="middle"
                  >
                    {String(h).padStart(2, '0')}
                  </text>
                )}
              </g>
            )
          })}
          {REGIONS.map((region, i) => {
            const h = localDecimalHour(date, region.timeZone)
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2
            const pinRadius = radius + 2
            const tickRadius = radius - 10
            return (
              <g key={region.id} className={selected.includes(region.id) ? '' : 'pin-muted'}>
                <line
                  x1={cx + Math.cos(a) * tickRadius}
                  y1={cy + Math.sin(a) * tickRadius}
                  x2={cx + Math.cos(a) * (pinRadius - 5)}
                  y2={cy + Math.sin(a) * (pinRadius - 5)}
                  stroke={SERIES[i]}
                  className="dial-pin-tick"
                />
                <circle
                  cx={cx + Math.cos(a) * pinRadius}
                  cy={cy + Math.sin(a) * pinRadius}
                  r="6"
                  fill={SERIES[i]}
                  stroke="var(--paper-2)"
                  strokeWidth="2"
                />
                <title>
                  {region.name}: {formatTime(date, region.timeZone)}
                </title>
              </g>
            )
          })}
          <text x={cx} y={cy - 10} textAnchor="middle" className="dial-center-label">
            Weltmittelzeit
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="dial-mean">
            {formatDecimalHour(worldMean)}
          </text>
          <text x={cx} y={cy + 35} textAnchor="middle" className="dial-date">
            {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </text>
        </svg>
        <ol className="dial-list">
          {REGIONS.map((region, i) => (
            <li key={region.id} className={selected.includes(region.id) ? '' : 'muted-item'}>
              <i style={{ background: SERIES[i] }} />
              <span>{region.city}</span>
              <strong>{formatTime(date, region.timeZone)}</strong>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
