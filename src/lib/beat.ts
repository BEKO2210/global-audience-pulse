/** Beat interval for the pulse token: 6 s at score 0 down to 2.4 s at 100, in 0.4 s steps so it rarely changes. */
export function beatSeconds(score: number | undefined) {
  if (score == null || !Number.isFinite(score)) return 4
  const clamped = Math.min(100, Math.max(0, score))
  const raw = 2.4 + ((100 - clamped) / 100) * 3.6
  return Math.round(raw / 0.4) * 0.4
}
