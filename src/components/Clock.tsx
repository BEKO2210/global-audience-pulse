import { useEffect, useState } from 'react'
import { formatTime } from '../lib/time'

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
      <small>{formatTime(now, 'UTC')} UTC</small>
    </div>
  )
}
