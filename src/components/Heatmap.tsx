import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import type { ScoreGrid } from '../lib/model'
import { formatTime } from '../lib/time'
import { Flag } from './Flag'
import { ACTIVITY_LEVELS } from '../config/model'
import './Heatmap.css'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { cityName, regionName } from '../i18n/labels'

const DE = {
  now: 'jetzt',
  title: 'Aktivitätsmatrix',
  yourZone: 'Deine Zeitzone',
  gridLabel: 'Aktivität nach Markt und Zeit',
  cell: (city: string, time: string, score: number) => `${city}, ${time}: Score ${score} von 100`,
  legendLabel: 'Score 0 bis 100',
  legend: 'Score 0–100',
  swipeHint: 'Wischen →',
}
const EN: typeof DE = {
  now: 'now',
  title: 'Activity matrix',
  yourZone: 'Your time zone',
  gridLabel: 'Activity by market and time',
  cell: (city, time, score) => `${city}, ${time}: score ${score} out of 100`,
  legendLabel: 'Score 0 to 100',
  legend: 'Score 0–100',
  swipeHint: 'Swipe →',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const HEATMAP_LABEL_WIDTH = 'var(--heatmap-label-width)'
const HOUR_MS = 3_600_000
// 24 hourly columns: the timeline spans 24 h (a 23 h span put the cursor one column early).
const TIMELINE_SPAN_MS = 24 * HOUR_MS

function formatCursorLabel(date: Date, timeZone: string, intl: string) {
  const weekday = new Intl.DateTimeFormat(intl, { timeZone, weekday: 'short' })
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
  caption,
}: {
  start: Date
  selectedDate: Date
  selected: readonly RegionId[]
  grid: ScoreGrid
  onScrub: (date: Date) => void
  caption?: string
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hours = Array.from({ length: 24 }, (_, i) => new Date(start.getTime() + i * HOUR_MS))
  const regions = REGIONS.filter((region) => selected.includes(region.id))
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 })
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 599px)').matches)
      return false
    try {
      return window.localStorage.getItem('gap-heatmap-hint') !== 'seen'
    } catch {
      return false
    }
  })
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const scrollRef = useRef<HTMLDivElement>(null)
  // a cursor whose column has scrolled under the sticky city column hides, label and all – otherwise its pill
  // and the "now" chip float over the city names (they sit outside the rows, where no label covers them)
  const markCoveredCursors = () => {
    const scroller = scrollRef.current
    if (!scroller) return
    const edge =
      scroller.getBoundingClientRect().left +
      (parseFloat(
        getComputedStyle(scroller.querySelector('.heatmap-label') as Element)?.width ?? '0',
      ) || 0)
    scroller.querySelectorAll<HTMLElement>('.heatmap-cursor').forEach((cursor) => {
      // 3 px slack: the first column's cursor legitimately sits on the label edge (1.5 px optical offset)
      cursor.dataset.covered = String(cursor.getBoundingClientRect().left < edge - 3)
    })
  }
  useEffect(() => {
    markCoveredCursors()
  })
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
  const selectedCursorLabel = sameInstant ? t.now : formatCursorLabel(selectedDate, userZone, intl)
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
        <h2 id="heatmap-title">{t.title}</h2>
        <span className="micro">{t.yourZone}</span>
      </div>
      <div className="heatmap-scroll-shell">
        <div
          ref={scrollRef}
          className="heatmap-scroll"
          onScroll={(event) => {
            markCoveredCursors()
            if (!showSwipeHint || event.currentTarget.scrollLeft === 0) return
            setShowSwipeHint(false)
            try {
              window.localStorage.setItem('gap-heatmap-hint', 'seen')
            } catch {
              // Storage can be unavailable in hardened browser modes; hiding still works for this view.
            }
          }}
        >
          <div
            className="heatmap"
            role="grid"
            aria-label={t.gridLabel}
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
                  {i === 0 ? (
                    // the floating "now" badge marks this column visually; keep the word for screen readers
                    <span className="sr-only">{t.now}</span>
                  ) : i % 3 === 0 ? (
                    formatTime(date, userZone).slice(0, 2)
                  ) : (
                    ''
                  )}
                </span>
              ))}
            </div>
            {regions.map((region, row) => (
              <div key={region.id} className="heatmap-row" role="row">
                <span className="heatmap-label" role="rowheader">
                  <Flag code={region.flag} label={regionName(region.id, locale)} size={16} />{' '}
                  {cityName(region.id, region.city, locale)}
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
                      aria-label={t.cell(
                        cityName(region.id, region.city, locale),
                        formatTime(date, userZone),
                        Math.round(score),
                      )}
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
                  <span className="heatmap-cursor-label">{t.now}</span>
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
        {showSwipeHint && (
          <span className="heatmap-swipe-hint" aria-hidden="true">
            {t.swipeHint}
          </span>
        )}
      </div>
      <div className="heat-legend" aria-label={t.legendLabel}>
        <strong>{t.legend}</strong>
        {ACTIVITY_LEVELS.map((level, index) => (
          <span key={level.min} title={level.label}>
            <i className={`heat-${index}`} />
            <span className="sr-only">{level.label}</span>
          </span>
        ))}
      </div>
      {caption && (
        <p className="chart-caption" title={caption}>
          {caption}
        </p>
      )}
    </section>
  )
})
