const formatterCache = new Map<string, Intl.DateTimeFormat>()

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
  const offset = (d: Date) => {
    const p = zonedParts(d, timeZone)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - d.getTime()
  }
  // UTC offsets never change twice within a day: probe daily, then bisect to the second.
  const dayMs = 86_400_000
  let previousTime = from.getTime()
  let previous = offset(from)
  for (let step = 1; step <= days; step += 1) {
    const probeTime = from.getTime() + step * dayMs
    const next = offset(new Date(probeTime))
    if (next !== previous) {
      let low = previousTime
      let high = probeTime
      while (high - low > 1_000) {
        const middle = Math.floor((low + high) / 2)
        if (offset(new Date(middle)) === previous) low = middle
        else high = middle
      }
      return new Date(high)
    }
    previousTime = probeTime
    previous = next
  }
  return null
}
