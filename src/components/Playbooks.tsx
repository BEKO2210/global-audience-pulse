import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useMyPlatforms } from '../hooks/useMyPlatforms'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { PLATFORM_ICONS as ICONS } from './platformIcons'
import {
  BLOCKS,
  DEFAULT_PLAYBOOK,
  PLAYBOOKS,
  RESEARCHED_AT,
  SOURCE_BY_ID,
  blockScores,
  citedSources,
  dayNames,
  describeCells,
  describeDaily,
  describePeaks,
  describeWindows,
  formatSourceDate,
  strongestCells,
  tr,
  type Fact,
  type PlatformId,
  type Playbook,
  type StudyTimes,
} from '../data/playbooks'
import { track } from '../lib/analytics'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import './Playbooks.css'

const DE = {
  strongest: 'Am stärksten:',
  heatLabel: (name: string, strongest: string) =>
    `Empfohlene Stunden bei ${name} je Wochentag und 4-Stunden-Block, summiert über die Studien. Am stärksten: ${strongest}.`,
  moreHours: 'mehr empfohlene Stunden',
  optimal: 'Optimal',
  localTime: 'Ortszeit deiner Zielgruppe',
  bestPerDay: 'Beste Zeit je Tag',
  bestOfWeek: 'Beste Zeiten der Woche',
  rank: 'Platz ',
  weak: 'Schwach:',
  source: 'Quelle ',
  rankingOn: (name: string) => `Ranking bei ${name}`,
  ranking: 'Ranking',
  rewards: 'Belohnt',
  limits: 'Bremst oder zählt nicht',
  timesOn: (name: string) => `Posting-Zeiten bei ${name}`,
  bestTimes: 'Beste Zeiten',
  per: 'laut',
  and: ' und ',
  studyDetails: 'Zeiten der Studien im Detail',
  sources: 'Quellen',
  official: 'Offizielle Dokumentation',
  study: 'Studie',
  title: 'Was die Algorithmen belohnen',
  asOf: (date: string) => `Stand ${date}`,
  lede: 'Aus der Dokumentation der Plattformen und aus Studien mit offengelegter Methodik. Mit KI recherchiert, jede Aussage an der Quelle geprüft – keine Live-Daten.',
  platform: 'Plattform',
}
const EN: typeof DE = {
  strongest: 'Strongest:',
  heatLabel: (name, strongest) =>
    `Recommended hours on ${name} per weekday and 4-hour block, summed across the studies. Strongest: ${strongest}.`,
  moreHours: 'more recommended hours',
  optimal: 'Optimal',
  localTime: 'Your audience’s local time',
  bestPerDay: 'Best time per day',
  bestOfWeek: 'Best times of the week',
  rank: 'Rank ',
  weak: 'Weak:',
  source: 'Source ',
  rankingOn: (name) => `Ranking on ${name}`,
  ranking: 'Ranking',
  rewards: 'Rewards',
  limits: 'Holds back or doesn’t count',
  timesOn: (name) => `Posting times on ${name}`,
  bestTimes: 'Best times',
  per: 'according to',
  and: ' and ',
  studyDetails: 'Study times in detail',
  sources: 'Sources',
  official: 'Official documentation',
  study: 'Study',
  title: 'What the algorithms reward',
  asOf: (date) => `As of ${date}`,
  lede: 'From the platforms’ own documentation and from studies with a published methodology. Researched with AI, every statement checked against its source – no live data.',
  platform: 'Platform',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

// diagram-design motion clock: one reveal, ≤ 8 steps, ≤ 8 px travel, no springs.
const EASE = [0.2, 0.8, 0.2, 1] as const
const STEP = 0.06
const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: STEP } },
}
const rowReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.48, ease: EASE } },
}
const reveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: (step: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: EASE, delay: step * STEP },
  }),
}

/** Ink ramp per diagram-design heatmap: ≥ 0.07 for the weakest recommended cell, ≤ 0.65 below the focal accent. */
function rampOpacity(value: number, maxNonFocal: number) {
  if (!value) return 0
  return Math.max(0.07, (value / Math.max(1, maxNonFocal)) * 0.65)
}

function Heatmap({ times, name }: { times: readonly StudyTimes[]; name: string }) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const scores = blockScores(times)
  const strongest = strongestCells(scores)
  const isFocal = (day: number, block: number) =>
    strongest.some((c) => c.day === day && c.block === block)
  const maxNonFocal = Math.max(
    0,
    ...scores.flatMap((row, day) => row.filter((_, block) => !isFocal(day, block))),
  )
  const strongestText = describeCells(strongest, locale)

  return (
    <figure className="pb-heat">
      {strongest.length > 0 && (
        <p className="pb-heat-headline">
          <span className="pb-ramp-focal" aria-hidden="true" />
          <span>
            {t.strongest} <strong>{strongestText}</strong>
          </span>
        </p>
      )}
      <motion.div
        className="pb-heat-grid"
        variants={stagger}
        initial={false}
        animate="shown"
        role="img"
        aria-label={t.heatLabel(name, strongestText)}
      >
        <span className="pb-heat-corner" aria-hidden="true" />
        {BLOCKS.map((start) => (
          <span key={start} className="pb-heat-col" aria-hidden="true">
            {String(start).padStart(2, '0')}
          </span>
        ))}
        {dayNames(locale).map((label, day) => (
          <motion.div key={label} className="pb-heat-row" variants={rowReveal} aria-hidden="true">
            <span className="pb-heat-day">{label}</span>
            {BLOCKS.map((start, block) => {
              const value = scores[day]![block]!
              const focal = isFocal(day, block)
              return (
                <span
                  key={start}
                  className={`pb-heat-cell${focal ? ' is-focal' : ''}`}
                  data-row={label}
                  data-col={start}
                  data-value={value}
                  data-focal={focal || undefined}
                  style={
                    focal
                      ? undefined
                      : { ['--fill' as string]: String(rampOpacity(value, maxNonFocal)) }
                  }
                />
              )
            })}
          </motion.div>
        ))}
      </motion.div>
      <figcaption className="pb-heat-legend">
        <span className="pb-legend-item">
          <span className="pb-ramp" aria-hidden="true">
            {[0.12, 0.3, 0.48, 0.65].map((o) => (
              <i key={o} style={{ ['--fill' as string]: String(o) }} />
            ))}
          </span>
          {t.moreHours}
        </span>
        <span className="pb-legend-item">
          <span className="pb-ramp-focal" aria-hidden="true" />
          {t.optimal}
        </span>
        <span className="pb-legend-item">{t.localTime}</span>
      </figcaption>
    </figure>
  )
}

function StudyList({ times }: { times: readonly StudyTimes[] }) {
  const t = useMessages(M)
  const { locale } = useLocale()
  return (
    <dl className="pb-studies">
      {times.map((study) => {
        const source = SOURCE_BY_ID.get(study.source)!
        const label = tr(study.label, locale)
        return (
          <div key={`${study.source}-${label}`} className="pb-study">
            <dt>
              <strong>{label}</strong>
              <span>{formatSourceDate(source.date, locale)}</span>
            </dt>
            <dd>
              {study.windows.length > 0 && (
                <span className="pb-chips">
                  {describeWindows(study, locale)
                    .split(' · ')
                    .map((part) => (
                      <span key={part} className="pb-chip">
                        {part}
                      </span>
                    ))}
                </span>
              )}
              {study.daily.length > 0 && (
                <span className="pb-chips" aria-label={t.bestPerDay}>
                  {describeDaily(study, locale)
                    .split(' · ')
                    .map((part) => (
                      <span key={part} className="pb-chip is-daily">
                        {part}
                      </span>
                    ))}
                </span>
              )}
              {study.peaks.length > 0 && (
                <span className="pb-chips" aria-label={t.bestOfWeek}>
                  {describePeaks(study, locale)
                    .split(' · ')
                    .map((peak) => {
                      const [rank = '', ...rest] = peak.split(' ')
                      const place = rank.replace('.', '')
                      return (
                        <span key={peak} className="pb-chip is-peak">
                          <b>
                            <span className="sr-only">{t.rank}</span>
                            {place}
                          </b>
                          {rest.join(' ')}
                        </span>
                      )
                    })}
                </span>
              )}
              {study.weak && (
                <span className="pb-weak">
                  {t.weak} {study.weak[locale]}
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function FactList({
  title,
  facts,
  tone,
  sourceNumber,
  offset,
}: {
  title: string
  facts: readonly Fact[]
  tone: 'plus' | 'minus'
  sourceNumber: (id: string) => number
  offset: number
}) {
  const reduce = useReducedMotion()
  const t = useMessages(M)
  const { locale } = useLocale()
  if (!facts.length) return null
  return (
    <div className={`pb-list is-${tone}`}>
      <h4>
        <span className="pb-list-mark" aria-hidden="true">
          {tone === 'plus' ? '+' : '−'}
        </span>
        {title}
      </h4>
      <ul>
        {facts.map((f, i) => (
          <motion.li
            key={f.text.de}
            variants={reveal}
            custom={offset + i}
            initial={reduce ? false : 'hidden'}
            animate="shown"
          >
            <strong>{f.lead[locale]}</strong>
            <p>
              {f.text[locale]}
              <a className="pb-ref" href={`#pb-src-${f.source}`}>
                <span className="sr-only">{t.source}</span>
                {sourceNumber(f.source)}
              </a>
            </p>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function Panel({
  playbook,
  tabId,
  panelId,
}: {
  playbook: Playbook
  tabId: string
  panelId: string
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const sources = citedSources(playbook)
  const sourceNumber = (id: string) => sources.findIndex((s) => s.id === id) + 1
  const gapInFacts = Boolean(playbook.gap && !playbook.rewards.length)
  return (
    <div id={panelId} role="tabpanel" aria-labelledby={tabId} className="pb-panel">
      <div className="pb-body">
        <section className="pb-col" aria-label={t.rankingOn(playbook.name)}>
          <h3>{t.ranking}</h3>
          <FactList
            title={t.rewards}
            facts={playbook.rewards}
            tone="plus"
            sourceNumber={sourceNumber}
            offset={0}
          />
          <FactList
            title={t.limits}
            facts={playbook.limits}
            tone="minus"
            sourceNumber={sourceNumber}
            offset={playbook.rewards.length}
          />
          {gapInFacts && <p className="pb-gap">{playbook.gap?.[locale]}</p>}
        </section>
        <section className="pb-col" aria-label={t.timesOn(playbook.name)}>
          <h3>
            {t.bestTimes}
            {playbook.times.length > 0 && (
              <small>
                {t.per}{' '}
                {[
                  ...new Set(
                    playbook.times.map((study) => SOURCE_BY_ID.get(study.source)!.publisher),
                  ),
                ].join(t.and)}
              </small>
            )}
          </h3>
          {playbook.times.length > 0 && (
            <>
              <Heatmap times={playbook.times} name={playbook.name} />
              <details className="pb-details">
                <summary>{t.studyDetails}</summary>
                <StudyList times={playbook.times} />
              </details>
            </>
          )}
          {playbook.gap && !gapInFacts && <p className="pb-gap">{playbook.gap[locale]}</p>}
        </section>
      </div>
      <ol className="pb-sources" aria-label={t.sources}>
        {sources.map((s, i) => (
          <li key={s.id} id={`pb-src-${s.id}`}>
            <span className="pb-source-num">{i + 1}</span>
            <div>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {tr(s.title, locale)}
              </a>
              <span>{s.publisher}</span>
              <span>
                {s.kind === 'offiziell' ? t.official : t.study} · {formatSourceDate(s.date, locale)}
              </span>
              {s.basis && <span>{tr(s.basis, locale)}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Playbooks() {
  const t = useMessages(M)
  const { locale } = useLocale()
  const mine = useMyPlatforms()
  // Opens on one of "my platforms" (T-073) when the default is not among them.
  const [active, setActive] = useState<PlatformId>(() =>
    mine.length && !mine.includes(DEFAULT_PLAYBOOK.id) ? mine[0]! : DEFAULT_PLAYBOOK.id,
  )
  const tabs = useRef<Partial<Record<PlatformId, HTMLButtonElement | null>>>({})
  const base = useId()
  const playbook = PLAYBOOKS.find((p) => p.id === active) ?? DEFAULT_PLAYBOOK
  const tabId = (id: PlatformId) => `${base}-tab-${id}`
  const panelId = `${base}-panel`

  const choose = (id: PlatformId, focus = false) => {
    setActive(id)
    track('Playbook', { plattform: id })
    if (focus) tabs.current[id]?.focus()
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = PLAYBOOKS.findIndex((p) => p.id === active)
    const last = PLAYBOOKS.length - 1
    const keys: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }
    const next = keys[event.key]
    if (next === undefined) return
    event.preventDefault()
    choose(PLAYBOOKS[next]!.id, true)
  }

  return (
    <section className="panel playbooks" aria-labelledby="playbooks-title">
      <div className="section-head">
        <h2 id="playbooks-title">{t.title}</h2>
        <span className="micro">{t.asOf(formatSourceDate(RESEARCHED_AT, locale))}</span>
      </div>
      <p className="pb-lede">{t.lede}</p>
      <div className="pb-tabs" role="tablist" aria-label={t.platform} onKeyDown={onKey}>
        {PLAYBOOKS.map((p) => {
          const PlatformIcon = ICONS[p.id]
          const selected = p.id === active
          return (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[p.id] = el
              }}
              id={tabId(p.id)}
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(p.id)}
            >
              {selected && (
                <motion.span
                  className="pb-tab-active"
                  layoutId={`${base}-active`}
                  transition={{ duration: 0.32, ease: EASE }}
                  aria-hidden="true"
                />
              )}
              <PlatformIcon size={18} weight={selected ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{p.name}</span>
            </button>
          )
        })}
      </div>
      <Panel key={playbook.id} playbook={playbook} tabId={tabId(playbook.id)} panelId={panelId} />
    </section>
  )
}
