import { fastZonedParts } from '../../src/lib/time'
import type { PostRecord, PostType } from './types'

type Field =
  | 'id'
  | 'permalink'
  | 'type'
  | 'publishedAt'
  | 'reach'
  | 'views'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'boosted'
  | 'collaborative'

/** Extend only this table when a newly observed Meta export uses another heading. */
export const HEADER_ALIASES: Readonly<Record<string, Field>> = {
  'post id': 'id',
  'beitrags-id': 'id',
  permalink: 'permalink',
  'post type': 'type',
  beitragstyp: 'type',
  'publish time': 'publishedAt',
  veröffentlichungszeit: 'publishedAt',
  reach: 'reach',
  reichweite: 'reach',
  views: 'views',
  aufrufe: 'views',
  likes: 'likes',
  'gefällt mir': 'likes',
  comments: 'comments',
  kommentare: 'comments',
  shares: 'shares',
  'geteilte inhalte': 'shares',
  saves: 'saves',
  gespeichert: 'saves',
  boosted: 'boosted',
  beworben: 'boosted',
  collaboration: 'collaborative',
  kollaboration: 'collaborative',
}

function delimiterOf(text: string) {
  const first = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? ''
  let comma = 0
  let semicolon = 0
  let quoted = false
  for (let i = 0; i < first.length; i += 1) {
    if (first[i] === '"') quoted = !quoted
    else if (!quoted && first[i] === ',') comma += 1
    else if (!quoted && first[i] === ';') semicolon += 1
  }
  return semicolon > comma ? ';' : ','
}

function parseRows(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (quoted) throw new Error('CSV-Fehler: nicht geschlossenes Anführungszeichen')
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''))
    rows.push(row)
  }
  return rows.filter((values) => values.some((value) => value.trim()))
}

const normalizeHeader = (value: string) => value.trim().toLocaleLowerCase('de').replace(/\s+/g, ' ')

function numberValue(raw: string, field: string, row: number): number | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const compact = value.replace(/\s|\u00a0/g, '')
  const normalized = /^[+-]?\d+$/.test(compact)
    ? compact
    : /^[+-]?\d{1,3}([.,]\d{3})+$/.test(compact)
      ? compact.replace(/[.,]/g, '')
      : undefined
  if (normalized === undefined)
    throw new InvalidMetricError(
      `CSV-Zeile ${row}: ${field} ist keine gültige Zählmetrik: "${raw}"`,
    )
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed))
    throw new InvalidMetricError(`CSV-Zeile ${row}: ${field} ist keine Zahl: "${raw}"`)
  return parsed
}

class InvalidMetricError extends Error {}

function boolValue(raw: string): boolean | undefined {
  const value = raw.trim().toLowerCase()
  if (!value) return undefined
  return ['1', 'true', 'yes', 'ja', 'paid', 'bezahlt', 'boosted'].includes(value)
}

function boostValue(raw: string, row: number, warnings: string[]) {
  const value = raw.trim().toLowerCase()
  if (['', '0', 'false', 'no', 'nein'].includes(value)) return false
  if (
    [
      '1',
      'true',
      'yes',
      'ja',
      'paid',
      'bezahlt',
      'boosted',
      'beworben',
      'sponsored',
      'promoted',
      'werbung',
      'gesponsert',
    ].includes(value)
  )
    return true
  warnings.push(`CSV-Zeile ${row}: unbekannter Boost-Wert "${raw}"; Beitrag gilt als beworben`)
  return true
}

function sameWall(date: Date, timeZone: string, parts: readonly number[]) {
  const zoned = fastZonedParts(date, timeZone)
  return (
    zoned.year === parts[0] &&
    zoned.month === parts[1] &&
    zoned.day === parts[2] &&
    zoned.hour === parts[3] &&
    zoned.minute === parts[4]
  )
}

/** Converts an unqualified wall-clock time; an autumn overlap deterministically picks its earlier instant. */
export function zonedDate(raw: string, timeZone: string) {
  const value = raw.trim()
  const isoWithZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/
  if (isoWithZone.test(value)) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  let match = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})$/.exec(value)
  let parts: number[] | undefined
  if (match)
    parts = [
      Number(match[3]),
      Number(match[1]),
      Number(match[2]),
      Number(match[4]),
      Number(match[5]),
    ]
  else {
    match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value)
    if (match) parts = match.slice(1, 6).map(Number)
  }
  const invalidDate = () =>
    new Error(`Ungültige Veröffentlichungszeit: "${raw}"; erwartet MM/DD/YYYY HH:mm bzw. ISO`)
  if (!parts) throw invalidDate()
  if (
    parts[1]! < 1 ||
    parts[1]! > 12 ||
    parts[2]! < 1 ||
    parts[2]! > 31 ||
    parts[3]! < 0 ||
    parts[3]! > 23 ||
    parts[4]! < 0 ||
    parts[4]! > 59
  )
    throw invalidDate()
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(0)
  } catch {
    throw new Error(`Ungültige IANA-Zeitzone: "${timeZone}"`)
  }
  const wallUtc = Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!, parts[3]!, parts[4]!)
  const candidates: Date[] = []
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = new Date(wallUtc - offset * 60_000)
    if (sameWall(candidate, timeZone, parts)) candidates.push(candidate)
  }
  if (!candidates.length)
    throw new Error(
      `Nicht existierende Ortszeit in ${timeZone}: "${raw}"; erwartet MM/DD/YYYY HH:mm bzw. ISO`,
    )
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0]!
}

function postType(raw: string): PostType {
  const value = raw.trim().toLowerCase()
  if (value.includes('reel')) return 'reel'
  if (value.includes('carousel') || value.includes('karussell')) return 'carousel'
  if (value.includes('image') || value.includes('photo') || value.includes('bild')) return 'image'
  if (value.includes('story')) return 'story'
  return 'other'
}

export function parseInstagramCsv(text: string, opts: { timeZone: string }) {
  const rows = parseRows(text, delimiterOf(text))
  if (!rows.length) throw new Error('CSV ist leer')
  const warnings: string[] = []
  const fields = rows[0]!.map((header) => {
    const normalized = normalizeHeader(header)
    const field = HEADER_ALIASES[normalized]
    if (!field) warnings.push(`Unbekannte Spalte: "${header.trim()}"`)
    return field
  })
  const required = (field: Field, label: string) => {
    if (!fields.includes(field)) throw new Error(`Pflichtspalte fehlt: ${label}`)
  }
  required('publishedAt', 'Veröffentlichungszeit (publish time / veröffentlichungszeit)')
  required('reach', 'Reichweite (reach / reichweite)')
  const posts: PostRecord[] = []
  for (let index = 1; index < rows.length; index += 1) {
    const source = rows[index]!
    const values: Partial<Record<Field, string>> = {}
    fields.forEach((field, column) => {
      if (field) values[field] = source[column] ?? ''
    })
    const line = index + 1
    try {
      const reach = numberValue(values.reach ?? '', 'Reichweite', line)
      if (reach === undefined) throw new Error(`CSV-Zeile ${line}: Reichweite ist leer`)
      const published = values.publishedAt?.trim()
      if (!published) throw new Error(`CSV-Zeile ${line}: Veröffentlichungszeit ist leer`)
      const id = values.id?.trim() || values.permalink?.trim() || `zeile-${line}`
      const optionalNumber = (field: 'views' | 'likes' | 'comments' | 'shares' | 'saves') =>
        numberValue(values[field] ?? '', field, line)
      posts.push({
        id,
        ...(values.permalink?.trim() ? { permalink: values.permalink.trim() } : {}),
        publishedAt: zonedDate(published, opts.timeZone),
        type: postType(values.type ?? ''),
        reach,
        ...Object.fromEntries(
          (['views', 'likes', 'comments', 'shares', 'saves'] as const)
            .map((field) => [field, optionalNumber(field)] as const)
            .filter(
              (entry): entry is readonly [(typeof entry)[0], number] => entry[1] !== undefined,
            ),
        ),
        ...(fields.includes('boosted')
          ? { boosted: boostValue(values.boosted ?? '', line, warnings) }
          : {}),
        ...(boolValue(values.collaborative ?? '') !== undefined
          ? { collaborative: boolValue(values.collaborative ?? '') }
          : {}),
      })
    } catch (error) {
      if (!(error instanceof InvalidMetricError)) throw error
      warnings.push(`${error.message}; Zeile übersprungen`)
    }
  }
  return { posts, warnings }
}

export type { PostRecord, PostType } from './types'
