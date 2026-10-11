// Report building blocks shared by the hourly job and the golden set (T-020): facts from the app's own model code,
// the writer prompt and schema, and the number guard.
import { PRESETS, REGIONS } from '../../src/config/regions'
import { PHASES } from '../../src/config/model'
import {
  findBestWindows,
  globalActivity,
  phaseAt,
  regionActivity,
  statusFor,
  normalizedWeights,
} from '../../src/lib/model'
import type { Snapshot } from '../../src/lib/snapshot'
import { holidayAt, holidayLabel } from '../../src/lib/holidays'
import { formatTime, localDecimalHour, timeZoneName } from '../../src/lib/time'
import type { compare, LiveSignal } from './signals'

export const ZONE = 'Europe/Berlin'
const round = (n: number) => Math.round(n)
const hm = (d: Date) => formatTime(d, ZONE)

export function buildFacts(
  snapshot: Snapshot,
  now: Date,
  live: LiveSignal[],
  memory: ReturnType<typeof compare>,
) {
  const ids = REGIONS.map((r) => r.id)
  const weights = normalizedWeights(ids, snapshot)
  const scoreAt = (d: Date) => globalActivity(REGIONS, ids, d, snapshot)
  const score = round(scoreAt(now))
  const status = statusFor(score)
  const regions = REGIONS.map((region) => {
    const hour = localDecimalHour(now, region.timeZone)
    return {
      id: region.id,
      flagge: region.flag,
      ort: region.city,
      region: region.name,
      ortszeit: formatTime(now, region.timeZone),
      phase: phaseAt(hour).name,
      score: round(regionActivity(region, now, snapshot)),
      gewichtProzent: round((weights[region.id] ?? 0) * 100),
      // Points this region contributes to the global score (score × weight): who carries the value.
      beitragPunkte: round(regionActivity(region, now, snapshot) * (weights[region.id] ?? 0)),
    }
  }).sort((a, b) => b.beitragPunkte - a.beitragPunkte)
  // Ranked by score (findBestWindows returns time order): the first entry is the best window.
  const windows = [...findBestWindows(scoreAt, now, 24)]
    .sort((a, b) => b.score - a.score)
    .map((w) => ({
      von: hm(w.start),
      bis: hm(w.end),
      score: round(w.score),
      primetimeIn: REGIONS.filter(
        (r) => phaseAt(localDecimalHour(w.start, r.timeZone)).id === 'prime',
      ).map((r) => r.city),
    }))
  const trend = [1, 2, 3].map((h) => ({
    inStunden: h,
    score: round(scoreAt(new Date(now.getTime() + h * 3_600_000))),
  }))
  const presets = PRESETS.map((preset) => {
    const best = findBestWindows(
      (d) => globalActivity(REGIONS, preset.ids, d, snapshot),
      now,
      24,
      undefined,
      1,
    )[0]
    return best
      ? { name: preset.name, von: hm(best.start), bis: hm(best.end), score: round(best.score) }
      : { name: preset.name }
  })
  const audiences = [
    { name: 'Global', ids },
    { name: 'DACH & Europa', ids: ['eu_central'] as const },
    { name: 'USA', ids: ['us_east', 'us_west'] as const },
    ...PRESETS.filter((preset) => preset.ids.length > 2),
  ].map((audience) => {
    const audienceScore = (d: Date) => globalActivity(REGIONS, audience.ids, d, snapshot)
    const nowScore = round(audienceScore(now))
    const best = findBestWindows(audienceScore, now, 24, undefined, 1)[0]
    return {
      name: audience.name,
      scoreJetzt: nowScore,
      status: statusFor(nowScore).label,
      besteZeit: best ? `${hm(best.start)}–${hm(best.end)}` : null,
      besteZeitScore: best ? round(best.score) : null,
    }
  })
  return {
    zeitpunkt: `${hm(now)} ${timeZoneName(now, ZONE)}`,
    gewichtung: 'Werbewert (Internetnutzer × BIP pro Kopf, Weltbank)',
    gesamt: { score, status: status.label, empfehlung: status.verdict },
    trendNaechsteStunden: trend,
    besteFenster24h: windows,
    presets,
    zielgruppen: audiences,
    regionen: regions,
    liveSignale: live,
    // Nationwide public holidays today/tomorrow by each region's own calendar date (the model already counts
    // them as a Sunday). Empty when none – the report must not invent one.
    feiertage: REGIONS.flatMap((region) =>
      (['heute', 'morgen'] as const).flatMap((wann, offset) => {
        const h = holidayAt(
          snapshot.holidays,
          region,
          new Date(now.getTime() + offset * 86_400_000),
        )
        return h
          ? [
              {
                ort: region.city,
                flagge: region.flag,
                wann,
                datum: h.date,
                name: holidayLabel(h, 'de'),
                nameEn: holidayLabel(h, 'en'),
              },
            ]
          : []
      }),
    ),
    gedaechtnis: memory,
    phasen: PHASES.map((p) => `${p.name} ${p.from}–${p.to} Uhr`),
  }
}

export type Facts = ReturnType<typeof buildFacts>

/** All text fields of a report, for the deterministic checks. */
export function reportTexts(report: object) {
  const r = report as {
    schlagzeile?: string
    empfehlung?: string
    analyse?: string
    punkte?: string[]
    zielgruppen?: { urteil: string }[]
  }
  return [
    r.schlagzeile,
    r.empfehlung,
    r.analyse,
    ...(r.punkte ?? []),
    ...(r.zielgruppen ?? []).map((z) => z.urteil),
  ].filter((t): t is string => typeof t === 'string')
}

export const SCHEMA = {
  type: 'object',
  properties: {
    schlagzeile: { type: 'string' },
    empfehlung: { type: 'string' },
    analyse: { type: 'string' },
    punkte: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    zielgruppen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, urteil: { type: 'string' } },
        required: ['name', 'urteil'],
      },
    },
  },
  required: ['schlagzeile', 'empfehlung', 'analyse', 'punkte', 'zielgruppen'],
}

export const PROMPT = (
  facts: Facts,
) => `Du schreibst den stündlichen Lagebericht für "Global Audience Pulse", eine Weltzeituhr für Creator, die zeigt, wann Social-Media-Publikum weltweit wach und aufnahmefähig ist.

Regeln:
- Deutsch, sachlich, klar, ohne Emojis, ohne Ausrufezeichen, ohne Marketing-Floskeln.
- Verwende NUR Zahlen, Uhrzeiten und Orte, die in den Daten stehen. Erfinde nichts, runde nichts um.
- Uhrzeiten sind deutsche Zeit (${facts.zeitpunkt.split(' ').at(-1)}), außer bei "ortszeit".
- schlagzeile: höchstens 70 Zeichen, die Lage in einem Satz.
- empfehlung: 1–2 Sätze, konkret: jetzt posten oder wann. besteFenster24h ist nach Score sortiert; nenne das erste (beste) Fenster mit von–bis.
- analyse: 3–4 Sätze: welche Märkte tragen den Wert gerade (größter beitragPunkte, nicht gewichtProzent), wohin entwickelt er sich in den nächsten Stunden, was bedeutet das für Creator.
- punkte: genau 3 kurze Stichpunkte mit konkreten Fakten aus den Daten. Wenn liveSignale eine Region mit großer Abweichung (mehr als 15 Prozent) zeigen, ist das einer der Punkte ("gerade ungewöhnlich aktiv/ruhig laut Wikipedia-Aufrufen").
- Wenn gedaechtnis Werte enthält, vergleiche in der analyse mit gestern oder dem Wochenmittel derselben Stunde. Sind sie null, erwähne das Gedächtnis nicht.
- Wenn feiertage Einträge enthält, nenne sie sachlich in der analyse (Ort, heute/morgen, Name). Der Gesamtwert
  berücksichtigt sie bereits wie einen Sonntag. Erfinde keine Wirkung, die nicht aus den Zahlen folgt. Ist die Liste
  leer, erwähne keine Feiertage.
- zielgruppen: für jede Zielgruppe aus den Daten ein Urteil in höchstens 12 Wörtern (jetzt posten oder wann), gleicher name wie in den Daten.

Daten (JSON):
${JSON.stringify(facts, null, 1)}`

/** Every number in the text must appear in the facts (anti-hallucination guard). */
export function allowedNumbers(facts: Facts) {
  const allowed = new Set<string>()
  for (const match of JSON.stringify(facts).matchAll(/\d+/g)) {
    allowed.add(String(Number(match[0])))
  }
  for (let n = 1; n <= 8; n += 1) allowed.add(String(n)) // counts like "drei Märkte" written as digits
  return allowed
}

export function invalidNumbers(text: string, allowed: Set<string>) {
  return [...text.matchAll(/\d+/g)].map((m) => String(Number(m[0]))).filter((n) => !allowed.has(n))
}
