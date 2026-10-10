import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { PLAYBOOKS, dayNames } from '../data/playbooks'
import { REGIONS } from '../config/regions'
import type { PostingPick } from '../lib/postingPlan'
import { fastZonedParts, formatOffset, formatTime, startOfNextZonedDay } from '../lib/time'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Locale, Messages } from '../i18n/locale'
import { cityName } from '../i18n/labels'
import { PLATFORM_ICONS } from './platformIcons'
import './PostingPlan.css'

const DE = {
  today: 'Heute',
  tomorrow: 'Morgen',
  eyebrow: 'Was & wann posten',
  title: 'Nächste Gelegenheit je Plattform',
  regions: (n: number) => `${n} ${n === 1 ? 'Region' : 'Regionen'} · deine Zeitzone`,
  lede: (score: number) =>
    `Erste Stunde, in der dein Publikum laut Modell aktiv ist (Score ab ${score}) und die Plattform-Studien für mindestens die Hälfte davon eine empfohlene Uhrzeit nennen – jeweils in dessen Ortszeit.`,
  empty: 'Wähle mindestens eine Region, dann erscheinen hier die Termine.',
  head: ['Plattform', 'Termin', 'Score', 'Studien decken'] as readonly string[],
  bestAvailable: 'bestes verfügbares',
  audienceShare: (share: number) => `${share} % deines Publikums`,
  jump: (name: string, when: string) => `${name}: Zeitmaschine auf ${when} stellen`,
  view: 'Ansehen',
  missing: (names: string) =>
    `Ohne Termin: ${names} – dafür gibt es keine Studie zu Posting-Zeiten.`,
}
const EN: typeof DE = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  eyebrow: 'What & when to post',
  title: 'Next opportunity per platform',
  regions: (n) => `${n} ${n === 1 ? 'region' : 'regions'} · your time zone`,
  lede: (score) =>
    `The first hour in which the model shows your audience as active (score ${score} or higher) and the platform studies recommend that time for at least half of it – each in its own local time.`,
  empty: 'Select at least one region and the times will appear here.',
  head: ['Platform', 'When', 'Score', 'Studies cover'],
  bestAvailable: 'best available',
  audienceShare: (share) => `${share}% of your audience`,
  jump: (name, when) => `${name}: set the time machine to ${when}`,
  view: 'View',
  missing: (names) => `No time slot: ${names} – no study on posting times is available.`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}
const REGION_BY_CITY = new Map(REGIONS.map((r) => [r.city, r.id]))

/** "Heute 19:00", "Morgen 09:00", "Do 14:00" – in the viewer's time zone. */
function dayLabel(at: Date, now: Date, zone: string, locale: Locale) {
  const t = M[locale]
  const tomorrow = startOfNextZonedDay(now, zone)
  const dayAfter = startOfNextZonedDay(tomorrow, zone)
  const time = formatTime(at, zone)
  if (at < tomorrow) return `${t.today} ${time}`
  if (at < dayAfter) return `${t.tomorrow} ${time}`
  const index = WEEKDAY_INDEX[fastZonedParts(at, zone).weekday]
  return `${index === undefined ? '' : dayNames(locale)[index]} ${time}`
}

export function PostingPlan({
  picks,
  now,
  regionCount,
  goodScore,
  onJump,
}: {
  picks: readonly PostingPick[]
  now: Date
  regionCount: number
  goodScore: number
  onJump: (at: Date) => void
}) {
  const reduce = useReducedMotion()
  const t = useMessages(M)
  const { locale } = useLocale()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const names = new Map(PLAYBOOKS.map((p) => [p.id, p.name]))
  const sorted = [...picks].sort((a, b) => a.at.getTime() - b.at.getTime())
  const missing = PLAYBOOKS.filter((p) => !p.times.length).map((p) => p.name)

  return (
    <section className="panel posting-plan" aria-labelledby="posting-plan-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="posting-plan-title">{t.title}</h2>
        </div>
        <span className="micro">{t.regions(regionCount)}</span>
      </div>
      <p className="pp-lede">{t.lede(goodScore)}</p>

      {sorted.length === 0 ? (
        <p className="pp-empty">{t.empty}</p>
      ) : (
        <ol className="pp-list">
          <li className="pp-head" aria-hidden="true">
            {t.head.map((label) => (
              <span key={label}>{label}</span>
            ))}
            <span />
          </li>
          {sorted.map((pick, i) => {
            const Icon = PLATFORM_ICONS[pick.platform]
            const name = names.get(pick.platform) ?? pick.platform
            const share = Math.round(pick.support * 100)
            const when = dayLabel(pick.at, now, zone, locale)
            return (
              <motion.li
                key={pick.platform}
                className="pp-row"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.48, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.06 }}
              >
                <span className="pp-platform">
                  <Icon size={18} aria-hidden="true" />
                  {name}
                </span>
                <span className="pp-when">
                  <strong>{when}</strong>
                  <small>{formatOffset(pick.at.getTime() - now.getTime(), locale)}</small>
                </span>
                <span className="pp-score">
                  <b className={pick.score >= goodScore ? 'is-good' : ''}>{pick.score}</b>
                  {pick.quality === 'bestes-verfuegbar' && <small>{t.bestAvailable}</small>}
                </span>
                <span className="pp-support">
                  <span className="pp-bar" aria-hidden="true">
                    <i style={{ width: `${share}%` }} />
                  </span>
                  <span>
                    {t.audienceShare(share)}
                    {pick.supportCities.length > 0 && (
                      <small>
                        {pick.supportCities
                          .map((city) => {
                            const id = REGION_BY_CITY.get(city)
                            return id ? cityName(id, city, locale) : city
                          })
                          .join(', ')}
                      </small>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  className="pp-jump"
                  onClick={() => {
                    track('Termin angesehen', { plattform: pick.platform })
                    onJump(pick.at)
                  }}
                  aria-label={t.jump(name, when)}
                >
                  {t.view}
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </motion.li>
            )
          })}
        </ol>
      )}
      {missing.length > 0 && <p className="pp-note">{t.missing(missing.join(', '))}</p>}
    </section>
  )
}
