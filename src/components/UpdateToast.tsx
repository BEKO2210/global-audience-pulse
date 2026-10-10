import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowClockwise } from '@phosphor-icons/react'
import './UpdateToast.css'

const CHECK_EVERY_MS = 60 * 60_000

/**
 * Registers the service worker after the page is idle (keeps it off the critical path) and shows a quiet
 * prompt when a new deploy is waiting, so open tabs and installed PWAs never keep running an old build.
 * Checks for updates hourly and whenever the tab becomes visible again.
 */
export function UpdateToast() {
  const [ready, setReady] = useState(false)
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let cancelled = false
    let interval = 0
    const onVisible = (registration: ServiceWorkerRegistration) => () => {
      if (document.visibilityState === 'visible') void registration.update()
    }
    let visibilityHandler: (() => void) | null = null
    const start = () =>
      import('virtual:pwa-register').then(({ registerSW }) => {
        if (cancelled) return
        update.current = registerSW({
          onNeedRefresh: () => setReady(true),
          onRegisteredSW: (_url, registration) => {
            if (!registration) return
            interval = window.setInterval(() => void registration.update(), CHECK_EVERY_MS)
            visibilityHandler = onVisible(registration)
            document.addEventListener('visibilitychange', visibilityHandler)
          },
        })
      })
    const idle =
      'requestIdleCallback' in window
        ? window.requestIdleCallback(() => void start(), { timeout: 4000 })
        : globalThis.setTimeout(() => void start(), 2000)
    return () => {
      cancelled = true
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idle)
      else globalThis.clearTimeout(idle)
      window.clearInterval(interval)
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [])

  // updateSW(true) reloads once the new worker takes control. A page opened before any worker existed is
  // never controlled, so that event never fires – reload ourselves once the new worker is active.
  const reload = () => {
    void update.current?.(true)
    navigator.serviceWorker.ready.then((registration) => {
      const worker = registration.waiting ?? registration.installing
      if (!worker) return window.location.reload()
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') window.location.reload()
      })
    })
  }

  return (
    <AnimatePresence>
      {ready && (
        <motion.div
          className="update-toast"
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span>Neue Version verfügbar</span>
          <button type="button" className="update-toast-reload" onClick={reload}>
            <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
            Neu laden
          </button>
          <button type="button" className="update-toast-later" onClick={() => setReady(false)}>
            Später
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
