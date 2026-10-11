// T-010: fixed topic areas for "what people read" – the model may only pick from these, so it cannot name
// people or invent causes. Shared by the hourly job (German ids) and the page (both languages).
export const TOPICS = {
  sport: { de: 'Sport', en: 'Sport' },
  politik: { de: 'Politik', en: 'Politics' },
  unterhaltung: { de: 'Film & TV', en: 'Film & TV' },
  musik: { de: 'Musik', en: 'Music' },
  wissenschaft: { de: 'Wissenschaft & Technik', en: 'Science & tech' },
  wirtschaft: { de: 'Wirtschaft', en: 'Business' },
  geschichte: { de: 'Geschichte', en: 'History' },
  gesellschaft: { de: 'Gesellschaft', en: 'Society' },
  religion: { de: 'Religion & Feiertage', en: 'Religion & holidays' },
  natur: { de: 'Natur & Wetter', en: 'Nature & weather' },
  sonstiges: { de: 'Sonstiges', en: 'Other' },
} as const

export type TopicId = keyof typeof TOPICS
export const TOPIC_IDS = Object.keys(TOPICS) as TopicId[]
