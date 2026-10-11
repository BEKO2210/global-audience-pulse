// English edition of the hourly report (T-015). The German report is the checked original: the local writer
// model translates it, and the translation must carry exactly the same numbers and times, otherwise the
// deterministic English template is published instead. No second fact check is needed – meaning was checked in
// German, and a translation that changes a number is caught here.

import { STATUS_LEVELS } from '../../src/config/model'

export interface ReportBody {
  schlagzeile: string
  empfehlung: string
  analyse: string
  punkte: string[]
  zielgruppen: { name: string; urteil: string }[]
}

export function reportStrings(report: ReportBody) {
  return [
    report.schlagzeile,
    report.empfehlung,
    report.analyse,
    ...report.punkte,
    ...report.zielgruppen.map((z) => z.urteil),
  ]
}

/** Numbers in reading order, normalised ("09" → "9"), so "20:00 Uhr" and "20:00" match. */
const numbers = (texts: readonly string[]) =>
  texts.flatMap((text) => [...text.matchAll(/\d+/g)].map((m) => String(Number(m[0]))))

/** Same numbers as the original, as a multiset (order may change with English word order). */
export function numbersMatch(de: ReportBody, en: ReportBody) {
  const a = numbers(reportStrings(de)).sort()
  const b = numbers(reportStrings(en)).sort()
  return a.length === b.length && a.every((n, i) => n === b[i])
}

/** Shape check: same number of points and audiences, headline within bounds. */
export function sameShape(de: ReportBody, en: ReportBody) {
  return (
    typeof en.schlagzeile === 'string' &&
    en.schlagzeile.length > 0 &&
    en.schlagzeile.length <= 100 &&
    Array.isArray(en.punkte) &&
    en.punkte.length === de.punkte.length &&
    Array.isArray(en.zielgruppen) &&
    en.zielgruppen.length === de.zielgruppen.length
  )
}

/** Audience names are lookup keys for the page (facts.zielgruppen); they stay as in the original. */
export function withOriginalNames(de: ReportBody, en: ReportBody): ReportBody {
  return {
    ...en,
    zielgruppen: en.zielgruppen.map((z, i) => ({
      name: de.zielgruppen[i]!.name,
      urteil: z.urteil,
    })),
  }
}

/** Holiday names stay as written in the translation; swap in the English names afterwards (deterministic). */
export function withEnglishHolidays(
  en: ReportBody,
  holidays: readonly { name: string; nameEn?: string }[],
): ReportBody {
  const swaps = holidays.filter((h) => h.nameEn && h.nameEn !== h.name)
  if (!swaps.length) return en
  const swap = (text: string) => swaps.reduce((out, h) => out.split(h.name).join(h.nameEn!), text)
  return {
    schlagzeile: swap(en.schlagzeile),
    empfehlung: swap(en.empfehlung),
    analyse: swap(en.analyse),
    punkte: en.punkte.map(swap),
    zielgruppen: en.zielgruppen.map((z) => ({ name: z.name, urteil: swap(z.urteil) })),
  }
}

export function translatePrompt(report: ReportBody) {
  return `Translate this hourly audience report for creators from German into natural, concise British English.

Rules:
- Keep every number, time and score exactly as written. "20:00 Uhr" becomes "20:00". Do not add or drop any number.
- Keep place names as they are, except "Tokio" → "Tokyo". Keep holiday names as written.
- No emojis, no exclamation marks, no marketing language. Same meaning, no additions.
- Keep the JSON structure: same number of "punkte" and "zielgruppen" in the same order; copy each "name" unchanged.

Report (JSON):
${JSON.stringify(report)}`
}

const STATUS_EN: Record<string, { label: string; verdict: string }> = {
  strong: { label: 'Peak', verdict: 'Post now' },
  good: { label: 'Good momentum', verdict: 'Good moment' },
  medium: { label: 'Building', verdict: 'Wait a little' },
  quiet: { label: 'Quiet', verdict: 'Post later' },
}
const PHASE_EN: Record<string, string> = {
  Nachtruhe: 'night',
  Morgen: 'morning',
  'Aktiver Tag': 'active day',
  Primetime: 'prime time',
  Spätabend: 'late evening',
}
const city = (name: string) => (name === 'Tokio' ? 'Tokyo' : name)
const statusEn = (germanLabel: string) =>
  STATUS_EN[STATUS_LEVELS.find((s) => s.label === germanLabel)?.tone ?? 'quiet']!

interface TemplateFacts {
  gesamt: { score: number; status: string }
  besteFenster24h: { von: string; bis: string; score: number }[]
  trendNaechsteStunden: { score: number }[]
  regionen: { ort: string; phase: string; ortszeit: string; score: number }[]
  zielgruppen: { name: string; status: string; besteZeit: string | null }[]
}

/** Deterministic English report from the facts, used when there is no checked translation. */
export function templateEn(facts: TemplateFacts): ReportBody {
  const status = statusEn(facts.gesamt.status)
  const [best] = facts.besteFenster24h
  const top = facts.regionen.slice(0, 2).map((r) => `${city(r.ort)} (${r.score})`)
  return {
    schlagzeile: `${status.label}: overall score ${facts.gesamt.score}`,
    empfehlung: best
      ? `${status.verdict}. Best window today: ${best.von}–${best.bis} (score ${best.score}).`
      : `${status.verdict}.`,
    analyse: `Most active right now: ${top.join(' and ')}. In three hours the overall score will be ${facts.trendNaechsteStunden.at(-1)?.score ?? facts.gesamt.score}.`,
    punkte: facts.regionen
      .slice(0, 3)
      .map(
        (r) => `${city(r.ort)}: ${PHASE_EN[r.phase] ?? r.phase}, ${r.ortszeit}, score ${r.score}`,
      ),
    zielgruppen: facts.zielgruppen.map((z) => ({
      name: z.name,
      urteil: z.besteZeit ? `Best window ${z.besteZeit}` : statusEn(z.status).label,
    })),
  }
}
