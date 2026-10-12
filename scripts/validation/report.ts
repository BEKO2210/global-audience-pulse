import { REGIONS, type RegionId } from '../../src/config/regions'
import { normalizedWeights } from '../../src/lib/model'
import type { Snapshot } from '../../src/lib/snapshot'
import { nForSpearman } from './stats'
import type { PostType } from './types'

export interface ValidationResult {
  generatedAt: Date
  timeZone: string
  selected: readonly RegionId[]
  snapshot: Snapshot
  counts: Partial<Record<PostType, number>>
  period?: { from: Date; to: Date }
  exclusions: Record<string, number>
  score: { sd: number; min: number; max: number; weeklyRangeShare: number }
  primary: { n: number; rho: number; ci: { low: number; high: number }; p: number }
  exploratory: {
    uplift: number
    upliftCI: { low: number; high: number }
    withoutReels: { n: number; rho: number; adjustedP?: number }
    later: {
      n: number
      scoreRho: number
      pastHourMeanRho: number
      studyHoursRho: number
      constantRho: number
      adjustedPs?: readonly number[]
    }
  }
  warnings?: readonly string[]
}

const number = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits).replace('.', ',') : 'nicht bestimmbar'
const percent = (value: number) => `${number(value, 1)} %`
const date = (value: Date) => value.toISOString().slice(0, 10)

export function validationVerdict(result: ValidationResult) {
  const { primary, exploratory, score } = result
  const goChecks = [
    primary.rho >= 0.15,
    primary.ci.low > 0,
    exploratory.uplift >= 10,
    exploratory.upliftCI.low > 0 || exploratory.upliftCI.high < 0,
    exploratory.later.scoreRho >= exploratory.later.pastHourMeanRho,
    score.sd >= 8,
    exploratory.withoutReels.rho > 0,
  ]
  if (goChecks.every(Boolean))
    return { verdict: 'GO' as const, reason: 'Alle vorab festgelegten GO-Kriterien sind erfüllt.' }
  if (
    (primary.n >= 100 && score.sd >= 8 && primary.ci.high < 0.1) ||
    exploratory.later.pastHourMeanRho - exploratory.later.scoreRho >= 0.1
  ) {
    const reason =
      exploratory.later.pastHourMeanRho - exploratory.later.scoreRho >= 0.1
        ? 'Die Ortsstunden-Baseline übertrifft den Score im späteren Teil um mindestens 0,10.'
        : 'Bei ausreichender Stichprobe und Streuung liegt die KI-Obergrenze unter 0,10.'
    return { verdict: 'NO_GO' as const, reason }
  }
  const reasons: string[] = []
  if (primary.ci.low <= 0 && primary.ci.high >= 0) reasons.push('das Konfidenzintervall enthält 0')
  if (score.sd < 8) reasons.push('Score-SD unter 8')
  if (primary.n < 100) reasons.push('n unter 100')
  if (primary.rho < 0.15) reasons.push('ρ unter 0,15')
  if (!(exploratory.upliftCI.low > 0 || exploratory.upliftCI.high < 0))
    reasons.push('Uplift-KI enthält 0')
  if (exploratory.withoutReels.rho <= 0) reasons.push('ρ ohne Reels ist nicht positiv')
  return {
    verdict: 'UNKLAR' as const,
    reason: reasons.join('; ') || 'Nicht alle GO-Kriterien sind erfüllt.',
  }
}

export function renderValidationReport(result: ValidationResult) {
  const verdict = validationVerdict(result)
  const typeOrder: PostType[] = ['image', 'carousel', 'reel', 'story', 'other']
  const typeNames: Record<PostType, string> = {
    image: 'Bild',
    carousel: 'Karussell',
    reel: 'Reel',
    story: 'Story',
    other: 'Sonstige',
  }
  const weights = normalizedWeights(result.selected, result.snapshot)
  const dominant = result.selected
    .map((id) => ({ id, weight: weights[id] ?? 0 }))
    .sort((a, b) => b.weight - a.weight)[0]
  const dominantRegion =
    dominant && dominant.weight >= 0.8
      ? REGIONS.find((region) => region.id === dominant.id)
      : undefined
  const period = result.period
    ? `${date(result.period.from)} bis ${date(result.period.to)}`
    : 'nicht verfügbar'
  const exclusions = Object.entries(result.exclusions).sort(([a], [b]) => a.localeCompare(b, 'de'))
  const pAdjusted = result.exploratory.later.adjustedPs
  const warningLines = result.warnings?.length
    ? `\n## Warnungen\n\n${result.warnings.map((warning) => `- ${warning}`).join('\n')}\n`
    : ''
  return `# Ergebnis-Check: Instagram-Reichweite

Erzeugt: ${result.generatedAt.toISOString()}  
Zeitzone: ${result.timeZone}

## Datengrundlage

- Auswertbare Beiträge: ${result.primary.n}; Zeitraum: ${period}
${typeOrder.map((type) => `- ${typeNames[type]}: ${result.counts[type] ?? 0}`).join('\n')}
${exclusions.length ? exclusions.map(([reason, count]) => `- Ausgeschlossen – ${reason}: ${count}`).join('\n') : '- Ausschlüsse: keine'}

Es wurden weder Beschreibungstexte noch Permalinks in diesen Bericht übernommen. Stories sind ein getrennter Datensatz; ihre Metriken sind nur 24 Stunden verfügbar. Beworbene und erkennbare Kollab-Beiträge sind ausgeschlossen. Reichweite ist laut Meta geschätzt und enthält keine bezahlte Reichweite; \`total_*\`-Metriken können dagegen Werbung enthalten. \`views\` ersetzt seit 2024-07-02 die veraltete Metrik \`impressions\`. Daten sind bis zu zwei Jahre verfügbar und können bis zu 48 Stunden verzögert sein.

## Score-Streuung

- Standardabweichung: ${number(result.score.sd)}
- Minimum / Maximum: ${number(result.score.min)} / ${number(result.score.max)}
- Anteil der Wochenspanne der Zielgruppe: ${percent(result.score.weeklyRangeShare)}
${dominantRegion ? `- Hinweis: Score ist hier die Tageskurve von ${dominantRegion.name} (Gewicht ${percent(dominant!.weight * 100)}).` : ''}

## Primärtest

Einziger konfirmatorischer Test: Spearman-Zusammenhang zwischen Score zur Veröffentlichung und Reichweiten-Residuum.

- n = ${result.primary.n}
- ρ = ${number(result.primary.rho, 3)}
- 95-%-Block-Bootstrap-KI = [${number(result.primary.ci.low, 3)}; ${number(result.primary.ci.high, 3)}]
- Permutations-p = ${number(result.primary.p, 4)}

## Explorativ

Diese Ergebnisse sind explorativ und kein Beleg. Zugehörige Mehrfachtests werden, soweit p-Werte vorliegen, nach Holm korrigiert.

- Terzil-Uplift, oberes gegen unteres Score-Drittel: ${percent(result.exploratory.uplift)}; 95-%-KI [${percent(result.exploratory.upliftCI.low)}; ${percent(result.exploratory.upliftCI.high)}]
- Ohne Reels: n = ${result.exploratory.withoutReels.n}, ρ = ${number(result.exploratory.withoutReels.rho, 3)}${result.exploratory.withoutReels.adjustedP === undefined ? '' : `, Holm-p = ${number(result.exploratory.withoutReels.adjustedP, 4)}`}

## Baselines im späteren zeitlichen Halbteil

- n = ${result.exploratory.later.n}
- Score: ρ = ${number(result.exploratory.later.scoreRho, 3)}${pAdjusted ? `, Holm-p = ${number(pAdjusted[0]!, 4)}` : ''}
- Frühere Beiträge derselben Ortsstunde: ρ = ${number(result.exploratory.later.pastHourMeanRho, 3)}${pAdjusted ? `, Holm-p = ${number(pAdjusted[1]!, 4)}` : ''}
- Instagram-Studienzeiten: ρ = ${number(result.exploratory.later.studyHoursRho, 3)}${pAdjusted ? `, Holm-p = ${number(pAdjusted[2]!, 4)}` : ''}
- Konstant: ρ = ${number(result.exploratory.later.constantRho, 3)} (liefert definitionsgemäß keine Ranginformation)

## Power-Hinweis

Fisher-z-Näherung, α = 0,05, Power = 0,80, zweiseitig:

- Für ρ = 0,20: n ≈ ${nForSpearman(0.2, 0.05, 0.8, 'two')}
- Für ρ = 0,30: n ≈ ${nForSpearman(0.3, 0.05, 0.8, 'two')}

## Urteil: ${verdict.verdict}

${verdict.reason}
${warningLines}`
}
