import { STATUS_LEVELS } from '../../config/model'
import { statusFor } from '../../lib/model'
import type { AnalysisFacts, AnalysisReportBody } from './types'

function toneForStatusLabel(label: string): string {
  const level = STATUS_LEVELS.find((s) => s.label === label)
  return level?.tone ?? statusFor(0).tone
}

export function AudienceGrid({
  facts,
  report,
}: {
  facts: AnalysisFacts
  report: AnalysisReportBody
}) {
  const groups = facts.zielgruppen
  if (!groups?.length) return null

  const urteile = new Map(report.zielgruppen?.map((z) => [z.name, z.urteil]) ?? [])

  return (
    <section className="lr-block" aria-labelledby="lr-audience-title">
      <h3 id="lr-audience-title" className="lr-block-title">
        Zielgruppen
      </h3>
      <ul className="lr-audience-grid">
        {groups.map((g) => {
          const tone = toneForStatusLabel(g.status)
          const urteil = urteile.get(g.name)
          return (
            <li key={g.name} className="lr-audience-tile">
              <div className="lr-audience-head">
                <span className="lr-audience-name">{g.name}</span>
                <span className={`lr-status-dot lr-tone-${tone}`} aria-hidden="true" />
              </div>
              <p className="lr-audience-score">
                <span className="lr-mono">{g.scoreJetzt}</span>
                <span className="lr-audience-status">{g.status}</span>
              </p>
              {g.besteZeit != null && g.besteZeitScore != null ? (
                <p className="lr-audience-window">
                  Bestes Fenster {g.besteZeit} <span className="lr-mono">({g.besteZeitScore})</span>
                </p>
              ) : null}
              {urteil ? <p className="lr-audience-urteil">{urteil}</p> : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
