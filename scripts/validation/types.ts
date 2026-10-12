export type PostType = 'reel' | 'image' | 'carousel' | 'story' | 'other'

export interface PostRecord {
  id: string
  permalink?: string
  publishedAt: Date
  type: PostType
  reach: number
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  boosted?: boolean
  collaborative?: boolean
}

export interface ResidualPost extends PostRecord {
  residual: number
  logReach: number
  priorMedian: number
  score?: number
}
