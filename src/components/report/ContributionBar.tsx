import { useState } from 'react'
import { Flag } from '../Flag'
import type { AnalysisFacts } from './types'
import { useLocale, useMessages } from '../../i18n/LocaleProvider'
import type { Messages } from '../../i18n/locale'
import { cityName } from '../../i18n/labels'
import type { RegionId } from '../../config/regions'

const DE = {
  title: 'Wer trägt den Wert',
  carries: 'trägt',
  of: 'von',
  points: 'Punkten',
  groupLabel: (total: number) => `Beitrag je Markt zum Gesamtwert ${total} Punkte`,
  pointsOf: (city: string, points: number) => `${city}: ${points} Punkte`,
  caption: 'Beitrag je Markt zum Gesamtwert',
  place: 'Ort',
  pointsHead: 'Punkte',
}
const EN: typeof DE = {
  title: 'Who drives the score',
  carries: 'contributes',
  of: 'of',
  points: 'points',
  groupLabel: (total) => `Contribution per market to the overall score of ${total} points`,
  pointsOf: (city, points) => `${city}: ${points} points`,
  caption: 'Contribution per market to the overall score',
  place: 'Place',
  pointsHead: 'Points',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

function rankColor(rank: number, total: number): string {
  if (rank === 0) return 'var(--ink-strong)'
  if (total <= 2) return 'color-mix(in srgb, var(--ink) 70%, var(--paper))'
  const pct = Math.round(80 - ((rank - 1) / (total - 2)) * 55)
  return `color-mix(in srgb, var(--ink) ${pct}%, var(--paper))`
}

export function ContributionBar({ facts }: { facts: AnalysisFacts }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const t = useMessages(M)
  const { locale } = useLocale()
  const gesamt = facts.gesamt?.score
  const regionen = facts.regionen?.filter((r) => r.beitragPunkte > 0) ?? []
  if (gesamt == null || regionen.length === 0) return null

  const sorted = [...regionen]
    .sort((a, b) => b.beitragPunkte - a.beitragPunkte)
    .map((r) => ({ ...r, ort: cityName(r.id as RegionId, r.ort, locale) }))
  const topRegion = sorted[0]
  const maxBeitrag = topRegion?.beitragPunkte || 1

  const handleToggle = (id: string) => {
    setActiveId((curr) => (curr === id ? null : id))
  }

  return (
    <section className="lr-block" aria-labelledby="lr-contribution-title">
      <h3 id="lr-contribution-title" className="lr-block-title">
        {t.title}
      </h3>
      {topRegion && (
        <p className="lr-block-total" role="heading" aria-level={4}>
          <strong>{topRegion.ort}</strong> {t.carries}{' '}
          <span className="lr-mono">{topRegion.beitragPunkte}</span> {t.of}{' '}
          <span className="lr-mono">{gesamt}</span> {t.points}
        </p>
      )}
      <div
        className={`lr-contrib-bar${activeId != null ? ' has-active' : ''}`}
        role="group"
        aria-label={t.groupLabel(gesamt)}
      >
        {sorted.map((r, index) => {
          const widthPct = (r.beitragPunkte / gesamt) * 100
          const color = rankColor(index, sorted.length)
          const isActive = activeId === r.id
          const isDimmed = activeId != null && !isActive

          return (
            <span
              key={r.id}
              // Segments are a visual summary only (too small for touch targets); the rows below
              // are the interactive, labelled controls. Mouse hover still pairs segment and row.
              aria-hidden="true"
              className={`lr-contrib-segment${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: color,
              }}
              title={t.pointsOf(r.ort, r.beitragPunkte)}
              onMouseEnter={() => setActiveId(r.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              {widthPct >= 8 && (
                <span className="lr-contrib-segment-flag" aria-hidden="true">
                  <Flag code={r.flagge} label={r.ort} size={16} />
                </span>
              )}
            </span>
          )
        })}
      </div>
      <ul className={`lr-contrib-legend${activeId != null ? ' has-active' : ''}`}>
        {sorted.map((r, index) => {
          const color = rankColor(index, sorted.length)
          const rowBarPct = (r.beitragPunkte / maxBeitrag) * 100
          const isActive = activeId === r.id
          const isDimmed = activeId != null && !isActive

          return (
            <li
              key={r.id}
              tabIndex={0}
              className={`lr-contrib-row${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}`}
              onMouseEnter={() => setActiveId(r.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(r.id)}
              onBlur={() => setActiveId(null)}
              onClick={() => handleToggle(r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleToggle(r.id)
                }
              }}
              aria-label={t.pointsOf(r.ort, r.beitragPunkte)}
            >
              <div className="lr-contrib-meta">
                <Flag code={r.flagge} label={r.ort} size={16} />
                <span className="lr-contrib-city">{r.ort}</span>
              </div>
              <div className="lr-contrib-row-track" aria-hidden="true">
                <span
                  className="lr-contrib-row-bar"
                  style={{
                    width: `${rowBarPct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="lr-mono lr-contrib-pts">{r.beitragPunkte}</span>
            </li>
          )
        })}
      </ul>
      <table className="sr-only">
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            <th>{t.place}</th>
            <th>{t.pointsHead}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td>{r.ort}</td>
              <td>{r.beitragPunkte}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
