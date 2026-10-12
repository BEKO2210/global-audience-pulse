import { curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import { MOTION } from '../config/motion'
import { useSvgBox } from '../hooks/useSvgBox'

const INK_STROKE = 'color-mix(in srgb, var(--ink) 55%, transparent)'
// room for the end dot (r 2.5 + stroke) so it is never clipped at the box edge
const INSET = 4

export function Sparkline({
  values,
  color = INK_STROKE,
  height = 42,
  highlightLast = false,
}: {
  values: readonly number[]
  color?: string
  height?: number
  highlightLast?: boolean
}) {
  const reduceMotion = useReducedMotion()
  // 1 unit = 1 CSS px (like the other charts), so the dot stays a circle and the stroke keeps its width
  const { ref, width, height: boxHeight } = useSvgBox<SVGSVGElement>({ width: 180, height })
  const lastIndex = Math.max(0, values.length - 1)
  const lastValue = values[lastIndex] ?? 0
  const x = (i: number) => INSET + (i / Math.max(1, values.length - 1)) * (width - 2 * INSET)
  const y = (v: number) => boxHeight - (v / 100) * (boxHeight - 2 * INSET) - INSET
  const d =
    line<number>()
      .x((_, i) => x(i))
      .y(y)
      .curve(curveMonotoneX)(values) ?? ''
  return (
    <svg ref={ref} className="sparkline" viewBox={`0 0 ${width} ${boxHeight}`} aria-hidden="true">
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        // no draw-in: a half-drawn line left the end dot floating on its own (O-015)
        initial={false}
        animate={{ d }}
        transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
      />
      {highlightLast && (
        <circle className="now-point" cx={x(lastIndex)} cy={y(lastValue)} r="2.5" />
      )}
    </svg>
  )
}
