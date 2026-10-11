import { curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import { MOTION } from '../config/motion'

const INK_STROKE = 'color-mix(in srgb, var(--ink) 55%, transparent)'

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
  const width = 180
  const lastIndex = Math.max(0, values.length - 1)
  const lastValue = values[lastIndex] ?? 0
  const lastX = (lastIndex / Math.max(1, values.length - 1)) * width
  const lastY = height - (lastValue / 100) * (height - 4) - 2
  const d =
    line<number>()
      .x((_, i) => (i / Math.max(1, values.length - 1)) * width)
      .y((v) => height - (v / 100) * (height - 4) - 2)
      .curve(curveMonotoneX)(values) ?? ''
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        // no draw-in: a half-drawn line left the end dot floating on its own (O-015)
        initial={false}
        animate={{ d }}
        transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
      />
      {highlightLast && (
        <circle
          cx={lastX}
          cy={lastY}
          r="2.5"
          fill="var(--accent)"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
