// Golden set for the report writer (T-020): 30 frozen fact snapshots across a week and rule-based scoring of a
// written report – number fidelity, shape, trend direction and the two key statements every report must carry
// (best window, strongest market). No model judges another model here.
import { REGIONS } from '../../src/config/regions'
import { globalActivity } from '../../src/lib/model'
import type { Snapshot } from '../../src/lib/snapshot'
import { trendContradictions } from './checker'
import { allowedNumbers, buildFacts, invalidNumbers, reportTexts, type Facts } from './report'
import type { LiveSignal } from './signals'

export const GOLDEN_SIZE = 30
/** First case; then every 5 h 37 min, so the 30 cases cover every hour of the day and every weekday. */
export const GOLDEN_START = Date.UTC(2026, 9, 12, 0, 0)
export const GOLDEN_STEP_MS = (5 * 60 + 37) * 60_000

const SIGNAL_CITIES = ['Berlin', 'São Paulo', 'Dubai', 'Mumbai', 'Tokio']

/** Deterministic live signals: every 5th case one region well below usual, every 7th one well above. */
function signals(index: number): LiveSignal[] {
  return SIGNAL_CITIES.map((ort, i) => {
    const deviation =
      index % 5 === 0 && i === index % SIGNAL_CITIES.length
        ? -32
        : index % 7 === 0 && i === (index + 2) % SIGNAL_CITIES.length
          ? 28
          : ((index * 7 + i * 3) % 13) - 6
    const typisch = 4000 + i * 1500
    return {
      ort,
      letzteStundeOrtszeit: '—',
      aufrufe: Math.round(typisch * (1 + deviation / 100)),
      typisch,
      abweichungProzent: deviation,
    }
  })
}

/** Memory every 3rd case (yesterday, week mean, high/low), else empty like a fresh job. */
function memory(index: number, score: number) {
  if (index % 3 !== 0)
    return {
      stundenImGedaechtnis: 0,
      gesternGleicheZeit: null,
      differenzZuGestern: null,
      wochenmittelGleicheStunde: null,
      wochenhoch: null,
      wochentief: null,
    }
  const yesterday = Math.max(0, score - 6 + (index % 11))
  return {
    stundenImGedaechtnis: 168,
    gesternGleicheZeit: yesterday,
    differenzZuGestern: score - yesterday,
    wochenmittelGleicheStunde: Math.max(0, score - 3),
    wochenhoch: Math.max(score, 74),
    wochentief: Math.min(score, 18),
  }
}

export function goldenFacts(snapshot: Snapshot) {
  const ids = REGIONS.map((r) => r.id)
  return Array.from({ length: GOLDEN_SIZE }, (_, index) => {
    const now = new Date(GOLDEN_START + index * GOLDEN_STEP_MS)
    const score = Math.round(globalActivity(REGIONS, ids, now, snapshot))
    return {
      id: `g${String(index + 1).padStart(2, '0')}`,
      at: now.toISOString(),
      facts: buildFacts(snapshot, now, signals(index), memory(index, score)),
    }
  })
}

export interface WrittenReport {
  schlagzeile: string
  empfehlung: string
  analyse: string
  punkte: string[]
  zielgruppen: { name: string; urteil: string }[]
}

export interface GoldenScore {
  zahlen: boolean
  form: boolean
  trend: boolean
  fenster: boolean
  markt: boolean
  pass: boolean
  falscheZahlen: string[]
  trendFehler: string[]
}

/** Rule-based score of one written report against its facts. */
export function scoreReport(facts: Facts, report: WrittenReport): GoldenScore {
  const texts = reportTexts(report)
  const all = texts.join(' ')
  const falscheZahlen = [...new Set(invalidNumbers(all, allowedNumbers(facts)))]
  const form =
    typeof report.schlagzeile === 'string' &&
    report.schlagzeile.length <= 90 &&
    Array.isArray(report.punkte) &&
    report.punkte.length === 3 &&
    Array.isArray(report.zielgruppen) &&
    report.zielgruppen.length === facts.zielgruppen.length
  const trendFehler = trendContradictions(texts, facts)
  // besteFenster24h is ranked by score; still pick the maximum so older frozen facts score the same way.
  const best = [...facts.besteFenster24h].sort((a, b) => b.score - a.score)[0]
  // Key statement 1: the recommendation names the best window's start time.
  const fenster = best ? `${report.empfehlung} ${report.schlagzeile}`.includes(best.von) : true
  // Key statement 2: the analysis names the market that carries the most points – by city or region name
  // ("Berlin" and "Europa Zentral" are both right) – and it is named before any other market.
  const top = facts.regionen[0]!
  const firstMention = (r: { ort: string; region: string }) =>
    Math.min(
      ...[r.ort, r.region].map((name) => report.analyse.indexOf(name)).filter((i) => i >= 0),
      Infinity,
    )
  const topAt = firstMention(top)
  const markt = topAt < Infinity && facts.regionen.slice(1).every((r) => firstMention(r) >= topAt)
  const zahlen = falscheZahlen.length === 0
  return {
    zahlen,
    form,
    trend: trendFehler.length === 0,
    fenster,
    markt,
    pass: zahlen && form && trendFehler.length === 0 && fenster && markt,
    falscheZahlen,
    trendFehler,
  }
}
