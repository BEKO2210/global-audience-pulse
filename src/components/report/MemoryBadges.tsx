import type { AnalysisFacts } from './types'
import { useMessages } from '../../i18n/LocaleProvider'
import type { Messages } from '../../i18n/locale'

const DE = {
  vsYesterday: (d: string) => `gegenüber gestern ${d}`,
  weekAverage: (n: number) => `Wochenmittel dieser Stunde ${n}`,
  week: (low: number, high: number) => `Woche ${low}–${high}`,
  label: 'Vergleich mit früheren Werten',
}
const EN: typeof DE = {
  vsYesterday: (d) => `vs. yesterday ${d}`,
  weekAverage: (n) => `weekly average for this hour ${n}`,
  week: (low, high) => `week ${low}–${high}`,
  label: 'Comparison with earlier values',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

export function MemoryBadges({ facts }: { facts: AnalysisFacts }) {
  const t = useMessages(M)
  const g = facts.gedaechtnis
  if (!g) return null

  const badges: string[] = []
  if (g.differenzZuGestern != null) {
    const d = g.differenzZuGestern
    badges.push(t.vsYesterday(`${d > 0 ? '+' : ''}${d}`))
  } else if (g.gesternGleicheZeit != null && facts.gesamt?.score != null) {
    const d = facts.gesamt.score - g.gesternGleicheZeit
    badges.push(t.vsYesterday(`${d > 0 ? '+' : ''}${d}`))
  }
  if (g.wochenmittelGleicheStunde != null) {
    badges.push(t.weekAverage(g.wochenmittelGleicheStunde))
  }
  if (g.wochenhoch != null && g.wochentief != null && g.wochenhoch !== g.wochentief) {
    badges.push(t.week(g.wochentief, g.wochenhoch))
  }

  if (badges.length === 0) return null

  return (
    <div className="lr-memory" role="list" aria-label={t.label}>
      {badges.map((b) => (
        <span key={b} className="lr-memory-badge" role="listitem">
          {b}
        </span>
      ))}
    </div>
  )
}
