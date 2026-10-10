import { useEffect, useState } from 'react'

/**
 * Below-the-fold sections mount after first paint, one per idle slot, or immediately when the user
 * scrolls near them. Keeps the start-up main thread short (Lighthouse TBT on slow CI runners).
 */
const queue: (() => void)[] = []
let pumping = false

type IdleCallback = (deadline: { timeRemaining: () => number }) => void
const requestIdle: (cb: IdleCallback, options?: { timeout: number }) => number =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb, options) => window.requestIdleCallback(cb, options)
    : (cb) => window.setTimeout(() => cb({ timeRemaining: () => 16 }), 50)

function pump() {
  requestIdle(
    () => {
      queue.shift()?.()
      if (queue.length) pump()
      else pumping = false
    },
    { timeout: 1_500 },
  )
}

function schedule(mount: () => void) {
  queue.push(mount)
  if (!pumping) {
    pumping = true
    pump()
  }
}

export function useDeferredMount<T extends Element>(enabled: boolean) {
  const [node, attach] = useState<T | null>(null)
  const [mounted, setMounted] = useState(!enabled)
  useEffect(() => {
    if (mounted) return
    let done = false
    const mount = () => {
      if (done) return
      done = true
      setMounted(true)
    }
    schedule(mount)
    const observer =
      node && 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && mount(), {
            rootMargin: '800px 0px',
          })
        : null
    if (node) observer?.observe(node)
    return () => {
      done = true
      observer?.disconnect()
    }
  }, [mounted, node])
  return { attach, mounted }
}
