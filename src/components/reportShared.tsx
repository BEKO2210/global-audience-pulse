import { useEffect, useState } from 'react'
import { DATA_SOURCES } from '../config/model'
import { formatTime } from '../lib/time'
import type { LiveAnalysisPayload } from './report/types'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Locale, Messages } from '../i18n/locale'
import type { AnalysisReportBody } from './report/types'
import { anomalyOf, type Anomaly } from '../lib/anomaly'
import { cityName } from '../i18n/labels'
import type { RegionId } from '../config/regions'

const DE = {
  aiAnalysis: 'Automatische AI-Analyse',
  report: 'Lagebericht',
  signal: (city: string, percent: number) =>
    `${city} ${Math.abs(percent)} % ${percent > 0 ? 'aktiver' : 'ruhiger'} als üblich`,
  holiday: (city: string, name: string) => `Feiertag in ${city}: ${name}`,
}
const EN: typeof DE = {
  aiAnalysis: 'Automated AI analysis',
  report: 'Briefing',
  signal: (city, percent) =>
    `${city} ${Math.abs(percent)}% ${percent > 0 ? 'busier' : 'quieter'} than usual`,
  holiday: (city, name) => `Public holiday in ${city}: ${name}`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

/**
 * The report in the reader's language: the English edition when the payload has one (T-015), else the German
 * original. `source` is the origin of the text shown (the English edition can be a template while the German one
 * is AI-written).
 */
export function localizedReport(
  data: LiveAnalysisPayload,
  locale: Locale,
): { report: AnalysisReportBody; lang: Locale; source: 'llm' | 'template' } {
  if (locale === 'en' && data.reportEn)
    return { report: data.reportEn, lang: 'en', source: data.sourceEn ?? data.source }
  return { report: data.report, lang: 'de', source: data.source }
}

/** Shown to English readers only while a payload has no English edition yet (older reports). */
export function GermanReportNote({ lang }: { lang: Locale }) {
  const { locale } = useLocale()
  if (locale === 'de' || lang === 'en') return null
  return (
    <p className="live-report-note report-language-note" lang="en">
      The AI briefing is written in German for now.
    </p>
  )
}

/**
 * EU AI Act Art. 50(2) machine-readable marking of AI-generated text (IPTC digital source type, the
 * vocabulary C2PA uses); Art. 50(4)/(5) visible disclosure is the "Automatische AI-Analyse" label.
 */
export const AI_MARK = {
  'data-ai-generated': 'true',
  'data-digital-source-type':
    'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
} as const

/** Reports older than this are shown as paused (the operator's PC is off); older than a day: hidden. */
export const STALE_HOURS = 3
export const HIDE_HOURS = 24

/**
 * Fetches the hourly report once and every 10 minutes; shared by the hero teaser and the full report.
 * undefined while the first request is open, null when there is no report.
 */
export function useLiveReport() {
  const [data, setData] = useState<LiveAnalysisPayload | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch(`${DATA_SOURCES.liveAnalysis}?t=${Math.floor(Date.now() / 600_000)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((json: LiveAnalysisPayload | null) => {
          if (cancelled) return
          if (json?.report?.schlagzeile) setData(json)
          else setData((current) => current ?? null)
        })
        .catch(() => {
          if (!cancelled) setData((current) => current ?? null)
        })
    load()
    const id = window.setInterval(load, 10 * 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])
  return data
}

/** "Mumbai 41 % aktiver als üblich" / "Public holiday in Tokyo: Sports Day" (T-019). */
function anomalyText(anomaly: Anomaly, data: LiveAnalysisPayload, locale: Locale, t: typeof DE) {
  const id = data.facts?.regionen?.find((r) => r.ort === anomaly.ort)?.id
  const city = id ? cityName(id as RegionId, anomaly.ort, locale) : anomaly.ort
  if (anomaly.kind === 'signal') return t.signal(city, anomaly.percent)
  return t.holiday(city, locale === 'en' ? (anomaly.nameEn ?? anomaly.name) : anomaly.name)
}

/**
 * One line in the hero, reserved while the report loads so it never shifts the layout; without a fresh
 * report (job paused for over a day) the line goes away instead of leaving an empty band.
 */
export function ReportTeaser({
  data,
  now,
}: {
  data: LiveAnalysisPayload | null | undefined
  now: Date
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const generated = data ? new Date(data.generatedAt) : null
  const fresh = generated && (now.getTime() - generated.getTime()) / 3_600_000 <= HIDE_HOURS
  if (data === undefined) return <div className="report-teaser is-empty" aria-hidden="true" />
  if (!fresh || !data || !generated) return null
  const { report, lang, source } = localizedReport(data, locale)
  const ai = source === 'llm'
  const anomaly = anomalyOf(data.facts)
  return (
    <a className="report-teaser" href="#lagebericht" {...(ai ? AI_MARK : {})}>
      <span className="report-teaser-label">
        {ai ? t.aiAnalysis : t.report} · {formatTime(generated, zone)}
      </span>
      <span className="report-teaser-text" lang={lang}>
        {anomaly && (
          <span className="report-teaser-flag" lang={locale}>
            {anomalyText(anomaly, data, locale, t)}
          </span>
        )}
        {report.schlagzeile}
      </span>
    </a>
  )
}
