const formatterCache = new Map<string, Intl.DateTimeFormat>()

export interface OffsetTransition {
  at: number
  offsetMinutes: number
}

export interface OffsetTable {
  timeZone: string
  start: number
  end: number
  initialOffsetMinutes: number
  transitions: readonly OffsetTransition[]
}

const offsetTableCache = new Map<string, OffsetTable>()
const DAY_MS = 86_400_000

/** Intl.DateTimeFormat construction is expensive; reuse one instance per locale/options. */
function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`
  let cached = formatterCache.get(key)
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options)
    formatterCache.set(key, cached)
  }
  return cached
}

export function zonedParts(date: Date, timeZone: string) {
  const parts = formatter('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    hour: Number(value('hour')),
    minute: Number(value('minute')),
    second: Number(value('second')),
    weekday: value('weekday'),
  }
}

function intlOffsetMinutes(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone)
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((wallAsUtc - Math.floor(date.getTime() / 1_000) * 1_000) / 60_000)
}

/**
 * Builds the only Intl-backed object used by the activity model. Seven-day probes
 * find a changed offset; a minute bisection records the exact transition slot.
 */
export function buildOffsetTable(timeZone: string, start: Date, end: Date): OffsetTable {
  const startMs = start.getTime()
  const endMs = end.getTime()
  const initialOffsetMinutes = intlOffsetMinutes(start, timeZone)
  const transitions: OffsetTransition[] = []
  let cursor = startMs
  let currentOffset = initialOffsetMinutes
  const probeStep = 7 * DAY_MS
  while (cursor < endMs) {
    const probe = Math.min(endMs, cursor + probeStep)
    const probeOffset = intlOffsetMinutes(new Date(probe), timeZone)
    if (probeOffset !== currentOffset) {
      let low = cursor
      let high = probe
      while (high - low > 60_000) {
        const middle = Math.floor((low + high) / 2)
        if (intlOffsetMinutes(new Date(middle), timeZone) === currentOffset) low = middle
        else high = middle
      }
      let at = Math.floor(high / 60_000) * 60_000
      if (intlOffsetMinutes(new Date(at), timeZone) === currentOffset) at += 60_000
      currentOffset = intlOffsetMinutes(new Date(at), timeZone)
      transitions.push({ at, offsetMinutes: currentOffset })
      cursor = at
    } else {
      cursor = probe
    }
  }
  return { timeZone, start: startMs, end: endMs, initialOffsetMinutes, transitions }
}

/** Session-cached, two-year table: previous/next transitions are available too. */
export function getOffsetTable(timeZone: string, reference = new Date()) {
  const year = reference.getUTCFullYear()
  const key = `${timeZone}|${year}`
  let table = offsetTableCache.get(key)
  if (!table) {
    table = buildOffsetTable(
      timeZone,
      new Date(Date.UTC(year - 1, 0, 1)),
      new Date(Date.UTC(year + 2, 0, 1)),
    )
    offsetTableCache.set(key, table)
  }
  return table
}

export function offsetAt(date: Date, table: OffsetTable) {
  const time = date.getTime()
  let offset = table.initialOffsetMinutes
  for (const transition of table.transitions) {
    if (transition.at > time) break
    offset = transition.offsetMinutes
  }
  return offset
}

/** Arithmetic-only wall-clock parts for model code. */
export function fastZonedParts(
  date: Date,
  timeZone: string,
  table = getOffsetTable(timeZone, date),
) {
  const shifted = new Date(date.getTime() + offsetAt(date, table) * 60_000)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shifted.getUTCDay()]!,
  }
}

export function localDecimalHourFast(date: Date, timeZone: string) {
  const p = fastZonedParts(date, timeZone)
  return p.hour + p.minute / 60 + p.second / 3_600
}

export function localDecimalHour(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone)
  return p.hour + p.minute / 60 + p.second / 3600
}

export function isWeekend(date: Date, timeZone: string) {
  return ['Sat', 'Sun'].includes(zonedParts(date, timeZone).weekday)
}

export function timeZoneName(
  date: Date,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  return (
    formatter('de-DE', { timeZone, timeZoneName: 'short' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  )
}

export function formatTime(date: Date, timeZone: string, seconds = false) {
  return formatter('de-DE', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(date)
}

export function formatDecimalHour(hour: number) {
  const totalMinutes = ((Math.round(hour * 60) % 1440) + 1440) % 1440
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export function formatDateTime(date: Date, timeZone: string) {
  return formatter('de-DE', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

export function circularMean(hours: readonly number[], weights?: readonly number[]) {
  if (!hours.length) return 0
  let x = 0
  let y = 0
  hours.forEach((hour, index) => {
    const angle = (hour / 24) * Math.PI * 2
    const weight = weights?.[index] ?? 1
    x += Math.cos(angle) * weight
    y += Math.sin(angle) * weight
  })
  if (Math.hypot(x, y) < Number.EPSILON) return 0
  const angle = Math.atan2(y, x)
  return (((angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI * 2)) * 24) % 24
}

export function relativeTime(target: Date, from = new Date()) {
  const minutes = Math.max(0, Math.round((target.getTime() - from.getTime()) / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h ${m} min` : `${m} min`
}

export function findNextOffsetChange(timeZone: string, from: Date, days = 370) {
  const limit = from.getTime() + days * DAY_MS
  const transition = getOffsetTable(timeZone, from).transitions.find(
    (item) => item.at > from.getTime() && item.at <= limit,
  )
  return transition ? new Date(transition.at) : null
}

/** Start of the next calendar day in an explicit IANA zone, including DST days. */
export function startOfNextZonedDay(date: Date, timeZone: string) {
  const parts = fastZonedParts(date, timeZone)
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day + 1)
  const table = getOffsetTable(timeZone, date)
  let result = wall - offsetAt(date, table) * 60_000
  result = wall - offsetAt(new Date(result), table) * 60_000
  return new Date(result)
}

export function snapToMinutes(date: Date, minutes: number) {
  const step = minutes * 60_000
  return new Date(Math.round(date.getTime() / step) * step)
}
