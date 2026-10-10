import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { PLAYBOOKS } from '../data/playbooks'
import type { PostingPick } from '../lib/postingPlan'
import { fastZonedParts, formatOffset, formatTime, startOfNextZonedDay } from '../lib/time'
import { track } from '../lib/analytics'
import { PLATFORM_ICONS } from './platformIcons'
import './PostingPlan.css'

const WEEKDAY_DE: Record<string, string> = {
  Mon: 'Mo',
  Tue: 'Di',
  Wed: 'Mi',
  Thu: 'Do',
  Fri: 'Fr',
  Sat: 'Sa',
  Sun: 'So',
}

/** "Heute 19:00", "Morgen 09:00", "Do 14:00" – in the viewer's time zone. */
function dayLabel(at: Date, now: Date, zone: string) {
  const tomorrow = startOfNextZonedDay(now, zone)
  const dayAfter = startOfNextZonedDay(tomorrow, zone)
  const time = formatTime(at, zone)
  if (at < tomorrow) return `Heute ${time}`
  if (at < dayAfter) return `Morgen ${time}`
  return `${WEEKDAY_DE[fastZonedParts(at, zone).weekday] ?? ''} ${time}`
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
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const names = new Map(PLAYBOOKS.map((p) => [p.id, p.name]))
  const sorted = [...picks].sort((a, b) => a.at.getTime() - b.at.getTime())
  const missing = PLAYBOOKS.filter((p) => !p.times.length).map((p) => p.name)

  return (
    <section className="panel posting-plan" aria-labelledby="posting-plan-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Was & wann posten</p>
          <h2 id="posting-plan-title">Nächste Gelegenheit je Plattform</h2>
        </div>
        <span className="micro">
          {regionCount} {regionCount === 1 ? 'Region' : 'Regionen'} · deine Zeitzone
        </span>
      </div>
      <p className="pp-lede">
        Erste Stunde, in der dein Publikum laut Modell aktiv ist (Score ab {goodScore}) und die
        Plattform-Studien für mindestens die Hälfte davon eine empfohlene Uhrzeit nennen – jeweils
        in dessen Ortszeit.
      </p>

      {sorted.length === 0 ? (
        <p className="pp-empty">Wähle mindestens eine Region, dann erscheinen hier die Termine.</p>
      ) : (
        <ol className="pp-list">
          <li className="pp-head" aria-hidden="true">
            <span>Plattform</span>
            <span>Termin</span>
            <span>Score</span>
            <span>Studien decken</span>
            <span />
          </li>
          {sorted.map((pick, i) => {
            const Icon = PLATFORM_ICONS[pick.platform]
            const name = names.get(pick.platform) ?? pick.platform
            const share = Math.round(pick.support * 100)
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
                  <strong>{dayLabel(pick.at, now, zone)}</strong>
                  <small>{formatOffset(pick.at.getTime() - now.getTime())}</small>
                </span>
                <span className="pp-score">
                  <b className={pick.score >= goodScore ? 'is-good' : ''}>{pick.score}</b>
                  {pick.quality === 'bestes-verfuegbar' && <small>bestes verfügbares</small>}
                </span>
                <span className="pp-support">
                  <span className="pp-bar" aria-hidden="true">
                    <i style={{ width: `${share}%` }} />
                  </span>
                  <span>
                    {share} % deines Publikums
                    {pick.supportCities.length > 0 && (
                      <small>{pick.supportCities.join(', ')}</small>
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
                  aria-label={`${name}: Zeitmaschine auf ${dayLabel(pick.at, now, zone)} stellen`}
                >
                  Ansehen
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </motion.li>
            )
          })}
        </ol>
      )}
      {missing.length > 0 && (
        <p className="pp-note">
          Ohne Termin: {missing.join(', ')} – dafür gibt es keine Studie zu Posting-Zeiten.
        </p>
      )}
    </section>
  )
}
