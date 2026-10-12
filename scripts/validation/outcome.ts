import type { PostRecord, PostType, ResidualPost } from './types'

export interface ResidualizeOptions {
  now: Date
  minAgeDays: Record<PostType, number>
  window?: number
  minPrior?: number
}

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function residualize(posts: readonly PostRecord[], options: ResidualizeOptions) {
  const window = options.window ?? 10
  const minPrior = options.minPrior ?? 5
  const sorted = [...posts].sort((a, b) => {
    const timeDifference = a.publishedAt.getTime() - b.publishedAt.getTime()
    if (timeDifference) return timeDifference
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const history = new Map<PostType, number[]>()
  const rows: ResidualPost[] = []
  const excluded: { id: string; reason: string }[] = []
  for (let start = 0; start < sorted.length;) {
    const publishedAt = sorted[start]!.publishedAt.getTime()
    let end = start + 1
    while (end < sorted.length && sorted[end]!.publishedAt.getTime() === publishedAt) end += 1
    const group = sorted.slice(start, end)

    for (const post of group) {
      const previous = history.get(post.type) ?? []
      const logReach = Math.log1p(post.reach)
      let reason: string | undefined
      if (post.type === 'story') reason = 'Story (getrennter Datensatz)'
      else if (post.boosted) reason = 'beworben'
      else if (post.collaborative) reason = 'Kollaboration'
      else {
        const ageDays = (options.now.getTime() - post.publishedAt.getTime()) / 86_400_000
        if (ageDays < (options.minAgeDays[post.type] ?? 0)) reason = 'Mindestalter nicht erreicht'
        else if (previous.length < minPrior) reason = 'zu wenig Vorgeschichte'
      }
      if (reason) excluded.push({ id: post.id, reason })
      else {
        const priorMedian = median(previous.slice(-window))
        rows.push({ ...post, logReach, priorMedian, residual: logReach - priorMedian })
      }
    }

    // Every non-story contributes to later history, even if it cannot enter the correlation.
    for (const post of group) {
      if (post.type === 'story') continue
      history.set(post.type, [...(history.get(post.type) ?? []), Math.log1p(post.reach)])
    }
    start = end
  }
  return { rows, excluded }
}

export type { PostRecord, PostType, ResidualPost } from './types'
