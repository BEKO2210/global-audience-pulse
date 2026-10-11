// T-010 "Why is a region unusual?": the most-read articles of the previous day in the region's Wikipedia,
// each put into one fixed topic area by the local model; the topics are then counted here, so a single odd
// title (bot traffic, a viral page) cannot become the headline.
import { TOPIC_IDS, type TopicId } from '../../src/config/topics'

const TOP = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/top'
const USER_AGENT =
  'GlobalAudiencePulse/1.0 (https://github.com/BEKO2210/global-audience-pulse; nullmesh@protonmail.com)'
/** Main pages without a namespace prefix (the others are caught by the colon rule). */
const MAIN_PAGES = new Set(['الصفحة_الرئيسة', 'الصفحة_الرئيسية', 'मुखपृष्ठ', 'メインページ'])
export const TOPIC_ARTICLES = 15
export const TOPIC_MIN_COUNT = 3

/** Content articles only: no main page, no namespaced pages (Spezial:, Datei:, ملف:, …), no disambiguation. */
export function contentArticles(titles: readonly string[], max = TOPIC_ARTICLES) {
  return titles
    .filter(
      (t) =>
        !MAIN_PAGES.has(t) &&
        !/^[^_:]+:/.test(t) &&
        !/\((Begriffsklärung|توضيح|曖昧さ回避)\)/.test(t),
    )
    .slice(0, max)
    .map((t) => t.replace(/_/g, ' '))
}

/** Topics that at least `min` articles share, most frequent first, at most three; "sonstiges" never counts. */
export function countTopics(labels: readonly string[], min = TOPIC_MIN_COUNT): TopicId[] {
  const counts = new Map<TopicId, number>()
  for (const label of labels)
    if ((TOPIC_IDS as string[]).includes(label) && label !== 'sonstiges')
      counts.set(label as TopicId, (counts.get(label as TopicId) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)
}

const day = (d: Date) =>
  `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`

/** Top articles of yesterday (UTC), or of the day before when yesterday is not published yet. */
export async function topArticles(project: string, now: Date) {
  for (const back of [1, 2]) {
    const date = new Date(now.getTime() - back * 86_400_000)
    const response = await fetch(`${TOP}/${project}/all-access/${day(date)}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!response.ok) continue
    const json = (await response.json()) as { items?: { articles?: { article: string }[] }[] }
    const titles = json.items?.[0]?.articles?.map((a) => a.article) ?? []
    if (titles.length) return contentArticles(titles)
  }
  return []
}

export const TOPIC_SCHEMA = {
  type: 'object',
  properties: {
    themen: { type: 'array', items: { type: 'string', enum: TOPIC_IDS } },
  },
  required: ['themen'],
}

export function topicPrompt(titles: readonly string[]) {
  return `Ordne jeden dieser Wikipedia-Artikeltitel genau einem Themenbereich zu. Erlaubt: ${TOPIC_IDS.join(', ')}.
Personen ordnest du nach ihrem Bereich zu (Politikerin → politik, Sänger → musik, Fußballer → sport).
Unklare oder anstößige Titel → sonstiges. Antworte mit "themen": eine Liste in derselben Reihenfolge, gleiche Länge (${titles.length}).

Titel:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
}
