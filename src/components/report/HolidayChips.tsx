import { Flag } from '../Flag'
import type { AnalysisFacts } from './types'

/** "Feiertag heute in Berlin: Tag der Deutschen Einheit" – only what the facts carry. */
export function HolidayChips({ facts }: { facts: AnalysisFacts }) {
  const list = facts.feiertage ?? []
  if (!list.length) return null
  return (
    <div className="lr-memory lr-holidays" role="list" aria-label="Feiertage in den Regionen">
      {list.map((h) => (
        <span key={`${h.ort}-${h.datum}`} className="lr-memory-badge lr-holiday" role="listitem">
          <Flag code={h.flagge} label="" size={16} />
          Feiertag {h.wann} in {h.ort}: {h.name}
        </span>
      ))}
    </div>
  )
}
