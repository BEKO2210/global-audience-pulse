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

  const sorted = [...signale].sort(
    (a, b) => Math.abs(b.abweichungProzent) - Math.abs(a.abweichungProzent),
  )
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.abweichungProzent)), 1)

  return (
    <section className="lr-block" aria-labelledby="lr-live-title">
      <h3 id="lr-live-title" className="lr-block-title">
        Live-Signal
      </h3>
      <p className="lr-live-hint">
        letzte volle Stunde vs. Median derselben Ortszeit der Vorwoche (Wikipedia-Aufrufe)
      </p>

      <div className="lr-live-header" aria-hidden="true">
        <span className="lr-live-header-meta" />
        <div className="lr-live-header-track">
          <span className="lr-live-head-quiet">ruhiger</span>
          <span className="lr-live-head-mid">üblich</span>
          <span className="lr-live-head-active">aktiver</span>
        </div>
        <span className="lr-live-header-val" />
      </div>

      <ul className="lr-live-list">
        {sorted.map((s) => {
          const pct = s.abweichungProzent
          const half = 50
          const barPct = (Math.abs(pct) / maxAbs) * half
          const flag = flagForOrt(s.ort, regionen)
          const isNotable = Math.abs(pct) > 15
          const dirClass =
            pct > 0 ? 'lr-live-val-active' : pct < 0 ? 'lr-live-val-quiet' : 'lr-live-val-flat'

          return (
            <li key={s.ort} className="lr-live-row">
              <div className="lr-live-meta">
                {flag ? <Flag code={flag} label={s.ort} size={16} /> : null}
                <span>{s.ort}</span>
              </div>
              <div
                className="lr-live-track"
                role="img"
                aria-label={`${s.ort}: ${pct > 0 ? '+' : ''}${pct} Prozent gegenüber üblich${isNotable ? ', auffällig' : ''}`}
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
              <div className="lr-live-val-col">
                <span className={`lr-mono lr-live-val ${dirClass}`}>
                  {pct > 0 ? '+' : ''}
                  {pct} %
                </span>
                {isNotable && <span className="lr-live-badge">auffällig</span>}
              </div>
            </li>
          )
        })}
      </ul>
      <table className="sr-only">
        <caption>Live-Signal Abweichung nach Ort</caption>
        <thead>
          <tr>
            <th>Ort</th>
            <th>Abweichung</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.ort}>
              <td>{s.ort}</td>
              <td>{s.abweichungProzent}%</td>
              <td>{Math.abs(s.abweichungProzent) > 15 ? 'auffällig' : 'üblich'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
