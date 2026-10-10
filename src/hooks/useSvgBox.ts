import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Rendered CSS size of an element, kept current with a ResizeObserver. Charts use it as their viewBox, so one
 * SVG unit is one CSS pixel and text keeps its size on every screen instead of scaling with the chart.
 * The box itself is sized by CSS (fixed height), so switching from the fallback never shifts the layout.
 */
export function useSvgBox<T extends Element>(fallback: { width: number; height: number }) {
  const ref = useRef<T>(null)
  const [box, setBox] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)
      if (width > 0 && height > 0)
        setBox((b) => (b.width === width && b.height === height ? b : { width, height }))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, ...box }
}
