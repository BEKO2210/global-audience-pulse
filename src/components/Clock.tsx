import { useEffect, useState } from 'react'
import { formatTime, timeZoneName } from '../lib/time'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'

const DE = { current: 'Aktuelle Uhrzeit' }
const EN: typeof DE = { current: 'Current time' }
const M: Messages<typeof DE> = { de: DE, en: EN }

export function LiveClock() {
  const t = useMessages(M)
  const { intl } = useLocale()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <div className="live-clock" role="timer" aria-label={t.current}>
      <span>{formatTime(now, zone, true)}</span>
      <small>
        {timeZoneName(now, zone, intl)} · {formatTime(now, 'UTC')} UTC
      </small>
    </div>
  )
}

export function RegionClock({
  timeZone,
  live,
  date,
}: {
  timeZone: string
  live: boolean
  date: Date
}) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(id)
  }, [live])
  return <>{formatTime(live ? now : date, timeZone, true)}</>
}
