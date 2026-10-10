import { Flag } from '../Flag'
import type { AnalysisFacts } from './types'
import { seriesColorForRegion } from './regionSeries'

export function ContributionBar({ facts }: { facts: AnalysisFacts }) {
  const gesamt = facts.gesamt?.score
  const regionen = facts.regionen?.filter((r) => r.beitragPunkte > 0) ?? []
  if (gesamt == null || regionen.length === 0) return null

  const sorted = [...regionen].sort((a, b) => b.beitragPunkte - a.beitragPunkte)

  return (
    <section className="lr-block" aria-labelledby="lr-contribution-title">
      <h3 id="lr-contribution-title" className="lr-block-title">
        Wer trägt den Wert
      </h3>
      <p className="lr-block-total">
        <span className="lr-mono">= {gesamt} von 100</span>
      </p>
      <div
        className="lr-contrib-bar"
        role="img"
        aria-label={`Beitrag der Regionen zum Gesamtwert ${gesamt} Punkte`}
      >
        {sorted.map((r) => {
          const widthPct = (r.beitragPunkte / gesamt) * 100
          return (
            <span
              key={r.id}
              className="lr-contrib-segment"
              style={{
                width: `${widthPct}%`,
                background: seriesColorForRegion(r.id),
              }}
              title={`${r.ort}: ${r.beitragPunkte} Punkte`}
            />
          )
        })}
      </div>
      <ul className="lr-contrib-legend">
        {sorted.map((r) => (
          <li key={r.id}>
            <Flag code={r.flagge} label={r.ort} size={16} />
            <span className="lr-contrib-city">{r.ort}</span>
            <span className="lr-mono lr-contrib-pts">{r.beitragPunkte}</span>
          </li>
        ))}
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
