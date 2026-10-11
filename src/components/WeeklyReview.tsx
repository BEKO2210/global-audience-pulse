import { useEffect, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DATA_SOURCES } from '../config/model'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import type { AnalysisReportBody } from './report/types'
import { AI_MARK } from './reportShared'
import './WeeklyReview.css'

/** weekly.json from the data branch (scripts/analysis/weekly.ts), written on Sunday evenings. */
interface WeeklyPayload {
  woche: string
  generatedAt: string
  source: 'llm' | 'template'
  sourceEn?: 'llm' | 'template'
  facts: {
    tage: { datum: string; hoch: number; hochUm: string; mittel: number }[]
    besteStunden: { stunde: string; mittel: number }[]
    wochenmittel: number
  }
  report: AnalysisReportBody
  reportEn?: AnalysisReportBody
}

/** Shown for eight days, so a review never outlives the following Sunday by more than a day. */
const SHOW_DAYS = 8

const DE = {
  eyebrow: (week: string) => `KW ${week}`,
  ai: 'Automatische AI-Analyse',
  chart: 'Tageshöchstwert der letzten sieben Tage',
  chartLabel: (days: string) => `Tageshöchstwerte: ${days}`,
  bestHours: 'Beste Stunden der Woche',
  mean: (n: number) => `Wochenmittel ${n}`,
}
const EN: typeof DE = {
  eyebrow: (week) => `Week ${week}`,
  ai: 'Automated AI analysis',
  chart: 'Daily high of the last seven days',
  chartLabel: (days) => `Daily highs: ${days}`,
  bestHours: 'Best hours of the week',
  mean: (n) => `Weekly mean ${n}`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

function isWeekly(value: unknown): value is WeeklyPayload {
  const v = value as Partial<WeeklyPayload> | null
  return Boolean(v?.woche && v.report?.schlagzeile && Array.isArray(v.facts?.tage))
}

/** T-014: the Sunday review – headline, the week's daily highs as bars, best hours and the written review. */
export default function WeeklyReview() {
  const [data, setData] = useState<WeeklyPayload | null>(null)
  const [now] = useState(() => Date.now())
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const reduce = useReducedMotion()

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${DATA_SOURCES.weeklyReview}?t=${Math.floor(Date.now() / 3_600_000)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((value: unknown) => {
        if (isWeekly(value)) setData(value)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  if (!data || now - Date.parse(data.generatedAt) > SHOW_DAYS * 86_400_000) return null
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
            {days.map((d, i) => (
              <div key={d.datum} className="wr-bar-col">
                <span className="wr-bar-value">{d.hoch}</span>
                <motion.span
                  className={`wr-bar${d.hoch === top ? ' is-top' : ''}`}
                  style={{ '--h': `${(d.hoch / max) * 100}%` } as CSSProperties}
                  initial={reduce ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.48, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.04 }}
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
