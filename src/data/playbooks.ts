// Platform playbooks (T-070): researched, not live. Every statement points to a source that was opened and checked
// on RESEARCHED_AT; ranking mechanics come from the platforms' own documentation, posting times from studies with a
// published method. Times are in the audience's local time, as the studies normalise them.

import type { Locale } from '../i18n/locale'

export const RESEARCHED_AT = '2026-10-10'

/** Text in both languages (T-065). */
export type Text = Readonly<Record<Locale, string>>
/** Text that is either language-neutral (names, English titles) or given in both languages. */
export type Localized = string | Text

export function tr(value: Localized, locale: Locale = 'de'): string {
  return typeof value === 'string' ? value : value[locale]
}

export type PlatformId =
  'x' | 'linkedin' | 'youtube' | 'tiktok' | 'instagram' | 'threads' | 'hackernews'

/** 0 = Monday … 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Source {
  id: string
  publisher: string
  title: Localized
  url: string
  /** 'YYYY-MM-DD', 'YYYY-MM' or 'laufend' for continuously updated documentation without a date */
  date: string
  kind: 'offiziell' | 'studie'
  /** Data basis of a study, shown next to the source. */
  basis?: Localized
}

export interface Fact {
  /** two-to-three-word key shown in bold, e.g. "Reels" */
  lead: Text
  text: Text
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
  label: Localized
  windows: readonly TimeWindow[]
  /** top slots of the whole week, in rank order */
  peaks: readonly { day: Weekday; hour: number }[]
  /** top slots per weekday, in rank order (Buffer publishes three per day) */
  daily: readonly { day: Weekday; hours: readonly number[] }[]
  weak?: Text
}

export interface Playbook {
  id: PlatformId
  name: string
  rewards: readonly Fact[]
  limits: readonly Fact[]
  times: readonly StudyTimes[]
  /** shown when a part could not be sourced cleanly */
  gap?: Text
}

const SPROUT_BASIS: Text = {
  de: '≈ 2 Mrd. Interaktionen · ≈ 307.000 Profile · 27.11.2025–27.02.2026',
  en: '≈ 2B interactions · ≈ 307,000 profiles · 27 Nov 2025 – 27 Feb 2026',
}

export const SOURCES: readonly Source[] = [
  {
    id: 'x-algorithm',
    publisher: 'X',
    title: {
      de: 'x-algorithm: Quellcode des Für-dich-Feeds (README)',
      en: 'x-algorithm: source code of the For You feed (README)',
    },
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
    basis: { de: '8,7 Mio. Posts', en: '8.7M posts' },
  },
  {
    id: 'linkedin-help',
    publisher: 'LinkedIn',
    title: {
      de: 'So funktioniert der LinkedIn-Feed (Hilfe a1339724)',
      en: 'How the LinkedIn feed works (Help a1339724)',
    },
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
    basis: { de: '4,8 Mio. Posts', en: '4.8M posts' },
  },
  {
    id: 'youtube-how',
    publisher: 'YouTube',
    title: {
      de: 'So funktioniert YouTube: Empfehlungen',
      en: 'How YouTube works: Recommendations',
    },
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
    basis: {
      de: '1,8 Mio. Videos (Langvideos und Shorts)',
      en: '1.8M videos (long-form and Shorts)',
    },
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
    basis: { de: '7,1 Mio. Posts', en: '7.1M posts' },
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
    basis: {
      de: '9,6 Mio. Posts · über 200.000 Accounts · 01/2024–12/2025',
      en: '9.6M posts · over 200,000 accounts · Jan 2024 – Dec 2025',
    },
  },
  {
    id: 'buffer-threads',
    publisher: 'Buffer',
    title: 'Best Times to Post on Threads in 2026',
    url: 'https://buffer.com/resources/the-best-time-to-post-on-threads/',
    date: '2026-02-04',
    kind: 'studie',
    basis: { de: '2,5 Mio. Posts', en: '2.5M posts' },
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

export const PLAYBOOKS: readonly Playbook[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    rewards: [
      {
        lead: { de: 'Feed', en: 'Feed' },
        text: {
          de: 'Deine Aktivität, Signale zum Post – etwa wie schnell er Likes bekommt – und dein bisheriger Austausch mit dem Account.',
          en: 'Your activity, signals about the post – such as how quickly it gets likes – and your past interactions with the account.',
        },
        source: 'instagram-ranking',
      },
      {
        lead: { de: 'Reels', en: 'Reels' },
        text: {
          de: 'Likes, Teilen und Ansehen, Infos zum Reel und die Beliebtheit des Creators.',
          en: 'Likes, shares and views, information about the reel and the creator’s popularity.',
        },
        source: 'instagram-ranking',
      },
      {
        lead: { de: 'Entdecken', en: 'Explore' },
        text: {
          de: 'Die Beliebtheit eines Posts zählt hier deutlich stärker.',
          en: 'A post’s popularity counts for much more here.',
        },
        source: 'instagram-ranking',
      },
    ],
    limits: [
      {
        lead: { de: 'Qualität', en: 'Quality' },
        text: {
          de: 'Reels in niedriger Auflösung oder mit Wasserzeichen, stumme Reels und Videos, die überwiegend aus Text bestehen, werden seltener gezeigt.',
          en: 'Low-resolution or watermarked reels, muted reels and videos made up mostly of text are shown less often.',
        },
        source: 'instagram-ranking',
      },
      {
        lead: { de: 'Richtlinien', en: 'Guidelines' },
        text: {
          de: 'Verstöße gegen die Empfehlungsrichtlinien bedeuten weniger Empfehlungen in Entdecken, Reels und Suche.',
          en: 'Violating the Recommendation Guidelines means fewer recommendations in Explore, Reels and Search.',
        },
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
          { day: 2, from: 23, to: 24 },
          { day: 3, from: 12, to: 14 },
        ],
        peaks: [],
        daily: [],
        weak: { de: 'Freitag bis Sonntag', en: 'Friday to Sunday' },
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
        daily: [
          { day: 0, hours: [19, 18, 20] },
          { day: 1, hours: [19, 15, 17] },
          { day: 2, hours: [12, 18, 8] },
          { day: 3, hours: [9, 8, 7] },
          { day: 4, hours: [22, 21] },
          { day: 5, hours: [21, 22, 20] },
          { day: 6, hours: [21, 22, 20] },
        ],
      },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    rewards: [
      {
        lead: { de: 'Interaktionen', en: 'Interactions' },
        text: {
          de: 'Likes, Teilen, Kommentare, gefolgte Accounts und eigene Videos.',
          en: 'Likes, shares, comments, accounts you follow and videos you create.',
        },
        source: 'tiktok-newsroom',
      },
      {
        lead: { de: 'Video-Infos', en: 'Video info' },
        text: { de: 'Captions, Sounds und Hashtags.', en: 'Captions, sounds and hashtags.' },
        source: 'tiktok-newsroom',
      },
      {
        lead: { de: 'Zu Ende geschaut', en: 'Watched to the end' },
        text: {
          de: 'Ob ein längeres Video vollständig angesehen wird, ist ein starkes Signal.',
          en: 'Whether a longer video is watched all the way through is a strong signal.',
        },
        source: 'tiktok-newsroom',
      },
    ],
    limits: [
      {
        lead: { de: 'Kein direkter Faktor', en: 'Not a direct factor' },
        text: {
          de: 'Follower-Zahl und frühere Erfolgsvideos.',
          en: 'Follower count and previous high-performing videos.',
        },
        source: 'tiktok-newsroom',
      },
    ],
    times: [
      {
        source: 'sprout-tiktok',
        label: 'Sprout Social',
        windows: [
          { day: 0, from: 15, to: 17 },
          { day: 1, from: 14, to: 18 },
          { day: 2, from: 13, to: 20 },
          { day: 3, from: 13, to: 17 },
          { day: 4, from: 15, to: 17 },
        ],
        peaks: [],
        daily: [],
        weak: { de: 'Wochenende', en: 'Weekend' },
      },
      {
        source: 'buffer-tiktok',
        label: 'Buffer',
        windows: [
          { day: 0, from: 18, to: 23 },
          { day: 1, from: 18, to: 23 },
          { day: 2, from: 18, to: 23 },
          { day: 3, from: 18, to: 23 },
          { day: 4, from: 18, to: 23 },
          { day: 5, from: 18, to: 23 },
          { day: 6, from: 18, to: 23 },
        ],
        peaks: [
          { day: 6, hour: 9 },
          { day: 0, hour: 13 },
          { day: 6, hour: 13 },
        ],
        daily: [
          { day: 0, hours: [13, 11, 8] },
          { day: 1, hours: [6, 22, 7] },
          { day: 2, hours: [22, 6, 21] },
          { day: 3, hours: [13, 22, 6] },
          { day: 4, hours: [18, 22, 20] },
          { day: 5, hours: [17, 16, 15] },
          { day: 6, hours: [9, 13, 12] },
        ],
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    rewards: [
      {
        lead: { de: 'Verhalten', en: 'Behaviour' },
        text: {
          de: 'Wiedergabeverhalten, Likes, Dislikes, Abos und Feedback der Zuschauer.',
          en: 'Viewers’ watch behaviour, likes, dislikes, subscriptions and feedback.',
        },
        source: 'youtube-how',
      },
      {
        lead: { de: 'Zufriedenheit', en: 'Satisfaction' },
        text: {
          de: 'Ergebnisse von Zufriedenheitsumfragen fließen ein.',
          en: 'Results of satisfaction surveys are factored in.',
        },
        source: 'youtube-how',
      },
      {
        lead: { de: 'Kanal', en: 'Channel' },
        text: {
          de: 'Reputation und Qualität eines Kanals bestimmen mit, wie, wann und wem Inhalte gezeigt werden.',
          en: 'A channel’s reputation and quality help determine how, when and to whom content is shown.',
        },
        source: 'youtube-how',
      },
    ],
    limits: [],
    times: [
      {
        source: 'buffer-youtube',
        label: { de: 'Buffer · Langvideos', en: 'Buffer · Long-form' },
        windows: [],
        peaks: [{ day: 6, hour: 10 }],
        daily: [
          { day: 0, hours: [9, 22, 7] },
          { day: 1, hours: [9, 11, 8] },
          { day: 2, hours: [7, 15, 17] },
          { day: 3, hours: [17, 18, 7] },
          { day: 4, hours: [12, 11, 15] },
          { day: 5, hours: [12, 10, 15] },
          { day: 6, hours: [10, 9, 12] },
        ],
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
        daily: [
          { day: 0, hours: [20, 17, 18] },
          { day: 1, hours: [20, 21, 19] },
          { day: 2, hours: [19, 20, 21] },
          { day: 3, hours: [19, 20, 21] },
          { day: 4, hours: [16, 18, 19] },
          { day: 5, hours: [19, 11, 18] },
          { day: 6, hours: [19, 20, 17] },
        ],
      },
    ],
    gap: {
      de: 'Sprout Social hat YouTube 2026 nicht ausgewertet.',
      en: 'Sprout Social did not analyse YouTube in 2026.',
    },
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    rewards: [
      {
        lead: { de: 'Inhalt', en: 'Content' },
        text: {
          de: 'Wie oft ein Post angesehen wird und Interaktionen bekommt, wie aktuell er ist und wie konstruktiv die Unterhaltung verläuft.',
          en: 'How often a post is viewed and gets interactions, how recent it is and how constructive the conversation is.',
        },
        source: 'linkedin-help',
      },
      {
        lead: { de: 'Aktivität', en: 'Activity' },
        text: {
          de: 'Mit wem und womit der Leser häufig interagiert und was er am längsten ansieht.',
          en: 'Who and what the reader often interacts with, and what they look at longest.',
        },
        source: 'linkedin-help',
      },
      {
        lead: { de: 'Identität', en: 'Identity' },
        text: {
          de: 'Profilangaben wie Ort, Arbeitgeber und Fähigkeiten.',
          en: 'Profile details such as location, employer and skills.',
        },
        source: 'linkedin-help',
      },
    ],
    limits: [
      {
        lead: { de: 'Qualität', en: 'Quality' },
        text: {
          de: 'Minderwertige oder unsichere Inhalte werden herausgefiltert oder in der Verbreitung gedrosselt.',
          en: 'Low-quality or unsafe content is filtered out or has its reach throttled.',
        },
        source: 'linkedin-help',
      },
      {
        lead: { de: 'Überspringen', en: 'Skipping' },
        text: {
          de: 'Beiträge mit hoher vorhergesagter Überspring-Wahrscheinlichkeit rutschen im Feed nach unten.',
          en: 'Posts with a high predicted probability of being skipped move down the feed.',
        },
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
        daily: [],
        weak: { de: 'Wochenende', en: 'Weekend' },
      },
      {
        source: 'buffer-linkedin',
        label: 'Buffer',
        windows: [
          { day: 0, from: 15, to: 20 },
          { day: 1, from: 15, to: 20 },
          { day: 2, from: 15, to: 20 },
          { day: 3, from: 15, to: 20 },
          { day: 4, from: 15, to: 20 },
        ],
        peaks: [
          { day: 2, hour: 16 },
          { day: 4, hour: 15 },
          { day: 4, hour: 16 },
        ],
        daily: [
          { day: 0, hours: [22, 17, 21] },
          { day: 1, hours: [16, 17, 22] },
          { day: 2, hours: [16, 15, 17] },
          { day: 3, hours: [17, 19, 21] },
          { day: 4, hours: [15, 16, 17] },
          { day: 5, hours: [9, 18, 22] },
          { day: 6, hours: [22, 21, 6] },
        ],
      },
    ],
  },
  {
    id: 'x',
    name: 'X',
    rewards: [
      {
        lead: { de: 'Interaktion', en: 'Interaction' },
        text: {
          de: 'Für jeden Post wird vorhergesagt, wie wahrscheinlich Like, Antwort, Repost, Zitat und Teilen sind – auch per DM oder Link.',
          en: 'For every post, the likelihood of a like, reply, repost, quote and share is predicted – including via DM or link.',
        },
        source: 'x-algorithm',
      },
      {
        lead: { de: 'Aufmerksamkeit', en: 'Attention' },
        text: {
          de: 'Verweildauer, Weiterschauen bei Videos und Zeit auf dem Profil.',
          en: 'Dwell time, continued video watching and time spent on the profile.',
        },
        source: 'x-algorithm',
      },
      {
        lead: { de: 'Neue Accounts', en: 'New accounts' },
        text: {
          de: 'Wer wenige Impressionen hat, bekommt einen Schub in Richtung einer Zielposition.',
          en: 'Accounts with few impressions get a boost towards a target position.',
        },
        source: 'x-algorithm',
      },
    ],
    limits: [
      {
        lead: { de: 'Negative Signale', en: 'Negative signals' },
        text: {
          de: '„Kein Interesse“, Stummschalten, Blockieren, Melden und Nicht-Verweilen senken den Score.',
          en: '“Not interested”, muting, blocking, reporting and not dwelling lower the score.',
        },
        source: 'x-algorithm',
      },
      {
        lead: { de: 'Vielfalt', en: 'Diversity' },
        text: {
          de: 'Jeder weitere Post desselben Accounts im Feed wird schrittweise abgewertet.',
          en: 'Each additional post from the same account in the feed is progressively down-weighted.',
        },
        source: 'x-algorithm',
      },
      {
        lead: { de: 'Nicht-Follower', en: 'Non-followers' },
        text: {
          de: 'Posts an Accounts, die dir nicht folgen, werden mit einem Faktor unter 1 gewichtet.',
          en: 'Posts shown to accounts that don’t follow you are weighted by a factor below 1.',
        },
        source: 'x-algorithm',
      },
    ],
    times: [
      {
        source: 'sprout-x',
        label: 'Sprout Social',
        windows: [
          { day: 0, from: 14, to: 15 },
          { day: 0, from: 17, to: 18 },
          { day: 1, from: 12, to: 18 },
          { day: 2, from: 12, to: 18 },
          { day: 3, from: 12, to: 18 },
          { day: 4, from: 12, to: 18 },
          { day: 6, from: 14, to: 18 },
        ],
        peaks: [],
        daily: [],
        weak: { de: 'Samstag', en: 'Saturday' },
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
        daily: [
          { day: 0, hours: [9, 10, 8] },
          { day: 1, hours: [9, 10, 11] },
          { day: 2, hours: [10, 9, 11] },
          { day: 3, hours: [9, 10, 8] },
          { day: 4, hours: [9, 10, 11] },
          { day: 5, hours: [9, 10, 11] },
          { day: 6, hours: [9, 10, 8] },
        ],
        weak: { de: 'abends 18–23 Uhr, Wochenende', en: 'evenings 18:00–23:00, weekend' },
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
        windows: [
          { day: 0, from: 6, to: 11 },
          { day: 1, from: 6, to: 11 },
          { day: 2, from: 6, to: 11 },
          { day: 3, from: 6, to: 11 },
          { day: 4, from: 6, to: 11 },
        ],
        peaks: [
          { day: 3, hour: 9 },
          { day: 2, hour: 12 },
          { day: 2, hour: 9 },
        ],
        daily: [
          { day: 0, hours: [12] },
          { day: 1, hours: [10] },
          { day: 2, hours: [12] },
          { day: 3, hours: [9] },
          { day: 4, hours: [10] },
          { day: 5, hours: [10] },
          { day: 6, hours: [11] },
        ],
        weak: { de: 'abends 18–23 Uhr, Wochenende', en: 'evenings 18:00–23:00, weekend' },
      },
    ],
    gap: {
      de: 'Meta veröffentlicht für Threads keine abrufbare Ranking-Dokumentation – hier stehen nur Zeitdaten.',
      en: 'Meta publishes no accessible ranking documentation for Threads – only timing data is shown here.',
    },
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    rewards: [
      {
        lead: { de: 'Formel', en: 'Formula' },
        text: {
          de: 'Punkte geteilt durch eine Potenz der Zeit seit dem Einreichen.',
          en: 'Points divided by a power of the time since submission.',
        },
        source: 'hn-faq',
      },
      {
        lead: { de: 'Formate', en: 'Formats' },
        text: {
          de: 'Show HN für eigene Arbeiten mit eigenen Regeln, Ask HN für Fragen.',
          en: 'Show HN for your own work, with its own rules; Ask HN for questions.',
        },
        source: 'hn-faq',
      },
    ],
    limits: [
      {
        lead: { de: 'Weitere Faktoren', en: 'Other factors' },
        text: {
          de: 'Nutzer-Flags, Anti-Missbrauch-Software, Abwertung hitziger Diskussionen, Gewichtung von Accounts und Domains, Moderation.',
          en: 'User flags, anti-abuse software, down-weighting of heated discussions, weighting of accounts and domains, moderation.',
        },
        source: 'hn-faq',
      },
      {
        lead: { de: 'Karma', en: 'Karma' },
        text: {
          de: 'Mehr Karma bringt eigenen Beiträgen keinen Ranking-Vorteil.',
          en: 'More karma gives your own submissions no ranking advantage.',
        },
        source: 'hn-faq',
      },
    ],
    times: [],
    gap: {
      de: 'Keine Studie mit offengelegter Methodik zu Posting-Zeiten gefunden.',
      en: 'No study on posting times with a published methodology was found.',
    },
  },
]

export const SOURCE_BY_ID: ReadonlyMap<string, Source> = new Map(SOURCES.map((s) => [s.id, s]))

const MONTHS: Record<Locale, readonly string[]> = {
  de: [
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
  ],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

/**
 * de: '2026-03-31' → '31.03.2026', '2026-10' → 'Okt. 2026', 'laufend' → 'laufend aktualisiert'
 * en: '2026-03-31' → '31 Mar 2026', '2026-10' → 'Oct 2026', 'laufend' → 'continuously updated'
 */
export function formatSourceDate(date: string, locale: Locale = 'de') {
  if (date === 'laufend') return locale === 'de' ? 'laufend aktualisiert' : 'continuously updated'
  const [y, m, d] = date.split('-')
  const month = MONTHS[locale][Number(m) - 1]
  if (d) return locale === 'de' ? `${d}.${m}.${y}` : `${Number(d)} ${month} ${y}`
  return `${month} ${y}`
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
export const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Weekday abbreviations, Monday first. */
export function dayNames(locale: Locale = 'de'): readonly string[] {
  return locale === 'de' ? DAYS : DAYS_EN
}

/** de "12–18 Uhr", en "12:00–18:00" (several ranges share one "Uhr" in German). */
function hourRanges(ranges: readonly (readonly [number, number])[], locale: Locale) {
  if (locale === 'de') return `${ranges.map(([a, b]) => `${a}–${b}`).join(', ')} Uhr`
  return ranges.map(([a, b]) => `${clock(a, locale)}–${clock(b, locale)}`).join(', ')
}

/** de "16 Uhr", en "16:00" */
function clock(hour: number, locale: Locale) {
  return locale === 'de' ? `${hour} Uhr` : `${String(hour).padStart(2, '0')}:00`
}

/** "Di–Do 12–18 Uhr · Fr 11–12, 13–14 Uhr": per-day ranges, consecutive identical days merged. */
export function describeWindows(study: StudyTimes, locale: Locale = 'de') {
  const names = dayNames(locale)
  const perDay = names.map((_, day) =>
    study.windows
      .filter((w) => w.day === day)
      .sort((a, b) => a.from - b.from)
      .map((w) => [w.from, w.to] as const),
  )
  const keyOf = (day: number) => perDay[day]!.map(([a, b]) => `${a}-${b}`).join(',')
  const parts: string[] = []
  let day = 0
  while (day < 7) {
    if (!perDay[day]!.length) {
      day++
      continue
    }
    let end = day
    while (end + 1 < 7 && keyOf(end + 1) === keyOf(day)) end++
    const days =
      day === 0 && end === 6
        ? locale === 'de'
          ? 'täglich'
          : 'daily'
        : end === day
          ? names[day]
          : `${names[day]}–${names[end]}`
    parts.push(`${days} ${hourRanges(perDay[day]!, locale)}`)
    day = end + 1
  }
  return parts.join(' · ')
}

export function describePeaks(study: StudyTimes, locale: Locale = 'de') {
  const names = dayNames(locale)
  return study.peaks.map((p, i) => `${i + 1}. ${names[p.day]} ${clock(p.hour, locale)}`).join(' · ')
}
/** Six 4-hour blocks per day: the heatmap's columns (diagram-design: 3–8 columns). */
export const BLOCKS = [0, 4, 8, 12, 16, 20] as const

/** Hours one study recommends on a weekday: its windows, weekly peaks and daily top slots, without double counting. */
export function studyHours(study: StudyTimes, day: Weekday): Set<number> {
  const hours = new Set<number>()
  for (const w of study.windows) if (w.day === day) for (let h = w.from; h < w.to; h++) hours.add(h)
  for (const p of study.peaks) if (p.day === day) hours.add(p.hour)
  for (const d of study.daily) if (d.day === day) d.hours.forEach((h) => hours.add(h))
  return hours
}

/** Study-hours per day × 4-hour block, summed over all studies of a platform. */
export function blockScores(times: readonly StudyTimes[]): number[][] {
  return DAYS.map((_, dayIndex) => {
    const day = dayIndex as Weekday
    const perStudy = times.map((t) => studyHours(t, day))
    return BLOCKS.map((start) =>
      perStudy.reduce((sum, hours) => {
        let n = 0
        for (let h = start; h < start + 4; h++) if (hours.has(h)) n++
        return sum + n
      }, 0),
    )
  })
}

/** "Mo 9 Uhr · Di 9 Uhr · …": each day's top slot, for the study list. */
export function describeDaily(study: StudyTimes, locale: Locale = 'de') {
  const names = dayNames(locale)
  return study.daily
    .filter((d) => d.hours.length)
    .map((d) => `${names[d.day]} ${clock(d.hours[0]!, locale)}`)
    .join(' · ')
}

/** "Di–Do" for consecutive days, "Mo, Mi" otherwise. */
export function dayRange(days: readonly Weekday[], locale: Locale = 'de') {
  const names = dayNames(locale)
  const sorted = [...days].sort((a, b) => a - b)
  const runs: Weekday[][] = []
  for (const d of sorted) {
    const run = runs.at(-1)
    if (run && d === run.at(-1)! + 1) run.push(d)
    else runs.push([d])
  }
  return runs
    .map((run) =>
      run.length > 2
        ? `${names[run[0]!]}–${names[run.at(-1)!]}`
        : run.map((d) => names[d]).join(', '),
    )
    .join(', ')
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
export function describeCells(
  cells: readonly { day: Weekday; block: number }[],
  locale: Locale = 'de',
) {
  const byBlock = new Map<number, Weekday[]>()
  for (const c of cells) byBlock.set(c.block, [...(byBlock.get(c.block) ?? []), c.day])
  return [...byBlock.entries()]
    .sort(([a], [b]) => a - b)
    .map(([block, days]) => {
      const start = BLOCKS[block]!
      return `${dayRange(days, locale)} ${hourRanges([[start, start + 4]], locale)}`
    })
    .join(' · ')
}
