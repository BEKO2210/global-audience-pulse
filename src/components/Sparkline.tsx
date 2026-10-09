import { curveMonotoneX, line } from 'd3-shape'
import { motion, useReducedMotion } from 'motion/react'
import { MOTION } from '../config/motion'

export function Sparkline({
  values,
  color = 'var(--accent)',
  height = 42,
}: {
  values: readonly number[]
  color?: string
  height?: number
}) {
  const reduceMotion = useReducedMotion()
  const width = 180
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
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        initial={reduceMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        animate={{ d }}
        viewport={{ once: true }}
        transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
      />
    </svg>
  )
}
