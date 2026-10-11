// T-081: a reminder at the start of a posting window without any server. The browser can only fire it while
// the page or the installed app is open; reminders survive a reload (localStorage) and are re-armed on start.

export const REMINDERS_KEY = 'gap-reminders'
export interface Reminder {
  at: number
  title: string
  body: string
}

const timers = new Map<number, number>()
const listeners = new Set<() => void>()

export function remindersSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Future reminders only, at most 20, sorted; anything malformed is dropped. */
export function parseReminders(raw: string | null, now: number): Reminder[] {
  try {
    const list = JSON.parse(raw ?? '[]') as unknown
    if (!Array.isArray(list)) return []
    return list
      .filter(
        (r): r is Reminder =>
          !!r &&
          typeof r.at === 'number' &&
          r.at > now &&
          typeof r.title === 'string' &&
          typeof r.body === 'string',
      )
      .sort((a, b) => a.at - b.at)
      .slice(0, 20)
  } catch {
    return []
  }
}

function load() {
  try {
    return parseReminders(localStorage.getItem(REMINDERS_KEY), Date.now())
  } catch {
    return []
  }
}

function save(list: Reminder[]) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list))
  } catch {
    /* private mode: the reminder lasts for this page view */
  }
  listeners.forEach((listener) => listener())
}

async function fire(reminder: Reminder) {
  save(load().filter((r) => r.at !== reminder.at))
  if (Notification.permission !== 'granted') return
  const options = {
    body: reminder.body,
    icon: `${import.meta.env.BASE_URL}apple-touch-icon.png`,
    tag: `gap-${reminder.at}`,
  }
  // In an installed app only the service worker may show notifications.
  const registration = await navigator.serviceWorker?.getRegistration?.().catch(() => undefined)
  if (registration) await registration.showNotification(reminder.title, options)
  else new Notification(reminder.title, options)
}

function arm(reminder: Reminder) {
  if (timers.has(reminder.at)) return
  const delay = reminder.at - Date.now()
  // setTimeout caps at ~24.8 days; posting windows are at most a week ahead
  if (delay <= 0 || delay > 2_000_000_000) return
  timers.set(
    reminder.at,
    window.setTimeout(() => void fire(reminder), delay),
  )
}

/** Call once on start: re-arms reminders saved in an earlier visit. */
export function restoreReminders() {
  if (remindersSupported()) load().forEach(arm)
}

export function hasReminder(at: number) {
  return load().some((r) => r.at === at)
}

/** Asks for permission (only after the click), saves and arms; false when the browser said no. */
export async function addReminder(reminder: Reminder) {
  if (!remindersSupported()) return false
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
  if (permission !== 'granted') return false
  save([...load().filter((r) => r.at !== reminder.at), reminder])
  arm(reminder)
  return true
}

export function removeReminder(at: number) {
  const timer = timers.get(at)
  if (timer !== undefined) clearTimeout(timer)
  timers.delete(at)
  save(load().filter((r) => r.at !== at))
}

export function subscribeReminders(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
