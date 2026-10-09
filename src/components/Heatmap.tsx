import { memo } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import type { ScoreGrid } from '../lib/model'
import { formatTime } from '../lib/time'
import { Flag } from './Flag'

// Props only change per minute or on audience change, not while scrubbing.
export const Heatmap = memo(function Heatmap({
  start,
  selected,
  grid,
  onScrub,
}: {
  start: Date
  selected: readonly RegionId[]
  grid: ScoreGrid
  onScrub: (date: Date) => void
}) {
  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hours = Array.from({ length: 24 }, (_, i) => new Date(start.getTime() + i * 3_600_000))
  const heatLevel = (score: number) => Math.min(4, Math.floor(score / 20))
  return (
    <section className="panel heatmap-panel" aria-labelledby="heatmap-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Zielgruppe × Zeit</p>
          <h2 id="heatmap-title">Aktivitätsmatrix</h2>
        </div>
        <span className="micro">Deine Zeitzone</span>
      </div>
      <div className="heatmap-scroll">
        <div
          className="heatmap"
          style={{
            gridTemplateColumns: `minmax(70px, 90px) repeat(${hours.length}, minmax(28px, 1fr))`,
          }}
        >
          <span />
          {hours.map((date, i) => (
            <span
              key={date.getTime()}
              className={i === 0 ? 'current-col axis-label' : 'axis-label'}
            >
              {i === 0 ? 'jetzt' : i % 3 === 0 ? formatTime(date, userZone).slice(0, 2) : ''}
            </span>
          ))}
          {REGIONS.filter((r) => selected.includes(r.id)).map((region) => (
            <div key={region.id} className="heatmap-row">
              <span className="heatmap-label">
                <Flag code={region.flag} label={region.name} size={16} /> {region.city}
              </span>
              {hours.map((date, i) => {
                const score = grid.activityAt(region.id, date)
                return (
                  <button
                    key={date.getTime()}
                    className={`${i === 0 ? 'heat-cell current-col' : 'heat-cell'} heat-${heatLevel(score)}`}
                    aria-label={`${region.city}, ${formatTime(date, userZone)}: ${Math.round(score)} Prozent`}
                    onClick={() => onScrub(date)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heat-legend" aria-label="Aktivitätsskala">
        <span>Niedrig</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`heat-${level}`} />
        ))}
        <span>Hoch</span>
      </div>
    </section>
  )
})
