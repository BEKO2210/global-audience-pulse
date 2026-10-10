// Platform playbooks (T-070): researched, not live. Every statement points to a source that was opened and checked
// on RESEARCHED_AT; ranking mechanics come from the platforms' own documentation, posting times from studies with a
// published method. Times are in the audience's local time, as the studies normalise them.

export const RESEARCHED_AT = '2026-10-10'

export type PlatformId =
  'x' | 'linkedin' | 'youtube' | 'tiktok' | 'instagram' | 'threads' | 'hackernews'

/** 0 = Monday … 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Source {
  id: string
  publisher: string
  title: string
  url: string
  /** 'YYYY-MM-DD', 'YYYY-MM' or 'laufend' for continuously updated documentation without a date */
  date: string
  kind: 'offiziell' | 'studie'
  /** Data basis of a study, shown next to the source. */
  basis?: string
}

export interface Fact {
  /** two-to-three-word key shown in bold, e.g. "Reels" */
  lead: string
  text: string
  source: string
}

export interface TimeWindow {
  day: Weekday
  /** hour of day, 0–24 */
  from: number
  to: number
}

export interface StudyTimes {
  source: string
  /** short label in the legend, e.g. "Sprout Social" or "Buffer · Shorts" */
  label: string
  windows: readonly TimeWindow[]
  /** top slots in rank order */
  peaks: readonly { day: Weekday; hour: number }[]
  weak?: string
}

export interface Playbook {
  id: PlatformId
  name: string
  rewards: readonly Fact[]
  limits: readonly Fact[]
  times: readonly StudyTimes[]
  /** shown when a part could not be sourced cleanly */
  gap?: string
}

const range = (days: readonly Weekday[], from: number, to: number): TimeWindow[] =>
  days.map((day) => ({ day, from, to }))

const SPROUT_BASIS = '≈ 2 Mrd. Interaktionen · ≈ 307.000 Profile · 27.11.2025–27.02.2026'

export const SOURCES: readonly Source[] = [
  {
    id: 'x-algorithm',
    publisher: 'X',
    title: 'x-algorithm: Quellcode des Für-dich-Feeds (README)',
    url: 'https://github.com/xai-org/x-algorithm',
    date: '2026-10',
    kind: 'offiziell',
  },
  {
    id: 'sprout-x',
    publisher: 'Sprout Social',
    title: 'Best times to post on X (Twitter) in 2026',
    url: 'https://sproutsocial.com/insights/best-times-to-post-on-twitter/',
    date: '2026-03-31',
    kind: 'studie',
    basis: SPROUT_BASIS,
  },
  {
    id: 'buffer-x',
    publisher: 'Buffer',
    title: 'The Best Time to Post on Twitter/X in 2026',
    url: 'https://buffer.com/library/best-time-to-tweet-research/',
    date: '2026-03-13',
    kind: 'studie',
    basis: '8,7 Mio. Posts',
  },
  {
    id: 'linkedin-help',
    publisher: 'LinkedIn',
    title: 'So funktioniert der LinkedIn-Feed (Hilfe a1339724)',
    url: 'https://www.linkedin.com/help/linkedin/answer/a1339724',
    date: 'laufend',
    kind: 'offiziell',
  },
  {
    id: 'linkedin-dwell',
    publisher: 'LinkedIn Engineering',
    title: 'Understanding dwell time to improve LinkedIn feed ranking',
    url: 'https://www.linkedin.com/blog/engineering/feed/understanding-feed-dwell-time',
    date: '2020-05-12',
    kind: 'offiziell',
  },
  {
    id: 'sprout-linkedin',
    publisher: 'Sprout Social',
    title: 'Best times to post on LinkedIn in 2026',
    url: 'https://sproutsocial.com/insights/best-times-to-post-on-linkedin/',
    date: '2026-03-31',
    kind: 'studie',
    basis: SPROUT_BASIS,
  },
  {
    id: 'buffer-linkedin',
    publisher: 'Buffer',
    title: 'Best Time to Post on LinkedIn in 2026',
    url: 'https://buffer.com/resources/best-time-to-post-on-linkedin/',
    date: '2026-09-09',
    kind: 'studie',
    basis: '4,8 Mio. Posts',
  },
  {
    id: 'youtube-how',
    publisher: 'YouTube',
    title: 'So funktioniert YouTube: Empfehlungen',
    url: 'https://www.youtube.com/howyoutubeworks/recommendations/',
    date: 'laufend',
    kind: 'offiziell',
  },
  {
    id: 'buffer-youtube',
    publisher: 'Buffer',
    title: 'Best Time to Post on YouTube',
    url: 'https://buffer.com/resources/best-time-to-post-on-youtube/',
    date: '2026-07-24',
    kind: 'studie',
    basis: '1,8 Mio. Videos (Langvideos und Shorts)',
  },
  {
    id: 'tiktok-newsroom',
    publisher: 'TikTok Newsroom',
    title: 'How TikTok recommends videos #ForYou',
    url: 'https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you',
    date: '2020-06-18',
    kind: 'offiziell',
  },
  {
    id: 'sprout-tiktok',
    publisher: 'Sprout Social',
    title: 'Best times to post on TikTok in 2026',
    url: 'https://sproutsocial.com/insights/best-times-to-post-on-TikTok/',
    date: '2026-03-31',
    kind: 'studie',
    basis: SPROUT_BASIS,
  },
  {
    id: 'buffer-tiktok',
    publisher: 'Buffer',
    title: 'Best Time to Post on TikTok',
    url: 'https://buffer.com/resources/best-time-to-post-on-tiktok/',
    date: '2026-09-14',
    kind: 'studie',
    basis: '7,1 Mio. Posts',
  },
  {
    id: 'instagram-ranking',
    publisher: 'Instagram',
    title: 'Instagram Ranking Explained',
    url: 'https://about.instagram.com/blog/announcements/instagram-ranking-explained',
    date: '2023-05-31',
    kind: 'offiziell',
  },
  {
    id: 'sprout-instagram',
    publisher: 'Sprout Social',
    title: 'Best times to post on Instagram in 2026',
    url: 'https://sproutsocial.com/insights/best-times-to-post-on-instagram/',
    date: '2026-03-31',
    kind: 'studie',
    basis: SPROUT_BASIS,
  },
  {
    id: 'buffer-instagram',
    publisher: 'Buffer',
    title: 'Best Time to Post on Instagram in 2026',
    url: 'https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram/',
    date: '2026-09-23',
    kind: 'studie',
    basis: '9,6 Mio. Posts · über 200.000 Accounts · 01/2024–12/2025',
  },
  {
    id: 'buffer-threads',
    publisher: 'Buffer',
    title: 'Best Times to Post on Threads in 2026',
    url: 'https://buffer.com/resources/the-best-time-to-post-on-threads/',
    date: '2026-02-04',
    kind: 'studie',
    basis: '2,5 Mio. Posts',
  },
  {
    id: 'hn-faq',
    publisher: 'Hacker News',
    title: 'Hacker News FAQ',
    url: 'https://news.ycombinator.com/newsfaq.html',
    date: 'laufend',
    kind: 'offiziell',
  },
]

const TUE_THU: Weekday[] = [1, 2, 3]
const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4]
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export const PLAYBOOKS: readonly Playbook[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    rewards: [
      {
        lead: 'Feed',
        text: 'Deine Aktivität, Signale zum Post – etwa wie schnell er Likes bekommt – und dein bisheriger Austausch mit dem Account.',
        source: 'instagram-ranking',
      },
      {
        lead: 'Reels',
        text: 'Likes, Teilen und Ansehen, Infos zum Reel und die Beliebtheit des Creators.',
        source: 'instagram-ranking',
      },
      {
        lead: 'Entdecken',
        text: 'Die Beliebtheit eines Posts zählt hier deutlich stärker.',
        source: 'instagram-ranking',
      },
    ],
    limits: [
      {
        lead: 'Qualität',
        text: 'Reels in niedriger Auflösung oder mit Wasserzeichen, stumme Reels und Videos, die überwiegend aus Text bestehen, werden seltener gezeigt.',
        source: 'instagram-ranking',
      },
      {
        lead: 'Richtlinien',
        text: 'Verstöße gegen die Empfehlungsrichtlinien bedeuten weniger Empfehlungen in Entdecken, Reels und Suche.',
        source: 'instagram-ranking',
      },
    ],
    times: [
      {
        source: 'sprout-instagram',
        label: 'Sprout Social',
        windows: [
          { day: 0, from: 14, to: 16 },
          { day: 1, from: 13, to: 19 },
          { day: 2, from: 12, to: 21 },
          { day: 3, from: 12, to: 14 },
        ],
        peaks: [],
        weak: 'Wochenende',
      },
      {
        source: 'buffer-instagram',
        label: 'Buffer',
        windows: [],
        peaks: [
          { day: 3, hour: 9 },
          { day: 2, hour: 12 },
          { day: 2, hour: 18 },
        ],
      },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    rewards: [
      {
        lead: 'Interaktionen',
        text: 'Likes, Teilen, Kommentare, gefolgte Accounts und eigene Videos.',
        source: 'tiktok-newsroom',
      },
      {
        lead: 'Video-Infos',
        text: 'Captions, Sounds und Hashtags.',
        source: 'tiktok-newsroom',
      },
      {
        lead: 'Zu Ende geschaut',
        text: 'Ob ein längeres Video vollständig angesehen wird, ist ein starkes Signal.',
        source: 'tiktok-newsroom',
      },
    ],
    limits: [
      {
        lead: 'Kein direkter Faktor',
        text: 'Follower-Zahl und frühere Erfolgsvideos.',
        source: 'tiktok-newsroom',
      },
    ],
    times: [
      {
        source: 'sprout-tiktok',
        label: 'Sprout Social',
        windows: range(TUE_THU, 14, 18),
        peaks: [],
        weak: 'Wochenende',
      },
      {
        source: 'buffer-tiktok',
        label: 'Buffer',
        windows: range(ALL_DAYS, 18, 23),
        peaks: [
          { day: 6, hour: 9 },
          { day: 0, hour: 13 },
          { day: 6, hour: 13 },
        ],
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    rewards: [
      {
        lead: 'Verhalten',
        text: 'Wiedergabeverhalten, Likes, Dislikes, Abos und Feedback der Zuschauer.',
        source: 'youtube-how',
      },
      {
        lead: 'Zufriedenheit',
        text: 'Ergebnisse von Zufriedenheitsumfragen fließen ein.',
        source: 'youtube-how',
      },
      {
        lead: 'Kanal',
        text: 'Reputation und Qualität eines Kanals bestimmen mit, wie, wann und wem Inhalte gezeigt werden.',
        source: 'youtube-how',
      },
    ],
    limits: [],
    times: [
      {
        source: 'buffer-youtube',
        label: 'Buffer · Langvideos',
        windows: [],
        peaks: [{ day: 6, hour: 10 }],
      },
      {
        source: 'buffer-youtube',
        label: 'Buffer · Shorts',
        windows: [],
        peaks: [
          { day: 4, hour: 16 },
          { day: 4, hour: 18 },
          { day: 4, hour: 19 },
        ],
      },
    ],
    gap: 'Sprout Social hat YouTube 2026 nicht ausgewertet.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    rewards: [
      {
        lead: 'Inhalt',
        text: 'Wie oft ein Post angesehen wird und Interaktionen bekommt, wie aktuell er ist und wie konstruktiv die Unterhaltung verläuft.',
        source: 'linkedin-help',
      },
      {
        lead: 'Aktivität',
        text: 'Mit wem und womit der Leser häufig interagiert und was er am längsten ansieht.',
        source: 'linkedin-help',
      },
      {
        lead: 'Identität',
        text: 'Profilangaben wie Ort, Arbeitgeber und Fähigkeiten.',
        source: 'linkedin-help',
      },
    ],
    limits: [
      {
        lead: 'Qualität',
        text: 'Minderwertige oder unsichere Inhalte werden herausgefiltert oder in der Verbreitung gedrosselt.',
        source: 'linkedin-help',
      },
      {
        lead: 'Überspringen',
        text: 'Beiträge mit hoher vorhergesagter Überspring-Wahrscheinlichkeit rutschen im Feed nach unten.',
        source: 'linkedin-dwell',
      },
    ],
    times: [
      {
        source: 'sprout-linkedin',
        label: 'Sprout Social',
        windows: [
          { day: 0, from: 13, to: 14 },
          { day: 1, from: 11, to: 17 },
          { day: 2, from: 11, to: 16 },
          { day: 3, from: 11, to: 12 },
          { day: 3, from: 13, to: 17 },
          { day: 4, from: 11, to: 12 },
          { day: 4, from: 13, to: 14 },
        ],
        peaks: [],
        weak: 'Wochenende',
      },
      {
        source: 'buffer-linkedin',
        label: 'Buffer',
        windows: range(WEEKDAYS, 15, 20),
        peaks: [
          { day: 2, hour: 16 },
          { day: 4, hour: 15 },
          { day: 4, hour: 16 },
        ],
      },
    ],
  },
  {
    id: 'x',
    name: 'X',
    rewards: [
      {
        lead: 'Interaktion',
        text: 'Für jeden Post wird vorhergesagt, wie wahrscheinlich Like, Antwort, Repost, Zitat und Teilen sind – auch per DM oder Link.',
        source: 'x-algorithm',
      },
      {
        lead: 'Aufmerksamkeit',
        text: 'Verweildauer, Weiterschauen bei Videos und Zeit auf dem Profil.',
        source: 'x-algorithm',
      },
      {
        lead: 'Neue Accounts',
        text: 'Wer wenige Impressionen hat, bekommt einen Schub in Richtung einer Zielposition.',
        source: 'x-algorithm',
      },
    ],
    limits: [
      {
        lead: 'Negative Signale',
        text: '„Kein Interesse“, Stummschalten, Blockieren, Melden und Nicht-Verweilen senken den Score.',
        source: 'x-algorithm',
      },
      {
        lead: 'Vielfalt',
        text: 'Jeder weitere Post desselben Accounts im Feed wird schrittweise abgewertet.',
        source: 'x-algorithm',
      },
      {
        lead: 'Nicht-Follower',
        text: 'Posts an Accounts, die dir nicht folgen, werden mit einem Faktor unter 1 gewichtet.',
        source: 'x-algorithm',
      },
    ],
    times: [
      {
        source: 'sprout-x',
        label: 'Sprout Social',
        windows: range(TUE_THU, 12, 18),
        peaks: [],
        weak: 'Samstag',
      },
      {
        source: 'buffer-x',
        label: 'Buffer',
        windows: [],
        peaks: [
          { day: 1, hour: 9 },
          { day: 2, hour: 10 },
          { day: 2, hour: 9 },
        ],
        weak: 'abends 18–23 Uhr, Wochenende',
      },
    ],
  },
  {
    id: 'threads',
    name: 'Threads',
    rewards: [],
    limits: [],
    times: [
      {
        source: 'buffer-threads',
        label: 'Buffer',
        windows: range(WEEKDAYS, 6, 11),
        peaks: [
          { day: 3, hour: 9 },
          { day: 2, hour: 12 },
          { day: 2, hour: 9 },
        ],
        weak: 'abends 18–23 Uhr, Wochenende',
      },
    ],
    gap: 'Meta veröffentlicht für Threads keine abrufbare Ranking-Dokumentation – hier stehen nur Zeitdaten.',
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    rewards: [
      {
        lead: 'Formel',
        text: 'Punkte geteilt durch eine Potenz der Zeit seit dem Einreichen.',
        source: 'hn-faq',
      },
      {
        lead: 'Formate',
        text: 'Show HN für eigene Arbeiten mit eigenen Regeln, Ask HN für Fragen.',
        source: 'hn-faq',
      },
    ],
    limits: [
      {
        lead: 'Weitere Faktoren',
        text: 'Nutzer-Flags, Anti-Missbrauch-Software, Abwertung hitziger Diskussionen, Gewichtung von Accounts und Domains, Moderation.',
        source: 'hn-faq',
      },
      {
        lead: 'Karma',
        text: 'Mehr Karma bringt eigenen Beiträgen keinen Ranking-Vorteil.',
        source: 'hn-faq',
      },
    ],
    times: [],
    gap: 'Keine Studie mit offengelegter Methodik zu Posting-Zeiten gefunden.',
  },
]

export const SOURCE_BY_ID: ReadonlyMap<string, Source> = new Map(SOURCES.map((s) => [s.id, s]))

const MONTHS = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sept.',
  'Okt.',
  'Nov.',
  'Dez.',
]

/** '2026-03-31' → '31.03.2026', '2026-10' → 'Okt. 2026', 'laufend' → 'laufend aktualisiert' */
export function formatSourceDate(date: string) {
  if (date === 'laufend') return 'laufend aktualisiert'
  const [y, m, d] = date.split('-')
  if (d) return `${d}.${m}.${y}`
  return `${MONTHS[Number(m) - 1]} ${y}`
}

/** Sources a playbook cites, in first-use order: rewards, limits, then times. */
export function citedSources(playbook: Playbook): Source[] {
  const ids = [
    ...playbook.rewards.map((f) => f.source),
    ...playbook.limits.map((f) => f.source),
    ...playbook.times.map((t) => t.source),
  ]
  return [...new Set(ids)].map((id) => SOURCE_BY_ID.get(id)!)
}

/** First platform in the picker; the list is static and never empty. */
export const DEFAULT_PLAYBOOK: Playbook = PLAYBOOKS[0]!

export const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

/** "Di–Do 12–18 Uhr · Fr 11–12, 13–14 Uhr": per-day ranges, consecutive identical days merged. */
export function describeWindows(study: StudyTimes) {
  const perDay = DAYS.map((_, day) =>
    study.windows
      .filter((w) => w.day === day)
      .sort((a, b) => a.from - b.from)
      .map((w) => `${w.from}–${w.to}`)
      .join(', '),
  )
  const parts: string[] = []
  let day = 0
  while (day < 7) {
    if (!perDay[day]) {
      day++
      continue
    }
    let end = day
    while (end + 1 < 7 && perDay[end + 1] === perDay[day]) end++
    const days =
      day === 0 && end === 6 ? 'täglich' : end === day ? DAYS[day] : `${DAYS[day]}–${DAYS[end]}`
    parts.push(`${days} ${perDay[day]} Uhr`)
    day = end + 1
  }
  return parts.join(' · ')
}

export function describePeaks(study: StudyTimes) {
  return study.peaks.map((p, i) => `${i + 1}. ${DAYS[p.day]} ${p.hour} Uhr`).join(' · ')
}

/** Six 4-hour blocks per day: the heatmap's columns (diagram-design: 3–8 columns). */
export const BLOCKS = [0, 4, 8, 12, 16, 20] as const

/**
 * Study-hours per day × block: hours the studies' windows cover inside the block, plus one hour for each ranked
 * peak that falls outside a window. Summed over all studies of a platform.
 */
export function blockScores(times: readonly StudyTimes[]): number[][] {
  return DAYS.map((_, day) =>
    BLOCKS.map((start) => {
      let score = 0
      for (const study of times) {
        const covered = (hour: number) =>
          study.windows.some((w) => w.day === day && hour >= w.from && hour < w.to)
        for (let hour = start; hour < start + 4; hour++) if (covered(hour)) score++
        for (const peak of study.peaks)
          if (
            peak.day === day &&
            peak.hour >= start &&
            peak.hour < start + 4 &&
            !covered(peak.hour)
          )
            score++
      }
      return score
    }),
  )
}

/** All cells sharing the highest score (empty when nothing is recommended). */
export function strongestCells(scores: readonly (readonly number[])[]) {
  const max = Math.max(0, ...scores.flat())
  if (!max) return []
  const cells: { day: Weekday; block: number }[] = []
  scores.forEach((row, day) =>
    row.forEach((value, block) => {
      if (value === max) cells.push({ day: day as Weekday, block })
    }),
  )
  return cells
}

/** "Di, Mi, Do 12–16 Uhr" or "Mi 12–16 Uhr · Do 8–12 Uhr" for the strongest cells. */
export function describeCells(cells: readonly { day: Weekday; block: number }[]) {
  const byBlock = new Map<number, Weekday[]>()
  for (const c of cells) byBlock.set(c.block, [...(byBlock.get(c.block) ?? []), c.day])
  return [...byBlock.entries()]
    .sort(([a], [b]) => a - b)
    .map(([block, days]) => {
      const start = BLOCKS[block]!
      return `${days.map((d) => DAYS[d]).join(', ')} ${start}–${start + 4} Uhr`
    })
    .join(' · ')
}
