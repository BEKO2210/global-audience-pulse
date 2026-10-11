import { Flag } from '../Flag'
import type { FlagCode } from '../../config/flag-codes'
import type { AnalysisFacts } from './types'
import { useLocale, useMessages } from '../../i18n/LocaleProvider'
import type { Messages } from '../../i18n/locale'
import { cityName } from '../../i18n/labels'
import type { RegionId } from '../../config/regions'
import { TOPICS, type TopicId } from '../../config/topics'

const DE = {
  title: 'Live-Signal',
  hint: 'letzte volle Stunde vs. Median derselben Ortszeit der Vorwoche (Wikipedia-Aufrufe)',
  quieter: 'ruhiger',
  usual: 'üblich',
  busier: 'aktiver',
  notable: 'auffällig',
  trackLabel: (city: string, pct: string, notable: boolean) =>
    `${city}: ${pct} Prozent gegenüber üblich${notable ? ', auffällig' : ''}`,
  caption: 'Live-Signal Abweichung nach Ort',
  place: 'Ort',
  deviation: 'Abweichung',
  status: 'Status',
  topics: 'Meistgelesen gestern',
}
const EN: typeof DE = {
  title: 'Live signal',
  hint: 'last full hour vs. median of the same local time last week (Wikipedia views)',
  quieter: 'quieter',
  usual: 'usual',
  busier: 'busier',
  notable: 'notable',
  trackLabel: (city, pct, notable) =>
    `${city}: ${pct} percent vs. usual${notable ? ', notable' : ''}`,
  caption: 'Live signal deviation by place',
  place: 'Place',
  deviation: 'Deviation',
  status: 'Status',
  topics: 'Most read yesterday',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

function regionForOrt(ort: string, regionen: NonNullable<AnalysisFacts['regionen']>) {
  return regionen.find((r) => r.ort === ort)
}

export function LiveSignals({ facts }: { facts: AnalysisFacts }) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const signale = facts.liveSignale
  const regionen = facts.regionen
  if (!signale?.length || !regionen?.length) return null

  const sorted = [...signale].sort(
    (a, b) => Math.abs(b.abweichungProzent) - Math.abs(a.abweichungProzent),
  )
  const cityOf = (ort: string) => {
    const id = regionForOrt(ort, regionen)?.id
    return id ? cityName(id as RegionId, ort, locale) : ort
  }
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.abweichungProzent)), 1)

  return (
    <section className="lr-block" aria-labelledby="lr-live-title">
      <h3 id="lr-live-title" className="lr-block-title">
        {t.title}
      </h3>
      <p className="lr-live-hint">{t.hint}</p>

      <div className="lr-live-header" aria-hidden="true">
        <span className="lr-live-header-meta" />
        <div className="lr-live-header-track">
          <span className="lr-live-head-quiet">{t.quieter}</span>
          <span className="lr-live-head-mid">{t.usual}</span>
          <span className="lr-live-head-active">{t.busier}</span>
        </div>
        <span className="lr-live-header-val" />
      </div>

      <ul className="lr-live-list">
        {sorted.map((s) => {
          const pct = s.abweichungProzent
          const half = 50
          const barPct = (Math.abs(pct) / maxAbs) * half
          const region = regionForOrt(s.ort, regionen)
          const flag: FlagCode | null = region?.flagge ?? null
          const ort = region ? cityName(region.id as RegionId, s.ort, locale) : s.ort
          const isNotable = Math.abs(pct) > 15
          const dirClass =
            pct > 0 ? 'lr-live-val-active' : pct < 0 ? 'lr-live-val-quiet' : 'lr-live-val-flat'

          return (
            <li key={s.ort} className="lr-live-row">
              <div className="lr-live-meta">
                {flag ? <Flag code={flag} label={ort} size={16} /> : null}
                <span>{ort}</span>
              </div>
              <div
                className="lr-live-track"
                role="img"
                aria-label={t.trackLabel(ort, `${pct > 0 ? '+' : ''}${pct}`, isNotable)}
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
                {isNotable && <span className="lr-live-badge">{t.notable}</span>}
              </div>
              {s.themen?.length ? (
                <p className="lr-live-topics">
                  {t.topics}:{' '}
                  {s.themen
                    .filter((id): id is TopicId => id in TOPICS)
                    .map((id) => TOPICS[id][locale])
                    .join(', ')}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
      <table className="sr-only">
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            <th>{t.place}</th>
            <th>{t.deviation}</th>
            <th>{t.status}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.ort}>
              <td>{cityOf(s.ort)}</td>
              <td>{s.abweichungProzent}%</td>
              <td>{Math.abs(s.abweichungProzent) > 15 ? t.notable : t.usual}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
