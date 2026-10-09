export const MOTION = {
  ease: [0.2, 0.8, 0.2, 1] as const,
  quick: 0.12,
  change: 0.22,
  entrance: 0.42,
  stagger: 0.06,
  spring: { type: 'spring' as const, stiffness: 380, damping: 38, mass: 0.8 },
} as const
