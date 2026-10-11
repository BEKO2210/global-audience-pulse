// T-014 weekly review: deterministic statistics of the last seven days from the job's own hourly history
// (history.jsonl), written up by the local model on Sundays. The numbers come from here, never from the model.
import { formatTime, zonedParts } from '../../src/lib/time'
import type { HistoryEntry } from './signals'
import type { ReportBody } from './english'

export const WEEKLY_MIN_HOURS = 72
const ZONE = 'Europe/Berlin'
const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const dateKey = (d: Date) => {
  const p = zonedParts(d, ZONE)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** ISO week label, e.g. 2026-W41, of a date in Berlin time. */
export function isoWeek(date: Date) {
  const p = zonedParts(date, ZONE)
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export interface WeeklyFacts {
  woche: string
  stunden: number
  tage: { datum: string; tag: string; hoch: number; hochUm: string; mittel: number }[]
  besteStunden: { stunde: string; mittel: number }[]
  wochenhoch: { score: number; tag: string; um: string }
  wochentief: { score: number; tag: string; um: string }
  wochenmittel: number
}

/** Statistics over the history entries of the seven days before `now`; null with too little data. */
export function weeklyFacts(history: readonly HistoryEntry[], now: Date): WeeklyFacts | null {
  const since = now.getTime() - 7 * 86_400_000
  const week = history
    .filter((e) => Date.parse(e.t) > since && Date.parse(e.t) <= now.getTime())
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t))
  if (week.length < WEEKLY_MIN_HOURS) return null
  const round = Math.round
  const label = (e: HistoryEntry) => {
    const d = new Date(e.t)
    return {
      tag: DAY_NAMES[new Date(`${dateKey(d)}T12:00:00Z`).getUTCDay()]!,
      um: formatTime(d, ZONE),
    }
  }
  const byDay = Map.groupBy(week, (e) => dateKey(new Date(e.t)))
  const tage = [...byDay].map(([datum, list]) => {
    const top = list.reduce((a, b) => (b.score > a.score ? b : a))
    return {
      datum,
      tag: label(top).tag,
      hoch: round(top.score),
      hochUm: label(top).um,
      mittel: round(list.reduce((s, e) => s + e.score, 0) / list.length),
    }
  })
  const byHour = Map.groupBy(week, (e) => zonedParts(new Date(e.t), ZONE).hour)
  const besteStunden = [...byHour]
    .filter(([, list]) => list.length >= 2)
    .map(([hour, list]) => ({
      stunde: `${String(hour).padStart(2, '0')}:00`,
      mittel: round(list.reduce((s, e) => s + e.score, 0) / list.length),
    }))
    .sort((a, b) => b.mittel - a.mittel)
    .slice(0, 3)
  const high = week.reduce((a, b) => (b.score > a.score ? b : a))
  const low = week.reduce((a, b) => (b.score < a.score ? b : a))
  return {
    woche: isoWeek(now),
    stunden: week.length,
    tage,
    besteStunden,
    wochenhoch: { score: round(high.score), ...label(high) },
    wochentief: { score: round(low.score), ...label(low) },
    wochenmittel: round(week.reduce((s, e) => s + e.score, 0) / week.length),
  }
}

/** Sunday from 18:00 Berlin time, once per ISO week. */
export function weeklyDue(now: Date, lastWeek: string | null) {
  const p = zonedParts(now, ZONE)
  return p.weekday === 'Sun' && p.hour >= 18 && lastWeek !== isoWeek(now)
}

/** Same field names as the hourly report, so the number guard and the translation can be reused. */
export const WEEKLY_SCHEMA = {
  type: 'object',
  properties: {
    schlagzeile: { type: 'string' },
    empfehlung: { type: 'string' },
    analyse: { type: 'string' },
    punkte: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    zielgruppen: { type: 'array', items: { type: 'object' }, maxItems: 0 },
  },
  required: ['schlagzeile', 'empfehlung', 'analyse', 'punkte', 'zielgruppen'],
}

export function weeklyPrompt(facts: WeeklyFacts) {
  return `Du schreibst den Wochenrückblick für "Global Audience Pulse", eine Weltzeituhr für Creator.

Regeln:
- Deutsch, sachlich, ohne Emojis, ohne Ausrufezeichen, ohne Marketing-Floskeln.
- Verwende NUR Zahlen, Uhrzeiten und Tage aus den Daten. Erfinde nichts. Uhrzeiten sind deutsche Zeit.
- schlagzeile: höchstens 70 Zeichen, die Woche in einem Satz.
- empfehlung: 1 Satz: welche Uhrzeit sich diese Woche am meisten gelohnt hat (erste der besteStunden).
- analyse: 2–3 Sätze: stärkster und schwächster Tag (tage.hoch), Wochenhoch und Wochentief mit Tag und Uhrzeit.
- punkte: genau 3 kurze Stichpunkte mit Fakten aus den Daten.
- zielgruppen: leere Liste.

Daten (JSON):
${JSON.stringify(facts, null, 1)}`
}

/** Deterministic fallback when the model is unavailable or its text fails the number guard. */
export function weeklyTemplate(f: WeeklyFacts): ReportBody {
  const best = f.besteStunden[0]
  const top = [...f.tage].sort((a, b) => b.hoch - a.hoch)[0]!
  return {
    schlagzeile: `Woche ${f.woche.slice(-2)}: Wochenmittel ${f.wochenmittel}, Hoch ${f.wochenhoch.score}`,
    empfehlung: best
      ? `Am meisten gelohnt hat sich ${best.stunde} Uhr (Mittel ${best.mittel}).`
      : 'Zu wenige Messungen für eine beste Uhrzeit.',
    analyse: `Stärkster Tag war ${top.tag} mit ${top.hoch} um ${top.hochUm} Uhr. Das Wochentief lag bei ${f.wochentief.score} (${f.wochentief.tag}, ${f.wochentief.um} Uhr).`,
    punkte: [
      `Wochenhoch ${f.wochenhoch.score} am ${f.wochenhoch.tag} um ${f.wochenhoch.um} Uhr`,
      `Wochenmittel ${f.wochenmittel}`,
      `${f.stunden} Stunden gemessen`,
    ],
    zielgruppen: [],
  }
}

const DAY_EN: Record<string, string> = {
  Sonntag: 'Sunday',
  Montag: 'Monday',
  Dienstag: 'Tuesday',
  Mittwoch: 'Wednesday',
  Donnerstag: 'Thursday',
  Freitag: 'Friday',
  Samstag: 'Saturday',
}

export function weeklyTemplateEn(f: WeeklyFacts): ReportBody {
  const best = f.besteStunden[0]
  const top = [...f.tage].sort((a, b) => b.hoch - a.hoch)[0]!
  return {
    schlagzeile: `Week ${f.woche.slice(-2)}: weekly mean ${f.wochenmittel}, high ${f.wochenhoch.score}`,
    empfehlung: best
      ? `The best hour this week was ${best.stunde} (mean ${best.mittel}).`
      : 'Too few measurements for a best hour.',
    analyse: `The strongest day was ${DAY_EN[top.tag]} with ${top.hoch} at ${top.hochUm}. The weekly low was ${f.wochentief.score} (${DAY_EN[f.wochentief.tag]}, ${f.wochentief.um}).`,
    punkte: [
      `Weekly high ${f.wochenhoch.score} on ${DAY_EN[f.wochenhoch.tag]} at ${f.wochenhoch.um}`,
      `Weekly mean ${f.wochenmittel}`,
      `${f.stunden} hours measured`,
    ],
    zielgruppen: [],
  }
}
