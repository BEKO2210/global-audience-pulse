import { memo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import type { ScoreGrid } from '../lib/model'
import { formatTime } from '../lib/time'
import { Flag } from './Flag'
import { ACTIVITY_LEVELS } from '../config/model'
import './Heatmap.css'
import { track } from '../lib/analytics'

const HEATMAP_LABEL_WIDTH = 'var(--heatmap-label-width)'
const HOUR_MS = 3_600_000
// 24 hourly columns: the timeline spans 24 h (a 23 h span put the cursor one column early).
const TIMELINE_SPAN_MS = 24 * HOUR_MS

function formatCursorLabel(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat('de-DE', { timeZone, weekday: 'short' })
    .format(date)
    .replace(/\.$/, '')
  return `${weekday} ${formatTime(date, timeZone)}`
}

function ratioAlongTimeline(time: Date, start: Date) {
  return Math.min(1, Math.max(0, (time.getTime() - start.getTime()) / TIMELINE_SPAN_MS))
}

function columnIndex(time: Date, start: Date) {
  return Math.min(23, Math.max(0, Math.floor((time.getTime() - start.getTime()) / HOUR_MS)))
}

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
  const hours = Array.from({ length: 24 }, (_, i) => new Date(start.getTime() + i * HOUR_MS))
  const regions = REGIONS.filter((region) => selected.includes(region.id))
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 })
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const heatLevel = (score: number) => {
    const index = ACTIVITY_LEVELS.findIndex((level) => score >= level.min && score <= level.max)
    return index < 0 ? ACTIVITY_LEVELS.length - 1 : index
  }
  const selectedRatio = ratioAlongTimeline(selectedDate, start)
  // Fraction of the way through its hour column (cursor is placed in the column itself, so grid gaps
  // and label width never skew it).
  const columnFraction = (time: Date) =>
    Math.min(1, Math.max(0, ((time.getTime() - start.getTime()) % HOUR_MS) / HOUR_MS))
  const selectedColumn = columnIndex(selectedDate, start)
  const nowColumn = columnIndex(start, start)
  const sameInstant =
    Math.floor(selectedDate.getTime() / 60_000) === Math.floor(start.getTime() / 60_000)
  const selectedCursorLabel = sameInstant ? 'jetzt' : formatCursorLabel(selectedDate, userZone)
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
              gridTemplateColumns: `${HEATMAP_LABEL_WIDTH} repeat(${hours.length}, minmax(28px, 1fr))`,
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
                className={i === selectedColumn ? 'axis-label selected-col-header' : 'axis-label'}
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
                const columnClass =
                  column === selectedColumn
                    ? 'selected-col'
                    : column === nowColumn && !sameInstant
                      ? 'now-col'
                      : ''
                return (
                  <button
                    key={date.getTime()}
                    ref={(element) => {
                      if (element) cellRefs.current.set(key, element)
                      else cellRefs.current.delete(key)
                    }}
                    role="gridcell"
                    tabIndex={activeCell.row === row && activeCell.column === column ? 0 : -1}
                    className={`heat-cell ${columnClass} heat-${heatLevel(score)}`}
                    style={{ animationDelay: `${column * 18}ms` }}
                    aria-label={`${region.city}, ${formatTime(date, userZone)}: ${Math.round(score)} Prozent`}
                    onFocus={() => setActiveCell({ row, column })}
                    onKeyDown={(event) => onCellKeyDown(event, row, column)}
                    onClick={() => {
                      onScrub(date)
                      track('Scrub', {
                        quelle: 'heatmap',
                        horizont: '24h',
                        offsetStunden: Math.round((date.getTime() - start.getTime()) / HOUR_MS),
                      })
                    }}
                  />
                )
              })}
            </div>
          ))}
          {/* Separate overlay grid with identical columns: cursors must not take part in the
              auto-placement of the cells (they would shift every cell by a column). */}
          <div
            className="heatmap-cursor-grid"
            aria-hidden="true"
            style={{
              gridTemplateColumns: `${HEATMAP_LABEL_WIDTH} repeat(${hours.length}, minmax(28px, 1fr))`,
            }}
          >
            {!sameInstant && (
              <div
                aria-hidden="true"
                className="heatmap-cursor heatmap-cursor--now"
                style={
                  {
                    gridColumn: nowColumn + 2,
                    '--cursor-fraction': columnFraction(start),
                  } as CSSProperties
                }
              >
                <span className="heatmap-cursor-label">jetzt</span>
              </div>
            )}
            <div
              aria-hidden="true"
              className="heatmap-cursor heatmap-cursor--selected"
              data-testid="heatmap-selected-cursor"
              style={
                {
                  gridColumn: selectedColumn + 2,
                  '--cursor-fraction': columnFraction(selectedDate),
                } as CSSProperties
              }
            >
              <span className="heatmap-cursor-label">{selectedCursorLabel}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="heat-legend" aria-label="Aktivität 0 bis 100">
        <strong>Aktivität 0–100</strong>
        {ACTIVITY_LEVELS.map((level, index) => (
          <span key={level.min} title={level.label}>
            <i className={`heat-${index}`} />
            <span className="sr-only">{level.label}</span>
          </span>
        ))}
      </div>
    </section>
  )
})
