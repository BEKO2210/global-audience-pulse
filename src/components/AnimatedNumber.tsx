import { useEffect, useState } from 'react'
import { useSpring, useTransform } from 'motion/react'

export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 220, damping: 28 })
  const display = useTransform(spring, (n) => Math.round(n))
  const [shown, setShown] = useState(Math.round(value))
  useEffect(() => {
    spring.set(value)
    return display.on('change', (v) => setShown(v))
  }, [value, spring, display])
  return <span>{shown}</span>
}
