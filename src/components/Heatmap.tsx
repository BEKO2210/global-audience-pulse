import { REGIONS, type RegionId } from '../config/regions'
import { regionActivity } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { formatTime } from '../lib/time'

export function Heatmap({
  start,
  selected,
  snapshot,
  onScrub,
}: {
  start: Date
  selected: readonly RegionId[]
  snapshot: Snapshot
  onScrub: (date: Date) => void
}) {
  const hours = Array.from({ length: 24 }, (_, i) => new Date(start.getTime() + i * 3_600_000))
  const heatLevel = (score: number) => Math.min(4, Math.floor(score / 20))
  return (
    <section className="panel heatmap-panel" aria-labelledby="heatmap-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Audience × Zeit</p>
          <h2 id="heatmap-title">Aktivitätsmatrix</h2>
        </div>
        <span className="micro">Deine Zeitzone</span>
      </div>
      <div className="heatmap-scroll">
        <div
          className="heatmap"
          style={{
            gridTemplateColumns: `minmax(54px, 88px) repeat(${hours.length}, minmax(0, 1fr))`,
          }}
        >
          <span />
          {hours.map((date, i) => (
            <span
              key={date.getTime()}
              className={i === 0 ? 'current-col axis-label' : 'axis-label'}
            >
              {i === 0
                ? 'jetzt'
                : i % 3 === 0
                  ? formatTime(date, Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 2)
                  : ''}
            </span>
          ))}
          {REGIONS.filter((r) => selected.includes(r.id)).map((region) => (
            <div key={region.id} className="heatmap-row">
              <span className="heatmap-label">
                {region.flag} {region.city}
              </span>
              {hours.map((date, i) => {
                const score = regionActivity(region, date, snapshot)
                return (
                  <button
                    key={date.getTime()}
                    className={`${i === 0 ? 'heat-cell current-col' : 'heat-cell'} heat-${heatLevel(score)}`}
                    aria-label={`${region.city}, ${formatTime(date, Intl.DateTimeFormat().resolvedOptions().timeZone)}: ${Math.round(score)} Prozent`}
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
}
