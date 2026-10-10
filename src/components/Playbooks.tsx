import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import {
  InstagramLogo,
  LinkedinLogo,
  Newspaper,
  ThreadsLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
  type Icon,
} from '@phosphor-icons/react'
import {
  BLOCKS,
  DAYS,
  DEFAULT_PLAYBOOK,
  PLAYBOOKS,
  RESEARCHED_AT,
  SOURCE_BY_ID,
  blockScores,
  citedSources,
  describeCells,
  describePeaks,
  describeWindows,
  formatSourceDate,
  strongestCells,
  type Fact,
  type PlatformId,
  type Playbook,
  type StudyTimes,
} from '../data/playbooks'
import { track } from '../lib/analytics'
import './Playbooks.css'

const ICONS: Record<PlatformId, Icon> = {
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  linkedin: LinkedinLogo,
  x: XLogo,
  threads: ThreadsLogo,
  hackernews: Newspaper,
}

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
  // Own variants override MotionConfig, so reduced motion is honoured here explicitly.
  const reduce = useReducedMotion()
  const scores = blockScores(times)
  const strongest = strongestCells(scores)
  const isFocal = (day: number, block: number) =>
    strongest.some((c) => c.day === day && c.block === block)
  const maxNonFocal = Math.max(
    0,
    ...scores.flatMap((row, day) => row.filter((_, block) => !isFocal(day, block))),
  )
  const strongestText = describeCells(strongest)

  return (
    <figure className="pb-heat">
      {strongest.length > 0 && (
        <p className="pb-heat-headline">
          <span>Am stärksten</span>
          <strong>
            {strongestText.split(' · ').map((group) => (
              <span key={group}>{group}</span>
            ))}
          </strong>
        </p>
      )}
      <motion.div
        className="pb-heat-grid"
        variants={stagger}
        initial={reduce ? false : 'hidden'}
        whileInView="shown"
        viewport={{ once: true, amount: 0.2 }}
        role="img"
        aria-label={`Empfohlene Zeiten bei ${name} nach Wochentag und Tageszeit. Am stärksten: ${strongestText}.`}
      >
        <span className="pb-heat-corner" aria-hidden="true" />
        {BLOCKS.map((start) => (
          <span key={start} className="pb-heat-col" aria-hidden="true">
            {String(start).padStart(2, '0')}
          </span>
        ))}
        {DAYS.map((label, day) => (
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
          weniger → mehr Studien-Stunden
        </span>
        <span className="pb-legend-item">
          <span className="pb-ramp-focal" aria-hidden="true" />
          stärkstes Fenster
        </span>
      </figcaption>
      <p className="pb-heat-note">
        Wert je Feld: Stunden, die die Studien in diesem 4-Stunden-Block empfehlen; jede Spitzenzeit
        zählt als eine Stunde. Uhrzeiten in der Ortszeit deines Publikums.
      </p>
    </figure>
  )
}

function StudyList({ times }: { times: readonly StudyTimes[] }) {
  return (
    <dl className="pb-studies">
      {times.map((t) => {
        const source = SOURCE_BY_ID.get(t.source)!
        return (
          <div key={`${t.source}-${t.label}`} className="pb-study">
            <dt>
              <strong>{t.label}</strong>
              <span>{formatSourceDate(source.date)}</span>
            </dt>
            <dd>
              {t.windows.length > 0 && (
                <span className="pb-chips">
                  {describeWindows(t)
                    .split(' · ')
                    .map((part) => (
                      <span key={part} className="pb-chip">
                        {part}
                      </span>
                    ))}
                </span>
              )}
              {t.peaks.length > 0 && (
                <span className="pb-chips">
                  {describePeaks(t)
                    .split(' · ')
                    .map((peak) => {
                      const [rank = '', ...rest] = peak.split(' ')
                      const place = rank.replace('.', '')
                      return (
                        <span key={peak} className="pb-chip is-peak">
                          <b>
                            <span className="sr-only">Platz </span>
                            {place}
                          </b>
                          {rest.join(' ')}
                        </span>
                      )
                    })}
                </span>
              )}
              {t.weak && <span className="pb-weak">Schwach: {t.weak}</span>}
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
            key={f.text}
            variants={reveal}
            custom={offset + i}
            initial={reduce ? false : 'hidden'}
            animate="shown"
          >
            <strong>{f.lead}</strong>
            <p>
              {f.text}
              <a className="pb-ref" href={`#pb-src-${f.source}`}>
                <span className="sr-only">Quelle </span>
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
  const sources = citedSources(playbook)
  const sourceNumber = (id: string) => sources.findIndex((s) => s.id === id) + 1
  const gapInFacts = Boolean(playbook.gap && !playbook.rewards.length)
  return (
    <div id={panelId} role="tabpanel" aria-labelledby={tabId} className="pb-panel">
      <div className="pb-body">
        <section className="pb-col" aria-label={`Ranking bei ${playbook.name}`}>
          <h3>Was der Algorithmus belohnt</h3>
          <FactList
            title="Belohnt"
            facts={playbook.rewards}
            tone="plus"
            sourceNumber={sourceNumber}
            offset={0}
          />
          <FactList
            title="Bremst oder zählt nicht"
            facts={playbook.limits}
            tone="minus"
            sourceNumber={sourceNumber}
            offset={playbook.rewards.length}
          />
          {gapInFacts && <p className="pb-gap">{playbook.gap}</p>}
        </section>
        <section className="pb-col" aria-label={`Posting-Zeiten bei ${playbook.name}`}>
          <h3>Beste Zeiten laut Studien</h3>
          {playbook.times.length > 0 && (
            <>
              <Heatmap times={playbook.times} name={playbook.name} />
              <StudyList times={playbook.times} />
            </>
          )}
          {playbook.gap && !gapInFacts && <p className="pb-gap">{playbook.gap}</p>}
        </section>
      </div>
      <ol className="pb-sources" aria-label="Quellen">
        {sources.map((s, i) => (
          <li key={s.id} id={`pb-src-${s.id}`}>
            <span className="pb-source-num">{i + 1}</span>
            <div>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
              <span>
                {s.publisher} · {s.kind === 'offiziell' ? 'Offizielle Dokumentation' : 'Studie'} ·{' '}
                {formatSourceDate(s.date)}
              </span>
              {s.basis && <span>{s.basis}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Playbooks() {
  const [active, setActive] = useState<PlatformId>(DEFAULT_PLAYBOOK.id)
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
        <div>
          <p className="eyebrow">Plattform-Playbooks</p>
          <h2 id="playbooks-title">Was die Algorithmen belohnen</h2>
        </div>
        <span className="micro">Stand {formatSourceDate(RESEARCHED_AT)}</span>
      </div>
      <p className="pb-lede">
        Aus der Dokumentation der Plattformen und aus Studien mit offengelegter Methodik. Mit KI
        recherchiert, jede Aussage an der Quelle geprüft – keine Live-Daten.
      </p>
      <div className="pb-tabs" role="tablist" aria-label="Plattform" onKeyDown={onKey}>
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
