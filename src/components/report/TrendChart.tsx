import { STATUS_LEVELS } from '../../config/model'
import { useSvgBox } from '../../hooks/useSvgBox'
import type { AnalysisFacts } from './types'
import { useLocale, useMessages } from '../../i18n/LocaleProvider'
import type { Messages } from '../../i18n/locale'
import { statusText } from '../../i18n/labels'

const DE = {
  title: 'Trend',
  now: 'jetzt',
  change: (delta: string) => `Veränderung ${delta}`,
  chartLabel: (now: number, later: number, hours: number) =>
    `Score von ${now} jetzt auf ${later} in ${hours} Stunden`,
  from: (label: string, min: number) => `${label} ab ${min}`,
  caption: 'Score-Trend der nächsten Stunden',
  time: 'Zeit',
  score: 'Score',
}
const EN: typeof DE = {
  title: 'Trend',
  now: 'now',
  change: (delta) => `Change ${delta}`,
  chartLabel: (now, later, hours) =>
    `Score from ${now} now to ${later} in ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
  from: (label, min) => `${label} from ${min}`,
  caption: 'Score trend for the next hours',
  time: 'Time',
  score: 'Score',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const PAD = { t: 30, r: 44, b: 24, l: 24 }
const SCORE_LABEL_GAP = 12
const THRESHOLD_LABEL_CLEARANCE = 16

export function TrendChart({ facts }: { facts: AnalysisFacts }) {
  // 1 SVG unit = 1 CSS px (height from CSS), so labels keep their size on every screen.
  const { ref, width: W, height: H } = useSvgBox<SVGSVGElement>({ width: 360, height: 180 })
  const t = useMessages(M)
  const { locale } = useLocale()
  const now = facts.gesamt?.score
  const trend = facts.trendNaechsteStunden
  if (now == null || !trend?.length) return null

  const points = [
    { label: t.now, h: 0, score: now },
    ...trend.map((step) => ({
      label: `+${step.inStunden} h`,
      h: step.inStunden,
      score: step.score,
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
  const plotRight = PAD.l + innerW

  const scoreLabelY = (cy: number) => {
    let y = cy - SCORE_LABEL_GAP
    for (const lvl of visibleLevels) {
      const ty = yAt(lvl.min) + 3.5
      if (Math.abs(y - ty) < THRESHOLD_LABEL_CLEARANCE) y = cy - SCORE_LABEL_GAP - 8
    }
    return y
  }

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
          {t.title}
        </h3>
        <span className={`lr-delta lr-delta-${deltaDir}`} aria-label={t.change(deltaLabel)}>
          {deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '→'} {deltaLabel}
        </span>
      </div>
      <figure className="lr-trend-figure">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="lr-trend-svg"
          role="img"
          aria-label={t.chartLabel(now, last.score, last.inStunden)}
        >
          <polygon className="lr-trend-area" points={area} />
          {visibleLevels.map((lvl) => {
            const y = yAt(lvl.min)
            return (
              <g key={lvl.min} className="lr-trend-threshold">
                <line x1={PAD.l} x2={plotRight} y1={y} y2={y} className="lr-trend-threshold-line" />
                <text x={plotRight + 6} y={y + 3.5} className="lr-trend-threshold-value">
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
                <text className="lr-trend-score" x={cx} y={scoreLabelY(cy)} textAnchor="middle">
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
                  {t.from(
                    locale === 'de' ? lvl.label : statusText(lvl.tone, locale).label,
                    lvl.min,
                  )}
                </span>
              ))}
          </figcaption>
        )}
      </figure>
      <table className="sr-only">
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            <th>{t.time}</th>
            <th>{t.score}</th>
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
