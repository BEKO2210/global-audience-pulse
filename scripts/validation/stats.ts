export function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function ranks(values: readonly number[]) {
  const ordered = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const result = new Array<number>(values.length)
  let start = 0
  while (start < ordered.length) {
    let end = start + 1
    while (end < ordered.length && ordered[end]!.value === ordered[start]!.value) end += 1
    const rank = (start + 1 + end) / 2
    for (let i = start; i < end; i += 1) result[ordered[i]!.index] = rank
    start = end
  }
  return result
}

function pearson(x: readonly number[], y: readonly number[]) {
  if (x.length !== y.length || x.length < 2) return Number.NaN
  const mx = x.reduce((sum, value) => sum + value, 0) / x.length
  const my = y.reduce((sum, value) => sum + value, 0) / y.length
  let numerator = 0
  let xx = 0
  let yy = 0
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i]! - mx
    const dy = y[i]! - my
    numerator += dx * dy
    xx += dx * dx
    yy += dy * dy
  }
  return xx && yy ? numerator / Math.sqrt(xx * yy) : 0
}

export function spearman(x: readonly number[], y: readonly number[]) {
  return pearson(ranks(x), ranks(y))
}

export interface BootstrapOptions {
  B: number
  seed: number
  level: number
}

export interface ConfidenceInterval {
  low: number
  high: number
  samples: number[]
}

function quantile(sorted: readonly number[], probability: number) {
  if (!sorted.length) return Number.NaN
  const position = (sorted.length - 1) * probability
  const lower = Math.floor(position)
  const fraction = position - lower
  return (
    sorted[lower]! + (sorted[Math.min(lower + 1, sorted.length - 1)]! - sorted[lower]!) * fraction
  )
}

export function blockBootstrapCI<T>(
  rows: readonly T[],
  blockOf: (row: T) => string | number,
  stat: (sample: readonly T[]) => number,
  options: BootstrapOptions,
): ConfidenceInterval {
  if (!rows.length) return { low: Number.NaN, high: Number.NaN, samples: [] }
  const grouped = new Map<string | number, T[]>()
  for (const row of rows) {
    const key = blockOf(row)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  const blocks = [...grouped.values()]
  const random = mulberry32(options.seed)
  const samples: number[] = []
  for (let iteration = 0; iteration < options.B; iteration += 1) {
    const sample: T[] = []
    for (let i = 0; i < blocks.length; i += 1) {
      sample.push(...blocks[Math.floor(random() * blocks.length)]!)
    }
    const value = stat(sample)
    if (Number.isFinite(value)) samples.push(value)
  }
  samples.sort((a, b) => a - b)
  const tail = (1 - options.level) / 2
  return { low: quantile(samples, tail), high: quantile(samples, 1 - tail), samples }
}

export function permutationP(
  x: readonly number[],
  y: readonly number[],
  options: { n: number; seed: number },
) {
  const observed = Math.abs(spearman(x, y))
  const random = mulberry32(options.seed)
  const shuffled = [...y]
  let extreme = 0
  for (let iteration = 0; iteration < options.n; iteration += 1) {
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
    }
    if (Math.abs(spearman(x, shuffled)) >= observed) extreme += 1
  }
  return (extreme + 1) / (options.n + 1)
}

export function tercileUplift<T extends { score: number; residual: number }>(rows: readonly T[]) {
  if (rows.length < 3) return Number.NaN
  const ordered = [...rows].sort((a, b) => a.score - b.score)
  const size = Math.floor(ordered.length / 3)
  const relative = (row: T) => Math.exp(row.residual)
  const median = (values: number[]) => {
    values.sort((a, b) => a - b)
    const middle = Math.floor(values.length / 2)
    return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2
  }
  const low = median(ordered.slice(0, size).map(relative))
  const high = median(ordered.slice(-size).map(relative))
  return (high / low - 1) * 100
}

/** Holm step-down adjusted p-values, returned in the input order. */
export function holm(ps: readonly number[]) {
  const ordered = ps.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p)
  const adjusted = new Array<number>(ps.length)
  let previous = 0
  ordered.forEach((item, rank) => {
    const value = Math.min(1, Math.max(previous, item.p * (ps.length - rank)))
    adjusted[item.index] = value
    previous = value
  })
  return adjusted
}

// Acklam's inverse-normal approximation.
function normalQuantile(p: number) {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : Infinity
  const a = [
    -39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472,
    2.50662827745924,
  ]
  const b = [
    -54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857,
  ]
  const c = [
    -0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373,
    4.37466414146497, 2.93816398269878,
  ]
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742]
  const low = 0.02425
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    )
  }
  if (p > 1 - low) return -normalQuantile(1 - p)
  const q = p - 0.5
  const r = q * q
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  )
}

export function nForSpearman(
  r: number,
  alpha: number,
  power: number,
  sided: 'one' | 'two' | 'one-sided' | 'two-sided' | 1 | 2 = 'two',
) {
  const twoSided = sided === 'two' || sided === 'two-sided' || sided === 2
  const zAlpha = normalQuantile(1 - alpha / (twoSided ? 2 : 1))
  const zPower = normalQuantile(power)
  const effect = Math.atanh(Math.abs(r))
  return Math.ceil(3 + ((zAlpha + zPower) / effect) ** 2)
}
