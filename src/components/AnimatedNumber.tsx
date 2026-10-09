import { useEffect, useRef, useState } from 'react'
import { useReducedMotion, useSpring, useTransform } from 'motion/react'
import { MOTION } from '../config/motion'

export function AnimatedNumber({
  value,
  initialValue = value,
  delayMs = 0,
  accentOnChange = false,
}: {
  value: number
  initialValue?: number
  delayMs?: number
  accentOnChange?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const spring = useSpring(initialValue, MOTION.spring)
  const display = useTransform(spring, (n) => Math.round(n))
  const [shown, setShown] = useState(Math.round(initialValue))
  const underlineRef = useRef<HTMLElement>(null)
  const previous = useRef(value)
  useEffect(() => {
    const update = () => {
      if (reduceMotion) spring.jump(value)
      else spring.set(value)
    }
    const timeout = window.setTimeout(update, reduceMotion ? 0 : delayMs)
    if (accentOnChange && previous.current !== value && !reduceMotion) {
      underlineRef.current?.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      )
    }
    previous.current = value
    return () => clearTimeout(timeout)
    // Motion values are stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion, delayMs, accentOnChange])
  useEffect(() => display.on('change', (v) => setShown(v)), [display])
  return (
    <span className="animated-number">
      <span className="sr-only">{shown}</span>
      {/* One fixed cell per digit: serif digits are proportional and would shift while tweening. */}
      {String(shown)
        .split('')
        .map((digit, index) => (
          <b key={index} className="digit" aria-hidden="true">
            {digit}
          </b>
        ))}
      <i ref={underlineRef} aria-hidden="true" />
    </span>
  )
}
