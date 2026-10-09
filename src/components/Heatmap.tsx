import { memo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import type { ScoreGrid } from '../lib/model'
import { formatTime } from '../lib/time'
import { Flag } from './Flag'

// Props only change per minute or on audience change, not while scrubbing.
export const Heatmap = memo(function Heatmap({
  start,
  selectedDate,
  selected,
  grid,
  onScrub,
}: {
  start: Date
  selectedDate: Date
  selected: readonly RegionId[]
  grid: ScoreGrid
  onScrub: (date: Date) => void
}) {
  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hours = Array.from({ length: 24 }, (_, i) => new Date(start.getTime() + i * 3_600_000))
  const regions = REGIONS.filter((region) => selected.includes(region.id))
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 })
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const heatLevel = (score: number) => Math.min(4, Math.floor(score / 20))
  const selectedRatio = Math.min(
    1,
    Math.max(0, (selectedDate.getTime() - start.getTime()) / (23 * 3_600_000)),
  )
  const moveFocus = (row: number, column: number) => {
    const next = {
      row: Math.min(regions.length - 1, Math.max(0, row)),
      column: Math.min(hours.length - 1, Math.max(0, column)),
    }
    setActiveCell(next)
    cellRefs.current.get(`${next.row}:${next.column}`)?.focus()
  }
  const onCellKeyDown = (event: KeyboardEvent<HTMLButtonElement>, row: number, column: number) => {
    const movement: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [row, column - 1],
      ArrowRight: [row, column + 1],
      ArrowUp: [row - 1, column],
      ArrowDown: [row + 1, column],
      Home: [row, 0],
      End: [row, hours.length - 1],
    }
    const next = movement[event.key]
    if (!next) return
    event.preventDefault()
    moveFocus(...next)
  }
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
          role="grid"
          aria-label="Aktivität nach Region und Zeit"
          style={
            {
              gridTemplateColumns: `minmax(70px, 90px) repeat(${hours.length}, minmax(28px, 1fr))`,
              '--selected-ratio': selectedRatio,
            } as CSSProperties
          }
        >
          <div className="heatmap-row" role="row">
            <span role="columnheader" />
            {hours.map((date, i) => (
              <span
                key={date.getTime()}
                role="columnheader"
                className={i === 0 ? 'current-col axis-label' : 'axis-label'}
              >
                {i === 0 ? 'jetzt' : i % 3 === 0 ? formatTime(date, userZone).slice(0, 2) : ''}
              </span>
            ))}
          </div>
          {regions.map((region, row) => (
            <div key={region.id} className="heatmap-row" role="row">
              <span className="heatmap-label" role="rowheader">
                <Flag code={region.flag} label={region.name} size={16} /> {region.city}
              </span>
              {hours.map((date, column) => {
                const score = grid.activityAt(region.id, date)
                const key = `${row}:${column}`
                return (
                  <button
                    key={date.getTime()}
                    ref={(element) => {
                      if (element) cellRefs.current.set(key, element)
                      else cellRefs.current.delete(key)
                    }}
                    role="gridcell"
                    tabIndex={activeCell.row === row && activeCell.column === column ? 0 : -1}
                    className={`${column === 0 ? 'heat-cell current-col' : 'heat-cell'} heat-${heatLevel(score)}`}
                    style={{ animationDelay: `${column * 18}ms` }}
                    aria-label={`${region.city}, ${formatTime(date, userZone)}: ${Math.round(score)} Prozent`}
                    onFocus={() => setActiveCell({ row, column })}
                    onKeyDown={(event) => onCellKeyDown(event, row, column)}
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
