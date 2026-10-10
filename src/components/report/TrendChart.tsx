import { STATUS_LEVELS } from '../../config/model'
import type { AnalysisFacts } from './types'

const W = 360
const H = 140
const PAD = { t: 26, r: 34, b: 24, l: 24 }

export function TrendChart({ facts }: { facts: AnalysisFacts }) {
  const now = facts.gesamt?.score
  const trend = facts.trendNaechsteStunden
  if (now == null || !trend?.length) return null

  const points = [
    { label: 'jetzt', h: 0, score: now },
    ...trend.map((t) => ({
      label: `+${t.inStunden} h`,
      h: t.inStunden,
      score: t.score,
    })),
  ]

  const scores = points.map((p) => p.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)

  const candidateThresholds = [...STATUS_LEVELS]
    .filter((l) => l.min > 0)
    .sort((a, b) => a.min - b.min)
  const lowerThreshold = candidateThresholds.filter((l) => l.min <= minScore).at(-1)
  const upperThreshold =
    candidateThresholds.find((l) => l.min >= maxScore) ?? candidateThresholds.at(-1)!

  const yMin = Math.max(
    0,
    Math.min(minScore - 5, lowerThreshold ? lowerThreshold.min - 4 : minScore - 6),
  )
  const yMax = Math.max(maxScore + 6, upperThreshold ? upperThreshold.min + 4 : maxScore + 6)
  const span = yMax - yMin || 1

  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const xAt = (i: number) => PAD.l + (i / (points.length - 1)) * innerW
  const yAt = (score: number) => PAD.t + innerH - ((score - yMin) / span) * innerH

  const visibleLevels = candidateThresholds.filter((l) => l.min >= yMin + 2 && l.min <= yMax - 2)

  const line = points.map((p, i) => `${xAt(i)},${yAt(p.score)}`).join(' ')
  const area = `${PAD.l},${PAD.t + innerH} ${line} ${xAt(points.length - 1)},${PAD.t + innerH}`

  const last = trend.at(-1)!
  const delta = last.score - now
  const deltaLabel =
    delta === 0 ? '±0 in 3 h' : `${delta > 0 ? '+' : ''}${delta} in ${last.inStunden} h`
  const deltaDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  return (
    <section className="lr-block" aria-labelledby="lr-trend-title">
      <div className="lr-block-head">
        <h3 id="lr-trend-title" className="lr-block-title">
          Trend
        </h3>
        <span className={`lr-delta lr-delta-${deltaDir}`} aria-label={`Veränderung ${deltaLabel}`}>
          {deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '→'} {deltaLabel}
        </span>
      </div>
      <figure className="lr-trend-figure">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="lr-trend-svg"
          role="img"
          aria-label={`Score von ${now} jetzt auf ${last.score} in ${last.inStunden} Stunden`}
        >
          <polygon className="lr-trend-area" points={area} />
          {visibleLevels.map((lvl) => {
            const y = yAt(lvl.min)
            return (
              <g key={lvl.min} className="lr-trend-threshold">
                <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="lr-trend-threshold-line" />
                <text x={W - PAD.r + 6} y={y + 3.5} className="lr-trend-threshold-value">
                  {lvl.min}
                </text>
              </g>
            )
          })}
          <polyline className="lr-trend-line" points={line} fill="none" />
          {points.map((p, i) => {
            const cx = xAt(i)
            const cy = yAt(p.score)
            return (
              <g key={p.label} className="lr-trend-point">
                <circle className="lr-trend-dot" cx={cx} cy={cy} r={3.5} />
                <text className="lr-trend-score" x={cx} y={cy - 8} textAnchor="middle">
                  {p.score}
                </text>
                <text className="lr-trend-label" x={cx} y={H - 6} textAnchor="middle">
                  {p.label}
                </text>
              </g>
            )
          })}
        </svg>
        {visibleLevels.length > 0 && (
          <figcaption className="lr-trend-legend">
            {visibleLevels
              .slice()
              .reverse()
              .map((lvl) => (
                <span key={lvl.min} className="lr-trend-legend-item">
                  <span className="lr-trend-legend-swatch" aria-hidden="true" />
                  {lvl.label} ab {lvl.min}
                </span>
              ))}
          </figcaption>
        )}
      </figure>
      <table className="sr-only">
        <caption>Score-Trend nächste Stunden</caption>
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <td>{p.label}</td>
              <td>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
