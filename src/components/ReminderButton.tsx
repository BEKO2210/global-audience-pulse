import { useId, useState, useSyncExternalStore } from 'react'
import { Bell, BellRinging } from '@phosphor-icons/react'
import {
  addReminder,
  hasReminder,
  remindersSupported,
  removeReminder,
  subscribeReminders,
} from '../lib/reminder'
import { formatTime } from '../lib/time'
import { track } from '../lib/analytics'
import { useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import './CalendarButton.css'

const DE = {
  remind: 'Erinnern',
  set: (time: string) => `Erinnerung ${time}`,
  hint: 'Benachrichtigung zum Fensterbeginn, solange die Seite oder App geöffnet ist',
  denied: 'Benachrichtigungen sind im Browser blockiert',
}
const EN: typeof DE = {
  remind: 'Remind me',
  set: (time) => `Reminder ${time}`,
  hint: 'Notification when the window starts, while the page or app is open',
  denied: 'Notifications are blocked in this browser',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

/** T-081: browser notification at the start of a window; toggles off when set. Hidden without the API. */
export function ReminderButton({
  at,
  title,
  body,
  ort,
}: {
  at: Date
  title: string
  body: string
  ort: 'hero' | 'frage'
}) {
  const t = useMessages(M)
  const [denied, setDenied] = useState(false)
  const deniedId = useId()
  const [renderedAt] = useState(() => Date.now())
  const active = useSyncExternalStore(
    subscribeReminders,
    () => hasReminder(at.getTime()),
    () => false,
  )
  if (!remindersSupported() || at.getTime() <= renderedAt) return null
  const time = formatTime(at, Intl.DateTimeFormat().resolvedOptions().timeZone)
  // visible text is the accessible name (WCAG 2.5.3); aria-pressed carries the state, the blocked reason is
  // announced via aria-describedby instead of living only in title=
  return (
    <button
      type="button"
      className={`calendar-button${active ? ' is-active' : ''}`}
      aria-pressed={active}
      aria-describedby={denied ? deniedId : undefined}
      title={denied ? t.denied : t.hint}
      disabled={denied}
      onClick={async () => {
        if (active) {
          removeReminder(at.getTime())
          return
        }
        const ok = await addReminder({ at: at.getTime(), title, body })
        setDenied(!ok)
        if (ok) track('Erinnerung', { ort })
      }}
    >
      {active ? (
        <BellRinging size={16} aria-hidden="true" />
      ) : (
        <Bell size={16} aria-hidden="true" />
      )}
      {active ? t.set(time) : t.remind}
      {denied && (
        <span id={deniedId} className="sr-only">
          {t.denied}
        </span>
      )}
    </button>
  )
}
