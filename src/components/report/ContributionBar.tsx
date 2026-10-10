import { useState } from 'react'
import { Flag } from '../Flag'
import type { AnalysisFacts } from './types'
import { seriesColorForRegion } from './regionSeries'

export function ContributionBar({ facts }: { facts: AnalysisFacts }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const gesamt = facts.gesamt?.score
  const regionen = facts.regionen?.filter((r) => r.beitragPunkte > 0) ?? []
  if (gesamt == null || regionen.length === 0) return null

  const sorted = [...regionen].sort((a, b) => b.beitragPunkte - a.beitragPunkte)
  const topRegion = sorted[0]
  const maxBeitrag = topRegion?.beitragPunkte || 1

  const handleToggle = (id: string) => {
    setActiveId((curr) => (curr === id ? null : id))
  }

  return (
    <section className="lr-block" aria-labelledby="lr-contribution-title">
      <h3 id="lr-contribution-title" className="lr-block-title">
        Wer trägt den Wert
      </h3>
      {topRegion && (
        <p className="lr-block-total" role="heading" aria-level={4}>
          <strong>{topRegion.ort}</strong> trägt{' '}
          <span className="lr-mono">{topRegion.beitragPunkte}</span> von{' '}
          <span className="lr-mono">{gesamt}</span> Punkten
        </p>
      )}
      <div
        className={`lr-contrib-bar${activeId != null ? ' has-active' : ''}`}
        role="group"
        aria-label={`Beitrag der Regionen zum Gesamtwert ${gesamt} Punkte`}
      >
        {sorted.map((r) => {
          const widthPct = (r.beitragPunkte / gesamt) * 100
          const color = seriesColorForRegion(r.id)
          const isActive = activeId === r.id
          const isDimmed = activeId != null && !isActive

          return (
            <span
              key={r.id}
              role="button"
              tabIndex={0}
              className={`lr-contrib-segment${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: color,
              }}
              title={`${r.ort}: ${r.beitragPunkte} Punkte`}
              aria-label={`${r.ort}: ${r.beitragPunkte} von ${gesamt} Punkten`}
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
        {sorted.map((r) => {
          const color = seriesColorForRegion(r.id)
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
              aria-label={`${r.ort}: ${r.beitragPunkte} Punkte`}
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
        <caption>Regionaler Beitrag zum Gesamtwert</caption>
        <thead>
          <tr>
            <th>Ort</th>
            <th>Punkte</th>
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
