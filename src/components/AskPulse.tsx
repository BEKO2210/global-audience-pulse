import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { REGION_BY_ID } from '../config/regions'
import { ASK_AUDIENCES, askPulse, type AskAudienceId } from '../lib/askPulse'
import type { ScoreGrid } from '../lib/model'
import { formatOffset, formatTime, startOfNextZonedDay, timeZoneName } from '../lib/time'
import { track, type AnalyticsEvents } from '../lib/analytics'
import { rovingKey } from '../lib/roving'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { presetName, regionName } from '../i18n/labels'
import type { LiveAnalysisPayload } from './report/types'
import { localizedReport } from './reportShared'
import { Flag } from './Flag'
import { CalendarButton } from './CalendarButton'
import { ReminderButton } from './ReminderButton'
import './AskPulse.css'

const ASK_IDS = ASK_AUDIENCES.map((audience) => audience.id)

const DE = {
  title: 'Wann poste ich für …?',
  question: (name: string) => `Wann poste ich für ${name}?`,
  questions: 'Fragen',
  postNow: 'Jetzt posten – besser wird es in den nächsten 24 Stunden nicht.',
  wait: (when: string, offset: string) => `Warte bis ${when} (${offset}).`,
  notGood: (score: number) =>
    `Kein Fenster erreicht heute Score ${score}; das ist das beste verfügbare.`,
  window: 'Bestes Fenster in 24 Stunden',
  scores: (best: number, now: number) => `Score ${best} · jetzt ${now}`,
  today: 'heute',
  tomorrow: 'morgen',
  ai: 'Lagebericht (KI)',
  view: 'Ansehen',
  viewLabel: (when: string) => `Zeitmaschine auf ${when} stellen`,
  calSummary: (name: string) => `Posten für ${name} (Global Audience Pulse)`,
  remindTitle: 'Jetzt posten',
  remindBody: (name: string) => `Das beste Fenster für ${name} beginnt.`,
  planWeek: 'Ganze Woche planen',
}
const EN: typeof DE = {
  title: 'When do I post for …?',
  question: (name) => `When do I post for ${name}?`,
  questions: 'Questions',
  postNow: 'Post now – it won’t get better in the next 24 hours.',
  wait: (when, offset) => `Wait until ${when} (${offset}).`,
  notGood: (score) => `No window reaches score ${score} today; this is the best available.`,
  window: 'Best window in 24 hours',
  scores: (best, now) => `Score ${best} · now ${now}`,
  today: 'today',
  tomorrow: 'tomorrow',
  ai: 'Briefing (AI)',
  view: 'Show in chart',
  viewLabel: (when) => `Set the time machine to ${when}`,
  calSummary: (name) => `Post for ${name} (Global Audience Pulse)`,
  remindTitle: 'Post now',
  remindBody: (name) => `The best window for ${name} starts now.`,
  planWeek: 'Plan the whole week',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

type AnalyticsAudience = AnalyticsEvents['Frage']['zielgruppe']

const AUDIENCE_EN: Record<string, string> = { 'DACH & Europa': 'DACH & Europe', USA: 'the US' }
const AUDIENCE_CHIP_EN: Record<string, string> = { USA: 'US' }

/** T-016: pick an audience, get the best window of the next 24 hours – live, plus the briefing's verdict. */
export function AskPulse({
  grid,
  now,
  report,
  goodScore,
  onJump,
}: {
  grid: ScoreGrid
  now: Date
  report: LiveAnalysisPayload | null | undefined
  goodScore: number
  onJump: (at: Date) => void
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const reduce = useReducedMotion()
  const [active, setActive] = useState<AskAudienceId>('global')
  const choose = (id: AskAudienceId) => {
    setActive(id)
    track('Frage', { zielgruppe: id as AnalyticsAudience })
  }
  const audience = ASK_AUDIENCES.find((a) => a.id === active) ?? ASK_AUDIENCES[0]
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const answer = useMemo(
    () => askPulse((d) => grid.globalAt(audience.ids, d), now),
    [grid, audience, now],
  )
  const label = (name: string) =>
    locale === 'en' ? (AUDIENCE_EN[name] ?? presetName(name, locale)) : name
  const verdict = report
    ? localizedReport(report, locale).report.zielgruppen?.find((z) => z.name === audience.name)
        ?.urteil
    : undefined
  const best = answer.best
  const dayWord = (at: Date) => (at < startOfNextZonedDay(now, zone) ? t.today : t.tomorrow)
  const when = best
    ? locale === 'en'
      ? `${formatTime(best.start, zone)} ${dayWord(best.start)}`
      : `${dayWord(best.start)} ${formatTime(best.start, zone)}`
    : ''

  return (
    <section className="panel ask-pulse" aria-labelledby="ask-title">
      <div className="section-head">
        <h2 id="ask-title">{t.title}</h2>
      </div>
      <div
        className="ap-questions"
        role="radiogroup"
        aria-label={t.questions}
        onKeyDown={(event) => rovingKey(event, ASK_IDS, active, choose)}
      >
        {ASK_AUDIENCES.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={a.id === active}
            tabIndex={a.id === active ? 0 : -1}
            className="ap-question"
            aria-label={t.question(label(a.name))}
            onClick={() => choose(a.id)}
          >
            {locale === 'en' ? (AUDIENCE_CHIP_EN[a.name] ?? label(a.name)) : a.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          className="ap-answer"
          aria-live="polite"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="ap-window">
            <span className="ap-label">{t.window}</span>
            {best ? (
              <strong>
                {formatTime(best.start, zone)}–{formatTime(best.end, zone)}{' '}
                <small>{timeZoneName(best.start, undefined, intl)}</small>
              </strong>
            ) : (
              <strong>—</strong>
            )}
            <span className="ap-scores">
              {t.scores(Math.round(best?.score ?? answer.nowScore), answer.nowScore)}
            </span>
          </div>
          <div className="ap-text">
            <p className="ap-verdict">
              {answer.postNow || !best
                ? t.postNow
                : t.wait(when, formatOffset(best.start.getTime() - now.getTime(), locale))}
              {!answer.good && <> {t.notGood(goodScore)}</>}
            </p>
            <p className="ap-regions">
              {audience.ids.map((id) => (
                <span key={id}>
                  <Flag code={REGION_BY_ID[id].flag} label="" size={16} />
                  {regionName(id, locale)}
                </span>
              ))}
            </p>
            {verdict && (
              <p className="ap-ai">
                <span>{t.ai}:</span> <q>{verdict}</q>
              </p>
            )}
            {best && (
              <div className="ap-actions">
                <CalendarButton
                  start={best.start}
                  end={best.end}
                  summary={t.calSummary(label(audience.name))}
                  detail={`Score ${Math.round(best.score)}`}
                  ort="frage"
                />
                {!answer.postNow && (
                  <ReminderButton
                    at={best.start}
                    title={t.remindTitle}
                    body={t.remindBody(label(audience.name))}
                    ort="frage"
                  />
                )}
              </div>
            )}
            {/* second row: the two quiet actions together, never one orphaned word under the buttons */}
            <div className="ap-links">
              {best && !answer.postNow && (
                <button
                  type="button"
                  className="pp-jump ap-jump"
                  onClick={() => onJump(best.start)}
                  aria-label={t.viewLabel(when)}
                >
                  {t.view}
                </button>
              )}
              <a
                className="week-link ap-week"
                href="#planer"
                onClick={() => track('Woche planen', { ort: 'frage' })}
              >
                {t.planWeek}
              </a>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
