import { useEffect, useState } from 'react'
import { useSpring, useTransform } from 'motion/react'

export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 220, damping: 28 })
  const display = useTransform(spring, (n) => Math.round(n))
  const [shown, setShown] = useState(Math.round(value))
  useEffect(() => {
    spring.set(value)
    // Motion values are stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  useEffect(() => display.on('change', (v) => setShown(v)), [display])
  return <span>{shown}</span>
}
