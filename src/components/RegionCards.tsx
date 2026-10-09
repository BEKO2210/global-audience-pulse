import { useState } from 'react'
import { motion } from 'motion/react'
import { PHASES, SERIES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import type { LiveMeasure } from '../hooks/useLiveData'
import { normalizedWeights, phaseAt, type ScoreGrid } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { localDecimalHourFast } from '../lib/time'
import { Sparkline } from './Sparkline'
import { Flag } from './Flag'
import { PhaseIcon } from './PhaseIcon'
import { AnimatedNumber } from './AnimatedNumber'
import { RegionClock } from './Clock'

function measuredAge(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  return minutes < 60 ? `${minutes} Min` : `${Math.round(minutes / 60)} Std`
}

export function RegionCards({
  date,
  selected,
  snapshot,
  live,
  onToggle,
  grid,
  onSelectAll,
  onReset,
  isLive,
}: {
  date: Date
  selected: readonly RegionId[]
  snapshot: Snapshot
  live: Partial<Record<RegionId, LiveMeasure>>
  onToggle: (id: RegionId) => void
  grid: ScoreGrid
  onSelectAll: () => void
  onReset: () => void
  isLive: boolean
}) {
  const [filter, setFilter] = useState<'all' | 'measured' | 'model'>('all')
  const [expanded, setExpanded] = useState<RegionId | null>(null)
  const weights = normalizedWeights(selected, snapshot)
  const measuredCount = REGIONS.filter((region) => Boolean(snapshot.profiles[region.id])).length
  const visible = REGIONS.filter(
    (region) =>
      filter === 'all' ||
      (filter === 'measured'
        ? Boolean(snapshot.profiles[region.id])
        : !snapshot.profiles[region.id]),
  )

  return (
    <section className="regions-section" aria-labelledby="regions-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Regionen</p>
          <h2 id="regions-title">Deine Zielgruppen-Märkte</h2>
        </div>
        <div className="selection-actions">
          <span className="micro">
            {selected.length} von {REGIONS.length} aktiv
          </span>
          <button className="text-button" onClick={onSelectAll}>
            Alle auswählen
          </button>
          <button className="text-button" onClick={onReset}>
            Auswahl zurücksetzen
          </button>
        </div>
      </div>
      <div className="filter-row" aria-label="Regionen filtern">
        <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>
          Alle ({REGIONS.length})
        </button>
        <button onClick={() => setFilter('measured')} aria-pressed={filter === 'measured'}>
          Gemessen ({measuredCount})
        </button>
        <button onClick={() => setFilter('model')} aria-pressed={filter === 'model'}>
          Modell ({REGIONS.length - measuredCount})
        </button>
      </div>
      <div className="region-grid">
        {visible.map((region) => {
          const index = REGIONS.findIndex((item) => item.id === region.id)
          const score = grid.activityAt(region.id, date)
          const phase = phaseAt(localDecimalHourFast(date, region.timeZone))
          const measured = Boolean(snapshot.profiles[region.id])
          const values = Array.from({ length: 48 }, (_, i) =>
            grid.activityAt(region.id, new Date(date.getTime() + (i - 12) * 30 * 60_000)),
          )
          const measure = live[region.id]
          const measuredAt = measure?.lastMeasuredAt ?? snapshot.profiles[region.id]?.lastMeasuredAt
          const isExpanded = expanded === region.id
          return (
            <motion.article
              layout
              key={region.id}
              className={`${selected.includes(region.id) ? 'region-card' : 'region-card unselected'}${isExpanded ? ' expanded' : ''}`}
            >
              <button
                className="card-main"
                onClick={() => setExpanded(isExpanded ? null : region.id)}
                aria-expanded={isExpanded}
              >
                <div className="compact-card">
                  <span className="flag">
                    <Flag src={region.flagUrl} label={region.name} size={28} />
                  </span>
                  <span className="compact-place">
                    <b>{region.city}</b>
                    <small>
                      <PhaseIcon icon={phase.icon} /> {phase.name}
                    </small>
                  </span>
                  <span className="compact-time">
                    <RegionClock date={date} timeZone={region.timeZone} live={isLive} />
                  </span>
                  <Sparkline values={values} color={SERIES[index]} height={28} />
                  <strong className="compact-score">
                    <AnimatedNumber value={score} />
                  </strong>
                </div>
                <motion.div layout className="card-detail">
                  <div className="card-top">
                    <p className="eyebrow">{region.name}</p>
                    <span className={measured ? 'badge measured' : 'badge'}>
                      {measured ? 'gemessen' : 'Modell'}
                    </span>
                  </div>
                  <div className="region-time">
                    <RegionClock date={date} timeZone={region.timeZone} live={isLive} />
                  </div>
                  <p className="phase">
                    <PhaseIcon icon={phase.icon} /> {phase.name}
                  </p>
                  <div className="card-score">
                    <strong>
                      <AnimatedNumber value={score} />
                    </strong>
                    <span>/100</span>
                  </div>
                  <Sparkline values={values} color={SERIES[index]} height={36} />
                  <p className="deviation">
                    {measuredAt ? (
                      <>
                        {measure
                          ? `gerade ${measure.deviation >= 0 ? '+' : ''}${Math.round(measure.deviation)} % · `
                          : ''}
                        Messung vor {measuredAge(measuredAt)}
                      </>
                    ) : (
                      <span className="deviation-placeholder">Statistisches Basismodell</span>
                    )}
                  </p>
                  <div className="weight">
                    <span
                      style={{
                        width: `${(weights[region.id] ?? 0) * 100}%`,
                        background: SERIES[index],
                      }}
                    />
                  </div>
                  <p className="weight-label">
                    <span>Zielgruppenanteil</span>
                    <b>
                      {selected.includes(region.id)
                        ? `${Math.round((weights[region.id] ?? 0) * 100)} %`
                        : '—'}
                    </b>
                  </p>
                </motion.div>
              </button>
              <button
                className="compact-toggle"
                onClick={() => onToggle(region.id)}
                role="switch"
                aria-checked={selected.includes(region.id)}
                aria-label={`${region.city} ${selected.includes(region.id) ? 'abwählen' : 'auswählen'}`}
              >
                <i />
              </button>
              <button
                className="include-button"
                onClick={() => onToggle(region.id)}
                role="switch"
                aria-checked={selected.includes(region.id)}
              >
                <span>
                  {selected.includes(region.id) ? 'In Zielgruppe' : 'Nicht in Zielgruppe'}
                </span>
                <i />
              </button>
            </motion.article>
          )
        })}
      </div>
      <div className="phase-legend">
        {PHASES.map((phase) => (
          <span key={phase.id}>
            <PhaseIcon icon={phase.icon} />
            {phase.name} · {String(phase.from).padStart(2, '0')}–{String(phase.to).padStart(2, '0')}{' '}
            Uhr
          </span>
        ))}
      </div>
    </section>
  )
}
