import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { PHASES, SERIES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import type { LiveMeasure } from '../hooks/useLiveData'
import { normalizedWeights, phaseAt, regionActivity } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { formatTime, localDecimalHour } from '../lib/time'
import { Sparkline } from './Sparkline'

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
}: {
  date: Date
  selected: readonly RegionId[]
  snapshot: Snapshot
  live: Partial<Record<RegionId, LiveMeasure>>
  onToggle: (id: RegionId) => void
}) {
  const [filter, setFilter] = useState<'all' | 'measured' | 'model'>('all')
  const [expanded, setExpanded] = useState<RegionId | null>(null)
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])
  const displayDate = Math.abs(clock.getTime() - date.getTime()) < 61_000 ? clock : date
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
          <h2 id="regions-title">Deine globale Redaktion</h2>
        </div>
        <span className="micro">
          {selected.length} von {REGIONS.length} aktiv
        </span>
      </div>
      <div className="audience-selector" aria-label="Zielgruppen-Auswahl">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            className={selected.includes(region.id) ? 'chip active' : 'chip'}
            onClick={() => onToggle(region.id)}
            aria-pressed={selected.includes(region.id)}
          >
            {region.flag} {region.city}
          </button>
        ))}
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
          const score = regionActivity(region, date, snapshot)
          const phase = phaseAt(localDecimalHour(date, region.timeZone))
          const measured = Boolean(snapshot.profiles[region.id])
          const values = Array.from({ length: 48 }, (_, i) =>
            regionActivity(region, new Date(date.getTime() + (i - 12) * 30 * 60_000), snapshot),
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
                  <span className="flag">{region.flag}</span>
                  <span className="compact-place">
                    <b>{region.city}</b>
                    <small>
                      <i style={{ background: phase.color }} /> {phase.name}
                    </small>
                  </span>
                  <span className="compact-time">
                    {formatTime(displayDate, region.timeZone, true)}
                  </span>
                  <Sparkline values={values} color={SERIES[index]} height={28} />
                  <strong className="compact-score">{Math.round(score)}</strong>
                </div>
                <motion.div layout className="card-detail">
                  <div className="card-top">
                    <p className="eyebrow">{region.name}</p>
                    <span className={measured ? 'badge measured' : 'badge'}>
                      {measured ? 'gemessen' : 'Modell'}
                    </span>
                  </div>
                  <div className="region-time">
                    {formatTime(displayDate, region.timeZone, true)}
                  </div>
                  <p className="phase" style={{ color: phase.color }}>
                    {phase.emoji} {phase.name}
                  </p>
                  <div className="card-score">
                    <strong>{Math.round(score)}</strong>
                    <span>/100</span>
                  </div>
                  <Sparkline values={values} color={SERIES[index]} height={36} />
                  {measuredAt && (
                    <p className="deviation">
                      {measure
                        ? `gerade ${measure.deviation >= 0 ? '+' : ''}${Math.round(measure.deviation)} % · `
                        : ''}
                      Messung vor {measuredAge(measuredAt)}
                    </p>
                  )}
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
            <i style={{ background: phase.color }} />
            {phase.name} · {String(phase.from).padStart(2, '0')}–{String(phase.to).padStart(2, '0')}{' '}
            Uhr
          </span>
        ))}
      </div>
    </section>
  )
}
