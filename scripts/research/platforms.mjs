import {
  combine,
  gitHub,
  googleNews,
  hackerNews,
  reddit,
  xTrends,
  youtubeTrending,
} from './sources.mjs'

/** News about the platform, narrowed to the creator's topic; widens to the generic query if that is too thin. */
const news = (platform, extra) => async (topic) => {
  if (topic) {
    const narrow = await googleNews(`${platform} "${topic}"`)
    if (narrow.length >= MIN_EVIDENCE) return narrow
    return [...narrow, ...(await googleNews(`${platform} ${extra}`))]
  }
  return googleNews(`${platform} ${extra}`)
}

/** Below this many evidence lines an agent reports an error instead of guessing. */
export const MIN_EVIDENCE = 5

export const CATEGORIES = {
  social: 'Social Media',
  longform: 'Long-Form & Community',
  tech: 'Tech & Dev',
}

/** The 10 platform specialists. `live(topic)` pulls key-less live evidence; `domains` = sources named in the prompt. */
export const PLATFORMS = [
  {
    id: 'x',
    name: 'X (Twitter)',
    category: 'social',
    focus: 'Trends, virale Hooks, Meinungsführer, Diskussionsdynamiken',
    domains: ['x.com', 'twitter.com', 'trends24.in', 'getdaytrends.com'],
    live: (topic) => combine(xTrends, () => news('Twitter X', 'viral trend')(topic)),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    focus: 'B2B-Themen, Thought Leadership, Engagement-Formate',
    domains: ['linkedin.com', 'news.linkedin.com'],
    live: news('LinkedIn', 'creator algorithm trend'),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'social',
    focus: 'Video-Konzepte, Titel-Formeln, Thumbnails, Retention-Muster',
    domains: ['youtube.com', 'blog.youtube', 'tubefilter.com'],
    live: (topic) => combine(youtubeTrending, () => news('YouTube', 'creator Shorts trend')(topic)),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'social',
    focus: 'Virale Sounds, Pacing, Schnittmuster, Hook-Typen',
    domains: ['tiktok.com', 'newsroom.tiktok.com', 'ads.tiktok.com'],
    live: news('TikTok', 'trend viral sound'),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    focus: 'Reels-Konzepte, Karussell-Logik, Bildsprache, Captions',
    domains: ['instagram.com', 'about.instagram.com', 'creators.instagram.com'],
    live: news('Instagram', 'Reels creator trend'),
  },
  {
    id: 'threads',
    name: 'Threads',
    category: 'social',
    focus: 'Schnelle Text-Hooks, Diskussionsstarter, Community-Vibes',
    domains: ['threads.net', 'threads.com', 'about.fb.com'],
    live: news('"Meta Threads"', 'OR "Threads app"'),
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'longform',
    focus: 'Pain Points, ungefiltertes Community-Feedback, Nischen-Subreddits',
    domains: ['reddit.com'],
    live: reddit,
  },
  {
    id: 'substack',
    name: 'Substack / Newsletter',
    category: 'longform',
    focus: 'Long-Form-Analysen, Nischen-Trends',
    domains: ['substack.com', 'on.substack.com'],
    live: news('Substack', 'newsletter creator'),
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'tech',
    focus: 'Open-Source-Trends, Stacks, Repositories, Developer-Tools',
    domains: ['github.com', 'github.blog'],
    live: gitHub,
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    category: 'tech',
    focus: 'Tech-Debatten, Startup-Trends, kritische Branchen-News',
    domains: ['news.ycombinator.com'],
    live: hackerNews,
  },
]

/**
 * Resolve a selection like "x,reddit", "tech", "social,github" or "all" to platform ids.
 * Unknown tokens throw, so a typo never silently runs fewer agents.
 */
export function resolveSelection(input) {
  const tokens = String(input)
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const ids = new Set()
  for (const t of tokens) {
    if (t === 'all' || t === 'alle') PLATFORMS.forEach((p) => ids.add(p.id))
    else if (t in CATEGORIES)
      PLATFORMS.filter((p) => p.category === t).forEach((p) => ids.add(p.id))
    else if (/^\d+$/.test(t) && PLATFORMS[Number(t) - 1]) ids.add(PLATFORMS[Number(t) - 1].id)
    else if (PLATFORMS.some((p) => p.id === t)) ids.add(t)
    else throw new Error(`Unbekannte Plattform oder Kategorie: ${t}`)
  }
  return PLATFORMS.filter((p) => ids.has(p.id))
}
