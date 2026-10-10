import type { AnalysisFacts } from './types'

export function MemoryBadges({ facts }: { facts: AnalysisFacts }) {
  const g = facts.gedaechtnis
  if (!g) return null

  const badges: string[] = []
  if (g.differenzZuGestern != null) {
    const d = g.differenzZuGestern
    badges.push(`gegenüber gestern ${d > 0 ? '+' : ''}${d}`)
  } else if (g.gesternGleicheZeit != null && facts.gesamt?.score != null) {
    const d = facts.gesamt.score - g.gesternGleicheZeit
    badges.push(`gegenüber gestern ${d > 0 ? '+' : ''}${d}`)
  }
  if (g.wochenmittelGleicheStunde != null) {
    badges.push(`Wochenmittel dieser Stunde ${g.wochenmittelGleicheStunde}`)
  }
  if (g.wochenhoch != null && g.wochentief != null && g.wochenhoch !== g.wochentief) {
    badges.push(`Woche ${g.wochentief}–${g.wochenhoch}`)
  }

  if (badges.length === 0) return null

  return (
    <div className="lr-memory" role="list" aria-label="Vergleich mit früheren Werten">
      {badges.map((b) => (
        <span key={b} className="lr-memory-badge" role="listitem">
          {b}
        </span>
      ))}
    </div>
  )
}
