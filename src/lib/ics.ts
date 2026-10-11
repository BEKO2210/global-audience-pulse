// One calendar event as an .ics file (RFC 5545), shared by every "add to calendar" button (T-080).
// Times are UTC ("…Z"): a TZID needs a VTIMEZONE block that several clients reject or misread when missing,
// UTC is understood everywhere and shown in the viewer's own zone by the calendar app.

export interface CalendarEvent {
  start: Date
  end: Date
  summary: string
  description?: string
  url?: string
}

/** 20261011T180000Z */
export function icsUtc(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** TEXT values: backslash, semicolon, comma and newlines are escaped. */
export function icsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Lines longer than 75 octets are folded with CRLF + space (UTF-8 aware, never splits a character). */
export function foldLine(line: string) {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  for (const char of line) {
    const limit = parts.length ? 74 : 75 // continuation lines start with a space
    if (encoder.encode(current + char).length > limit) {
      parts.push(current)
      current = char
    } else current += char
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildIcs(event: CalendarEvent, now = new Date()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Global Audience Pulse//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.start.getTime()}-${event.end.getTime()}@global-audience-pulse`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsUtc(event.start)}`,
    `DTEND:${icsUtc(event.end)}`,
    `SUMMARY:${icsText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${icsText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

/** Triggers the download; the object URL is released only after the browser has picked it up. */
export function downloadIcs(event: CalendarEvent, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
