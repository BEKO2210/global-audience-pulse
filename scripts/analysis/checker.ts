// Claim checker for the hourly report (T-022). The checker model must quote the report's value and the data's
// value and compare them BEFORE it rules: with the verdict first (the old schema) it decided, then argued itself
// out of it ("… faktisch korrekt, kein Widerspruch") – 6 of 6 rejections in the last 12 runs were false alarms.

export interface CheckItem {
  aussage: string
  berichtswert: string
  datenwert: string
  vergleich: string
  widerspruch: boolean
}

/** Field order matters: the model fills them in sequence, so the verdict comes last. */
export const CHECKER_SCHEMA = {
  type: 'object',
  properties: {
    pruefungen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aussage: { type: 'string' },
          berichtswert: {
            type: 'string',
            description: 'was der Bericht behauptet (Ort, Zahl, Phase, Richtung)',
          },
          datenwert: { type: 'string', description: 'was die Daten an genau dieser Stelle sagen' },
          vergleich: {
            type: 'string',
            description: 'ein Satz: stimmen berichtswert und datenwert überein?',
          },
          widerspruch: { type: 'boolean' },
        },
        required: ['aussage', 'berichtswert', 'datenwert', 'vergleich', 'widerspruch'],
      },
    },
  },
  required: ['pruefungen'],
}

export function checkerPrompt(facts: object, report: object) {
  return `Prüfe jede Tatsachenaussage des Berichts gegen die Daten. Gehe für jede Aussage so vor:
1. berichtswert: Was behauptet der Bericht genau (Ort, Zahl, Phase, Richtung, Rangfolge)?
2. datenwert: Was steht in den Daten an genau dieser Stelle? Zitiere den Wert.
3. vergleich: Stimmen beide überein? Ein Satz.
4. widerspruch: true NUR, wenn berichtswert und datenwert nicht übereinstimmen – falscher Ort, falsche Zahl,
   falsche Phase, falsche Trendrichtung, falsche Rangfolge oder ein Wert, der zu einer anderen Region gehört.
Gleichheit ist kein Widerspruch ("entspricht dem Wochenhoch" bei score = wochenhoch ist korrekt). "Am meisten" ist
korrekt, wenn kein anderer Wert größer ist. Vereinfachungen, Bewertungen und Formulierungen sind kein Widerspruch.
"Berlin" steht für die Region Europa Zentral, "beitragPunkte" ist der Beitrag zum Gesamtwert.

DATEN:
${JSON.stringify(facts)}

BERICHT:
${JSON.stringify(report)}`
}

/** Phrases with which a checker states that a claim holds; a "contradiction" that says so is discarded. */
const AGREES =
  /(kein(en)? widerspruch|faktisch korrekt|ist korrekt|sind korrekt|stimm(t|en) (überein|mit)|entspricht den daten)/i

/** Contradictions that survive the consistency guard, formatted for the rejection log. */
export function contradictions(items: readonly CheckItem[]) {
  return items
    .filter((item) => item.widerspruch && !AGREES.test(item.vergleich))
    .map((item) => `${item.aussage} (Bericht: ${item.berichtswert}; Daten: ${item.datenwert})`)
    .slice(0, 4)
}

const UP = /\b(steig\w*|anstieg\w*|zunehm\w*|nimmt\s+\w*\s*zu|wächst|wachsen|klettert|legt\s+zu)/i
const DOWN =
  /\b(sink\w*|fällt|fallen|abnehm\w*|nimmt\s+\w*\s*ab|rückgang|lässt\s+nach|geht\s+zurück)/i
const AHEAD =
  /(nächsten|kommenden|in (einer|zwei|drei|\d+) stunden?|bis \d{1,2}(:\d{2})? uhr|später)/i

/**
 * Deterministic trend check: the direction of the next hours is in the data (trendNaechsteStunden vs. gesamt),
 * so a sentence about the coming hours that says the opposite is a contradiction – no model needed. The model
 * checker missed "steigt" for a falling trend in the golden set.
 */
export function trendContradictions(
  texts: readonly string[],
  facts: { gesamt: { score: number }; trendNaechsteStunden: readonly { score: number }[] },
) {
  const end = facts.trendNaechsteStunden.at(-1)?.score
  if (end === undefined) return []
  const delta = end - facts.gesamt.score
  if (Math.abs(delta) < 3) return [] // flat: either word is a fair simplification
  const found: string[] = []
  for (const text of texts)
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (!AHEAD.test(sentence)) continue
      const saysUp = UP.test(sentence)
      const saysDown = DOWN.test(sentence)
      if (saysUp === saysDown) continue
      if ((saysUp && delta < 0) || (saysDown && delta > 0))
        found.push(
          `${sentence} (Daten: ${facts.gesamt.score} → ${end} in ${facts.trendNaechsteStunden.length} Stunden)`,
        )
    }
  return found
}
