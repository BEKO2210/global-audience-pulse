import { useState } from 'react'
import { PHASES, SERIES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import type { LiveMeasure } from '../hooks/useLiveData'
import { normalizedWeights, phaseAt, type ScoreGrid } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { holidayAt } from '../lib/holidays'
import { localDecimalHourFast } from '../lib/time'
import { Sparkline } from './Sparkline'
import { Flag } from './Flag'
import { PhaseIcon } from './PhaseIcon'
import { AnimatedNumber } from './AnimatedNumber'
import { RegionClock } from './Clock'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Locale, Messages } from '../i18n/locale'
import { cityName, phaseName, regionName } from '../i18n/labels'

const DE = {
  eyebrow: 'Regionen',
  title: 'Deine Zielgruppen-Märkte',
  active: (n: number, total: number) => `${n} von ${total} aktiv`,
  selectAll: 'Alle auswählen',
  reset: 'Auswahl zurücksetzen',
  filter: 'Regionen filtern',
  all: (n: number) => `Alle (${n})`,
  measured: (n: number) => `Gemessen (${n})`,
  model: (n: number) => `Modell (${n})`,
  holiday: 'Feiertag',
  snapshotProfile: 'Profil (Snapshot)',
  live: 'Live',
  dataProfile: 'Datenprofil',
  modelBadge: 'Modell',
  holidayNote: (name: string) => `Feiertag: ${name} – wird wie ein Sonntag gerechnet`,
  deviationNow: (value: string) => `gerade ${value} % · `,
  measuredAgo: (age: string) => `Messung vor ${age}`,
  baseline: 'Statistisches Basismodell',
  share: 'Zielgruppenanteil',
  percent: (n: number) => `${n} %`,
  toggle: (city: string, selected: boolean) => `${city} ${selected ? 'abwählen' : 'auswählen'}`,
  inAudience: 'In Zielgruppe',
  notInAudience: 'Nicht in Zielgruppe',
  phaseRange: (name: string, from: string, to: string) => `${name} · ${from}–${to} Uhr`,
}
const EN: typeof DE = {
  eyebrow: 'Regions',
  title: 'Your audience markets',
  active: (n, total) => `${n} of ${total} active`,
  selectAll: 'Select all',
  reset: 'Reset selection',
  filter: 'Filter regions',
  all: (n) => `All (${n})`,
  measured: (n) => `Measured (${n})`,
  model: (n) => `Model (${n})`,
  holiday: 'Holiday',
  snapshotProfile: 'Profile (snapshot)',
  live: 'Live',
  dataProfile: 'Data profile',
  modelBadge: 'Model',
  holidayNote: (name) => `Public holiday: ${name} – counted like a Sunday`,
  deviationNow: (value) => `now ${value}% · `,
  measuredAgo: (age) => `Measured ${age} ago`,
  baseline: 'Statistical baseline model',
  share: 'Audience share',
  percent: (n) => `${n}%`,
  toggle: (city, selected) => `${selected ? 'Deselect' : 'Select'} ${city}`,
  inAudience: 'In audience',
  notInAudience: 'Not in audience',
  phaseRange: (name, from, to) => `${name} · ${from}:00–${to}:00`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

function measuredAge(iso: string, locale: Locale) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  const [min, hours] = locale === 'de' ? ['Min', 'Std'] : ['min', 'h']
  return minutes < 60 ? `${minutes} ${min}` : `${Math.round(minutes / 60)} ${hours}`
}

export function RegionCards({
  date,
  selected,
  snapshot,
  live,
  liveStatus,
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
  liveStatus: 'loading' | 'live' | 'fallback'
  onToggle: (id: RegionId) => void
  grid: ScoreGrid
  onSelectAll: () => void
  onReset: () => void
  isLive: boolean
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
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
  const toggleRegion = (region: RegionId) => {
    const aktiv = !selected.includes(region)
    track('Zielgruppe', {
      region,
      aktiv,
      anzahl: selected.length + (aktiv ? 1 : -1),
    })
    onToggle(region)
  }

  return (
    <section
      className="regions-section"
      data-timestamp={date.toISOString()}
      aria-labelledby="regions-title"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="regions-title">{t.title}</h2>
        </div>
        <div className="selection-actions">
          <span className="micro">{t.active(selected.length, REGIONS.length)}</span>
          <button
            className="text-button"
            onClick={() => {
              track('Zielgruppe', { region: 'alle', aktiv: true, anzahl: REGIONS.length })
              onSelectAll()
            }}
          >
            {t.selectAll}
          </button>
          <button
            className="text-button"
            onClick={() => {
              track('Zielgruppe', { region: 'alle', aktiv: false, anzahl: 0 })
              onReset()
            }}
          >
            {t.reset}
          </button>
        </div>
      </div>
      <div className="filter-row" aria-label={t.filter}>
        <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>
          {t.all(REGIONS.length)}
        </button>
        <button onClick={() => setFilter('measured')} aria-pressed={filter === 'measured'}>
          {t.measured(measuredCount)}
        </button>
        <button onClick={() => setFilter('model')} aria-pressed={filter === 'model'}>
          {t.model(REGIONS.length - measuredCount)}
        </button>
      </div>
      <div className="region-grid">
        {visible.map((region) => {
          const index = REGIONS.findIndex((item) => item.id === region.id)
          const score = grid.activityAt(region.id, date)
          const phase = phaseAt(localDecimalHourFast(date, region.timeZone))
          const holiday = holidayAt(snapshot.holidays, region, date)
          const measured = Boolean(snapshot.profiles[region.id])
          const values = Array.from({ length: 48 }, (_, i) =>
            grid.activityAt(region.id, new Date(date.getTime() + (i - 12) * 30 * 60_000)),
          )
          const measure = live[region.id]
          const measuredAt = measure?.lastMeasuredAt ?? snapshot.profiles[region.id]?.lastMeasuredAt
          const isExpanded = expanded === region.id
          const name = regionName(region.id, locale)
          const city = cityName(region.id, region.city, locale)
          const phaseLabel = phaseName(phase.id, phase.name, locale)
          const isSelected = selected.includes(region.id)
          return (
            <article
              key={region.id}
              className={`${isSelected ? 'region-card' : 'region-card unselected'}${isExpanded ? ' expanded' : ''}`}
            >
              <button
                className="card-main"
                onClick={() => {
                  if (!isExpanded) track('Region Details', { region: region.id })
                  setExpanded(isExpanded ? null : region.id)
                }}
                aria-expanded={isExpanded}
              >
                <div className="compact-card">
                  <span className="flag">
                    <Flag code={region.flag} label={name} size={28} />
                  </span>
                  <span className="compact-place">
                    <b>{city}</b>
                    <small>
                      <PhaseIcon icon={phase.icon} /> {phaseLabel}
                      {holiday && <span className="holiday-mark"> · {t.holiday}</span>}
                    </small>
                    {liveStatus === 'fallback' && region.project && (
                      <small className="compact-profile">{t.snapshotProfile}</small>
                    )}
                  </span>
                  <span className="compact-time">
                    <RegionClock date={date} timeZone={region.timeZone} live={isLive} />
                  </span>
                  <Sparkline values={values} color={SERIES[index]} height={28} />
                  <strong className="compact-score">
                    <AnimatedNumber value={score} />
                  </strong>
                </div>
                <div className="card-detail">
                  <div className="card-top">
                    <p className="eyebrow">{name}</p>
                    <span className={measure ? 'badge measured' : 'badge'}>
                      {measure
                        ? t.live
                        : liveStatus === 'fallback' && region.project
                          ? t.snapshotProfile
                          : measured
                            ? t.dataProfile
                            : t.modelBadge}
                    </span>
                  </div>
                  <div className="region-time">
                    <RegionClock date={date} timeZone={region.timeZone} live={isLive} />
                  </div>
                  <p className="phase">
                    <PhaseIcon icon={phase.icon} /> {phaseLabel}
                  </p>
                  {holiday && <p className="holiday-note">{t.holidayNote(holiday.name)}</p>}
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
                          ? t.deviationNow(
                              `${measure.deviation >= 0 ? '+' : ''}${Math.round(measure.deviation)}`,
                            )
                          : ''}
                        {t.measuredAgo(measuredAge(measuredAt, locale))}
                      </>
                    ) : (
                      <span className="deviation-placeholder">{t.baseline}</span>
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
                    <span>{t.share}</span>
                    <b>
                      {isSelected ? t.percent(Math.round((weights[region.id] ?? 0) * 100)) : '—'}
                    </b>
                  </p>
                </div>
              </button>
              <button
                className="compact-toggle"
                onClick={() => toggleRegion(region.id)}
                aria-pressed={isSelected}
                aria-label={t.toggle(city, isSelected)}
              >
                <i />
              </button>
              <button
                className="include-button"
                onClick={() => toggleRegion(region.id)}
                aria-pressed={isSelected}
                aria-label={t.toggle(city, isSelected)}
              >
                <span>{isSelected ? t.inAudience : t.notInAudience}</span>
                <i />
              </button>
            </article>
          )
        })}
      </div>
      <div className="phase-legend">
        {PHASES.map((phase) => (
          <span key={phase.id}>
            <PhaseIcon icon={phase.icon} />
            {t.phaseRange(
              phaseName(phase.id, phase.name, locale),
              String(phase.from).padStart(2, '0'),
              String(phase.to).padStart(2, '0'),
            )}
          </span>
        ))}
      </div>
    </section>
  )
}
