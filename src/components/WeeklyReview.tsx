import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import type { WeeklyPayload } from '../lib/weekly'
import { AI_MARK } from './reportShared'
import './WeeklyReview.css'

const DE = {
  eyebrow: (week: string) => `KW ${week}`,
  ai: 'Automatische AI-Analyse',
  chart: 'Tageshöchstwerte der letzten sieben Tage',
  chartLabel: (days: string) => `Tageshöchstwerte: ${days}`,
  bestHours: 'Beste Stunden der Woche',
  mean: (n: number) => `Wochenmittel ${n}`,
}
const EN: typeof DE = {
  eyebrow: (week) => `Week ${week}`,
  ai: 'Automated AI analysis',
  chart: 'Daily highs of the last seven days',
  chartLabel: (days) => `Daily highs: ${days}`,
  bestHours: 'Best hours of the week',
  mean: (n) => `Weekly mean ${n}`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

/**
 * T-014: the Sunday review – headline, the week's daily highs as bars, best hours and the written review.
 * The payload is fetched in App (useBelowFoldData), so this only mounts when there is a current review.
 */
export default function WeeklyReview({ data }: { data: WeeklyPayload }) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()

  const english = locale === 'en' && data.reportEn
  const report = english ? data.reportEn! : data.report
  const lang = english ? 'en' : 'de'
  const ai = (english ? (data.sourceEn ?? data.source) : data.source) === 'llm'
  const days = data.facts.tage.slice(-7)
  const max = Math.max(1, ...days.map((d) => d.hoch))
  const top = Math.max(...days.map((d) => d.hoch))
  const dayName = (datum: string) =>
    new Date(`${datum}T12:00:00Z`).toLocaleDateString(intl, { weekday: 'short', timeZone: 'UTC' })

  return (
    <section
      className="panel weekly-review"
      aria-labelledby="weekly-title"
      {...(ai ? AI_MARK : {})}
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">
            {t.eyebrow(data.woche.slice(-2))}
            {ai && <span className="ai-badge">{t.ai}</span>}
          </p>
          <h2 id="weekly-title" lang={lang}>
            {report.schlagzeile}
          </h2>
        </div>
        <span className="micro">{t.mean(data.facts.wochenmittel)}</span>
      </div>
      <p className="wr-verdict" lang={lang}>
        {report.empfehlung}
      </p>

      <div className="wr-grid">
        <figure className="wr-chart">
          <figcaption>{t.chart}</figcaption>
          <div
            className="wr-bars"
            role="img"
            aria-label={t.chartLabel(days.map((d) => `${dayName(d.datum)} ${d.hoch}`).join(', '))}
          >
            {days.map((d) => (
              <div key={d.datum} className="wr-bar-col">
                <span className="wr-bar-value">{d.hoch}</span>
                <motion.span
                  className={`wr-bar${d.hoch === top ? ' is-top' : ''}`}
                  style={{ '--h': `${(d.hoch / max) * 100}%` } as CSSProperties}
                />
                <span className="wr-bar-day">{dayName(d.datum)}</span>
              </div>
            ))}
          </div>
        </figure>
        <div className="wr-text">
          <p lang={lang}>{report.analyse}</p>
          <ul lang={lang}>
            {report.punkte.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {data.facts.besteStunden.length > 0 && (
            <div className="wr-hours">
              <span>{t.bestHours}</span>
              <ol>
                {data.facts.besteStunden.map((h) => (
                  <li key={h.stunde}>
                    <b>{h.stunde}</b> <small>Ø {h.mittel}</small>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
