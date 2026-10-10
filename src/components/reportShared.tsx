import { useEffect, useState } from 'react'
import { DATA_SOURCES } from '../config/model'
import { formatTime } from '../lib/time'
import type { LiveAnalysisPayload } from './report/types'

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

/** Fetches the hourly report once and every 10 minutes; shared by the hero teaser and the full report. */
export function useLiveReport() {
  const [data, setData] = useState<LiveAnalysisPayload | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch(`${DATA_SOURCES.liveAnalysis}?t=${Math.floor(Date.now() / 600_000)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((json: LiveAnalysisPayload | null) => {
          if (!cancelled && json?.report?.schlagzeile) setData(json)
        })
        .catch(() => undefined)
    load()
    const id = window.setInterval(load, 10 * 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])
  return data
}

/** One reserved line in the hero: never shifts the layout while the report loads. */
export function ReportTeaser({ data, now }: { data: LiveAnalysisPayload | null; now: Date }) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const generated = data ? new Date(data.generatedAt) : null
  const fresh = generated && (now.getTime() - generated.getTime()) / 3_600_000 <= HIDE_HOURS
  if (!fresh || !data || !generated)
    return <div className="report-teaser is-empty" aria-hidden="true" />
  const ai = data.source === 'llm'
  return (
    <a className="report-teaser" href="#lagebericht" {...(ai ? AI_MARK : {})}>
      <span className="report-teaser-label">
        {ai ? 'Automatische AI-Analyse' : 'Lagebericht'} · {formatTime(generated, zone)}
      </span>
      <span className="report-teaser-text">{data.report.schlagzeile}</span>
    </a>
  )
}
