import { Flag } from '../Flag'
import type { FlagCode } from '../../config/flag-codes'
import type { AnalysisFacts } from './types'

function flagForOrt(
  ort: string,
  regionen: NonNullable<AnalysisFacts['regionen']>,
): FlagCode | null {
  const match = regionen.find((r) => r.ort === ort)
  return match?.flagge ?? null
}

export function LiveSignals({ facts }: { facts: AnalysisFacts }) {
  const signale = facts.liveSignale
  const regionen = facts.regionen
  if (!signale?.length || !regionen?.length) return null

  const maxAbs = Math.max(...signale.map((s) => Math.abs(s.abweichungProzent)), 1)

  return (
    <section className="lr-block" aria-labelledby="lr-live-title">
      <h3 id="lr-live-title" className="lr-block-title">
        Live-Signal
      </h3>
      <p className="lr-live-hint">
        letzte volle Stunde vs. Median derselben Ortszeit der Vorwoche (Wikipedia-Aufrufe)
      </p>
      <ul className="lr-live-list">
        {signale.map((s) => {
          const pct = s.abweichungProzent
          const half = 50
          const barPct = (Math.abs(pct) / maxAbs) * half
          const flag = flagForOrt(s.ort, regionen)
          return (
            <li key={s.ort} className="lr-live-row">
              <div className="lr-live-meta">
                {flag ? <Flag code={flag} label={s.ort} size={16} /> : null}
                <span>{s.ort}</span>
              </div>
              <div
                className="lr-live-track"
                role="img"
                aria-label={`${s.ort}: ${pct > 0 ? '+' : ''}${pct} Prozent gegenüber üblich`}
              >
                <span className="lr-live-half lr-live-half-left">
                  {pct < 0 ? (
                    <span
                      className="lr-live-bar lr-live-bar-quiet"
                      style={{ width: `${barPct}%` }}
                    />
                  ) : null}
                </span>
                <span className="lr-live-half lr-live-half-right">
                  {pct > 0 ? (
                    <span
                      className="lr-live-bar lr-live-bar-active"
                      style={{ width: `${barPct}%` }}
                    />
                  ) : null}
                </span>
                <span className="lr-live-axis" aria-hidden="true" />
              </div>
              <span className="lr-mono lr-live-val">
                {pct > 0 ? '+' : ''}
                {pct} %
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
