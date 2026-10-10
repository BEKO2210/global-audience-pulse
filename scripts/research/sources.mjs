// Free, key-less live sources. The local LLM has no internet access of its own: these fetchers pull fresh data
// and hand it to the model as evidence lines ("<text> <url>").

const UA = 'Mozilla/5.0 (X11; Linux x86_64) global-audience-pulse-research/1.0'

async function get(url, accept = 'application/json') {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`)
  return accept.includes('json') ? res.json() : res.text()
}

const daysAgo = (n, now) => new Date(now - n * 86_400_000).toISOString().slice(0, 10)

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim()

export async function hackerNews(topic, now = Date.now()) {
  const line = (h) =>
    `${h.title} (${h.points} Punkte, ${h.num_comments} Kommentare) https://news.ycombinator.com/item?id=${h.objectID}`
  if (topic) {
    // HN rarely uses creator vocabulary: search 30 days with a low bar, fall back to the front page.
    const since = Math.floor((now - 30 * 86_400_000) / 1000)
    const data = await get(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&numericFilters=created_at_i>${since},points>5&hitsPerPage=20`,
    )
    if (data.hits.length >= 5) return data.hits.map(line)
  }
  const front = await get('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=25')
  return front.hits.map(line)
}

export async function gitHub(topic, now = Date.now()) {
  const q = `${topic ? `${topic} ` : ''}created:>${daysAgo(14, now)}`
  const data = await get(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`,
  )
  return data.items.map(
    (r) =>
      `${r.full_name}: ${r.description ?? '–'} (${r.stargazers_count} Sterne, ${r.language ?? 'n/a'}) ${r.html_url}`,
  )
}

/** Reddit blocks anonymous JSON (403) but serves Atom feeds. */
export async function reddit(topic) {
  const url = topic
    ? `https://www.reddit.com/search.rss?q=${encodeURIComponent(topic)}&sort=top&t=week&limit=25`
    : 'https://www.reddit.com/r/popular/top/.rss?t=day&limit=25'
  return parseRedditAtom(await get(url, 'application/atom+xml'))
}

export function parseRedditAtom(xml) {
  const out = []
  for (const entry of xml.split('<entry>').slice(1)) {
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const sub = entry.match(/<category[^>]*term="([^"]+)"/)?.[1]
    const link = entry.match(/<link href="([^"]+)"/)?.[1]
    if (title) out.push(`${decode(title)}${sub ? ` (r/${sub})` : ''}${link ? ` ${link}` : ''}`)
  }
  return out
}

/** Google News RSS search (public feed, no key): last 7 days, German and US editions. */
export async function googleNews(query, { limit = 12 } = {}) {
  const editions = [
    { hl: 'de', gl: 'DE', ceid: 'DE:de' },
    { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ]
  return combine(
    ...editions.map(
      (e) => async () =>
        parseRss(
          await get(
            `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:7d`)}&hl=${e.hl}&gl=${e.gl}&ceid=${e.ceid}`,
            'application/rss+xml',
          ),
        ).slice(0, limit),
    ),
  )
}

export function parseRss(xml) {
  const out = []
  for (const item of xml.split('<item>').slice(1)) {
    const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]
    const date = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
    if (!title) continue
    const parsed = date ? new Date(date) : null
    const day = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : ''
    out.push(`${decode(title)}${day ? ` (${day})` : ''}${link ? ` ${decode(link)}` : ''}`)
  }
  return out
}

/** Live X trending topics from trends24.in (public page): latest hour, Germany and USA. */
export async function xTrends() {
  const regions = [
    ['germany', 'Deutschland'],
    ['united-states', 'USA'],
  ]
  return combine(
    ...regions.map(([slug, label]) => async () => {
      const names = parseTrends24(await get(`https://trends24.in/${slug}/`, 'text/html')).slice(
        0,
        15,
      )
      return names.map((n, i) => `X-Trend ${label} #${i + 1}: ${n} https://trends24.in/${slug}/`)
    }),
  )
}

export function parseTrends24(html) {
  // The first trend list on the page is the latest hour.
  const latest = html.split(/class=["']?trend-card__list/)[1] ?? html
  const end = latest.search(/<\/ol>/)
  const block = end > 0 ? latest.slice(0, end) : latest
  const names = [...block.matchAll(/class=["']?trend-link["']?[^>]*>([^<]+)</g)].map((m) =>
    decode(m[1]),
  )
  return [...new Set(names)]
}

/** YouTube trending videos (Germany) via kworb.net's public trending table. */
export async function youtubeTrending() {
  const html = await get('https://kworb.net/youtube/trending/de.html', 'text/html')
  return [
    ...html.matchAll(/<a href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"[^>]*>([^<]+)</g),
  ]
    .slice(0, 20)
    .map((m, i) => `YouTube-Trend DE #${i + 1}: ${decode(m[2])} ${m[1]}`)
}

/** Run sources in parallel; a failing source is skipped as long as another one delivered. */
export async function combine(...fetchers) {
  const settled = await Promise.allSettled(fetchers.map((f) => f()))
  const ok = settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value)
  if (!ok.length) {
    const reason = settled.find((s) => s.status === 'rejected')?.reason
    if (reason) throw reason
  }
  return ok
}
