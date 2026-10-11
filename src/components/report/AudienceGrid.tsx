import { STATUS_LEVELS } from '../../config/model'
import { statusFor } from '../../lib/model'
import type { AnalysisFacts, AnalysisReportBody } from './types'
import { useLocale, useMessages } from '../../i18n/LocaleProvider'
import type { Locale, Messages } from '../../i18n/locale'
import { presetName, statusText } from '../../i18n/labels'

/** Audience names come from the facts in German (scripts/analysis/hourly.ts); presets via labels.ts. */
const AUDIENCE_EN: Record<string, string> = { 'DACH & Europa': 'DACH & Europe', USA: 'US' }

const DE = {
  title: 'Zielgruppen',
  bestWindow: 'Bestes Fenster',
  audience: (name: string) => name,
}
const EN: typeof DE = {
  title: 'Audiences',
  bestWindow: 'Best window',
  audience: (name) => AUDIENCE_EN[name] ?? presetName(name, 'en'),
}
const M: Messages<typeof DE> = { de: DE, en: EN }

function toneForStatusLabel(label: string): string {
  const level = STATUS_LEVELS.find((s) => s.label === label)
  return level?.tone ?? statusFor(0).tone
}

export function AudienceGrid({
  facts,
  report,
  lang = 'de',
}: {
  facts: AnalysisFacts
  report: AnalysisReportBody
  lang?: Locale
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const groups = facts.zielgruppen
  if (!groups?.length) return null

  const urteile = new Map(report.zielgruppen?.map((z) => [z.name, z.urteil]) ?? [])

  return (
    <section className="lr-block" aria-labelledby="lr-audience-title">
      <h3 id="lr-audience-title" className="lr-block-title">
        {t.title}
      </h3>
      <ul className="lr-audience-grid">
        {groups.map((g) => {
          const tone = toneForStatusLabel(g.status)
          const urteil = urteile.get(g.name)
          return (
            <li key={g.name} className="lr-audience-tile">
              <div className="lr-audience-head">
                <span className="lr-audience-name">{t.audience(g.name)}</span>
                <span className={`lr-status-dot lr-tone-${tone}`} aria-hidden="true" />
              </div>
              <p className="lr-audience-score">
                <span className="lr-mono">{g.scoreJetzt}</span>
                <span className="lr-audience-status">
                  {locale === 'de' ? g.status : statusText(tone, locale).label}
                </span>
              </p>
              {g.besteZeit != null && g.besteZeitScore != null ? (
                <p className="lr-audience-window">
                  {t.bestWindow} <span className="lr-nowrap">{g.besteZeit}</span>{' '}
                  <span className="lr-mono">({g.besteZeitScore})</span>
                </p>
              ) : null}
              {urteil ? (
                <p className="lr-audience-urteil" lang={lang}>
                  {urteil}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
