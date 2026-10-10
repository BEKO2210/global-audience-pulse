/** "12 Min", "3 Std 5 Min", "4 Tagen" — readable at any age. */
export function humanAgo(minutes: number) {
  if (minutes < 60) return `${minutes} Min`
  if (minutes < 48 * 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h} Std ${m} Min` : `${h} Std`
  }
  return `${Math.floor(minutes / 1440)} Tagen`
}

export function minutesAgo(value: string, now: number) {
  return Math.max(0, Math.round((now - Date.parse(value)) / 60_000))
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}
