import { Fragment, useEffect, useId, useState, type ReactNode } from 'react'
import './RegionCards.css'
import { PHASES } from '../config/model'
import { REGIONS, type RegionId } from '../config/regions'
import type { LiveMeasure } from '../hooks/useLiveData'
import { normalizedWeights, phaseAt, type ScoreGrid } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { holidayAt, holidayLabel } from '../lib/holidays'
import { formatTime, localDecimalHourFast } from '../lib/time'
import { Sparkline } from './Sparkline'
import { RegionDayChart } from './RegionDayChart'
import { useGridColumns } from '../hooks/useGridColumns'
import { Flag } from './Flag'
import { PhaseIcon } from './PhaseIcon'
import { AnimatedNumber } from './AnimatedNumber'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Locale, Messages } from '../i18n/locale'
import { cityName, phaseName, regionName } from '../i18n/labels'

const DE = {
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
  switchLabel: (city: string) => `${city} in der Zielgruppe`,
  source: 'Datenquelle',
  liveSignal: 'Live-Signal',
  shareShort: (n: number) => `${n} % Anteil`,
  phaseRange: (name: string, from: string, to: string) => `${name} · ${from}–${to} Uhr`,
}
const EN: typeof DE = {
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
  switchLabel: (city) => `${city} in the audience`,
  source: 'Data source',
  liveSignal: 'Live signal',
  shareShort: (n) => `${n}% share`,
  phaseRange: (name, from, to) => `${name} · ${from}:00–${to}:00`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

function RegionTime({
  timeZone,
  live,
  date,
  withSeconds = false,
}: {
  timeZone: string
  live: boolean
  date: Date
  withSeconds?: boolean
}) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!live) return
    const interval = withSeconds ? 1_000 : 60_000
    const id = window.setInterval(() => setNow(new Date()), interval)
    return () => clearInterval(id)
  }, [live, withSeconds])
  return <>{formatTime(live ? now : date, timeZone, withSeconds)}</>
}

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
  const columns = useGridColumns()
  const detailId = useId()
  const weights = normalizedWeights(selected, snapshot)
  const measuredCount = REGIONS.filter((region) => Boolean(snapshot.profiles[region.id])).length
  const visible = REGIONS.filter(
    (region) =>
      filter === 'all' ||
      (filter === 'measured'
        ? Boolean(snapshot.profiles[region.id])
        : !snapshot.profiles[region.id]),
  )
  const strongestRegionId = visible.reduce<RegionId | null>((bestId, region) => {
    const regionScore = grid.activityAt(region.id, date)
    if (bestId === null) return region.id
    const bestScore = grid.activityAt(bestId, date)
    return regionScore > bestScore ? region.id : bestId
  }, null)
  // Bento grid: every tile keeps its size and place; the detail opens as a full row right after the row of the
  // chosen tile (Belkis: "eine Karte groß, eine klein, unten fehlt eine Karte").
  const expandedIndex = visible.findIndex((region) => region.id === expanded)
  const detailAfter =
    expandedIndex < 0
      ? -1
      : Math.min(visible.length - 1, Math.floor(expandedIndex / columns) * columns + columns - 1)
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
        <h2 id="regions-title">{t.title}</h2>
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
        {visible
          .map((region): { id: RegionId; tile: ReactNode; detail: ReactNode } => {
            const score = grid.activityAt(region.id, date)
            const phase = phaseAt(localDecimalHourFast(date, region.timeZone))
            const holiday = holidayAt(snapshot.holidays, region, date)
            const measured = Boolean(snapshot.profiles[region.id])
            const values = Array.from({ length: 48 }, (_, i) =>
              grid.activityAt(region.id, new Date(date.getTime() + (i - 12) * 30 * 60_000)),
            )
            const measure = live[region.id]
            const measuredAt =
              measure?.lastMeasuredAt ?? snapshot.profiles[region.id]?.lastMeasuredAt
            const isExpanded = expanded === region.id
            const name = regionName(region.id, locale)
            const city = cityName(region.id, region.city, locale)
            const phaseLabel = phaseName(phase.id, phase.name, locale)
            const isSelected = selected.includes(region.id)
            const shareText = isSelected
              ? t.percent(Math.round((weights[region.id] ?? 0) * 100))
              : '—'
            const detail = isExpanded && (
              <div className="card-detail" id={detailId}>
                <RegionDayChart region={region} city={city} date={date} snapshot={snapshot} />
                <dl className="card-facts">
                  <div>
                    <dt>{t.source}</dt>
                    <dd>
                      <span className={measure ? 'badge measured' : 'badge'}>
                        {measure
                          ? t.live
                          : liveStatus === 'fallback' && region.project
                            ? t.snapshotProfile
                            : measured
                              ? t.dataProfile
                              : t.modelBadge}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t.liveSignal}</dt>
                    <dd className="deviation">
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
                    </dd>
                  </div>
                  <div>
                    <dt>{t.share}</dt>
                    <dd className="card-share">
                      <span className="weight" aria-hidden="true">
                        <span style={{ width: `${(weights[region.id] ?? 0) * 100}%` }} />
                      </span>
                      <b>{shareText}</b>
                    </dd>
                  </div>
                  {holiday && (
                    <div>
                      <dt>{t.holiday}</dt>
                      <dd className="holiday-note">
                        {t.holidayNote(holidayLabel(holiday, locale))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )
            const highlightSpark =
              isSelected || (selected.length === 0 && region.id === strongestRegionId)
            const tile = (
              <article
                className={`${isSelected ? 'region-card' : 'region-card unselected'}${isExpanded ? ' expanded' : ''}`}
              >
                <button
                  className="card-main"
                  onClick={() => {
                    if (!isExpanded) track('Region Details', { region: region.id })
                    setExpanded(isExpanded ? null : region.id)
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? detailId : undefined}
                >
                  <div className="compact-card">
                    <span className="flag">
                      <Flag code={region.flag} label={name} size={28} />
                    </span>
                    <span className="compact-place">
                      <b>{city}</b>
                      <small className="compact-region">{name}</small>
                      {liveStatus === 'fallback' && region.project && (
                        <small className="compact-profile">{t.snapshotProfile}</small>
                      )}
                    </span>
                    <span className="compact-phase">
                      <PhaseIcon icon={phase.icon} /> {phaseLabel} ·{' '}
                      <span className="compact-time">
                        <RegionTime date={date} timeZone={region.timeZone} live={isLive} />
                      </span>
                      {holiday && <span className="holiday-mark"> · {t.holiday}</span>}
                    </span>
                    <Sparkline values={values} height={28} highlightLast={highlightSpark} />
                    <strong className="compact-score">
                      <AnimatedNumber value={score} />
                    </strong>
                    <span className="compact-share">
                      {isSelected ? t.shareShort(Math.round((weights[region.id] ?? 0) * 100)) : '—'}
                    </span>
                  </div>
                </button>
                {/* selection as a real switch (role=switch), not a checkbox square */}
                <button
                  type="button"
                  role="switch"
                  className="region-switch"
                  aria-checked={isSelected}
                  aria-label={t.switchLabel(city)}
                  onClick={() => toggleRegion(region.id)}
                >
                  <span className="region-switch-track" aria-hidden="true">
                    <span className="region-switch-knob" />
                  </span>
                </button>
              </article>
            )
            return { id: region.id, tile, detail }
          })
          .map(({ id, tile }, index, tiles) => (
            <Fragment key={id}>
              {tile}
              {index === detailAfter && tiles[expandedIndex]?.detail}
            </Fragment>
          ))}
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
