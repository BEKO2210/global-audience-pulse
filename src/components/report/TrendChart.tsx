import type { AnalysisFacts } from './types'

const W = 280
const H = 72
const PAD = { t: 8, r: 4, b: 22, l: 4 }

export function TrendChart({ facts }: { facts: AnalysisFacts }) {
  const now = facts.gesamt?.score
  const trend = facts.trendNaechsteStunden
  if (now == null || !trend?.length) return null

  const points = [
    { label: 'jetzt', h: 0, score: now },
    ...trend.map((t) => ({
      label: `+${t.inStunden}`,
      h: t.inStunden,
      score: t.score,
    })),
  ]

  const scores = points.map((p) => p.score)
  const min = Math.min(...scores) - 2
  const max = Math.max(...scores) + 2
  const span = max - min || 1
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const xAt = (i: number) => PAD.l + (i / (points.length - 1)) * innerW
  const yAt = (score: number) => PAD.t + innerH - ((score - min) / span) * innerH

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
          <polyline className="lr-trend-line" points={line} fill="none" />
          {points.map((p, i) => (
            <g key={p.label}>
              <circle className="lr-trend-dot" cx={xAt(i)} cy={yAt(p.score)} r={3} />
              <text className="lr-trend-score" x={xAt(i)} y={H - 4} textAnchor="middle">
                {p.score}
              </text>
              <text className="lr-trend-label" x={xAt(i)} y={H - 14} textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
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
