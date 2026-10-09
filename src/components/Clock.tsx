import { useEffect, useState } from 'react'
import { formatTime, timeZoneName } from '../lib/time'

export function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <div className="live-clock" aria-label="Aktuelle Uhrzeit">
      <span>{formatTime(now, zone, true)}</span>
      <small>
        {timeZoneName(now, zone)} · {formatTime(now, 'UTC')} UTC
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
