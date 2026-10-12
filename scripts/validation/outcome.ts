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
  const sorted = [...posts].sort(
    (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime() || a.id.localeCompare(b.id),
  )
  const history = new Map<PostType, number[]>()
  const rows: ResidualPost[] = []
  const excluded: { id: string; reason: string }[] = []
  for (const post of sorted) {
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
    // Excluded content still belongs to chronology, except incomparable stories and paid/collab posts.
    if (post.type !== 'story' && !post.boosted && !post.collaborative) {
      history.set(post.type, [...previous, logReach])
    }
  }
  return { rows, excluded }
}

export type { PostRecord, PostType, ResidualPost } from './types'
