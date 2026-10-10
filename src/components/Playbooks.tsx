import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
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
  DEFAULT_PLAYBOOK,
  PLAYBOOKS,
  RESEARCHED_AT,
  citedSources,
  formatSourceDate,
  type Fact,
  type PlatformId,
  type Playbook,
  type StudyTimes,
  type Weekday,
  DAYS,
  describePeaks,
  describeWindows,
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

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const AXIS = [0, 6, 12, 18, 24]
/** Two studies at most per platform; the overlap gets the accent. */
const STUDY_CLASS = ['is-a', 'is-b'] as const

function covers(study: StudyTimes, day: Weekday, hour: number) {
  return study.windows.some((w) => w.day === day && hour >= w.from && hour < w.to)
}

/** Keeps each "Di 11–17 Uhr" together; lines only break between the parts. */
function Parts({ text, label = '' }: { text: string; label?: string }) {
  const parts = text.split(' · ')
  return (
    <span className="week-parts">
      {label}
      {parts.map((part, i) => (
        <span key={part}>
          <span className="week-part">{part}</span>
          {i < parts.length - 1 ? ' · ' : ''}
        </span>
      ))}
    </span>
  )
}

function WeekGrid({ times }: { times: readonly StudyTimes[] }) {
  const [first, second] = times
  const overlap = Boolean(first?.windows.length && second?.windows.length)
  return (
    <figure className="week-grid">
      <div className="week-grid-chart" aria-hidden="true">
        {DAYS.map((label, dayIndex) => {
          const day = dayIndex as Weekday
          return (
            <div className="week-row" key={label}>
              <span className="week-day">{label}</span>
              <div className="week-track">
                {HOURS.map((hour) => {
                  const hits = times.map((t) => covers(t, day, hour))
                  const cls =
                    hits.length === 2 && hits[0] && hits[1]
                      ? 'is-both'
                      : hits[0]
                        ? STUDY_CLASS[0]
                        : hits[1]
                          ? STUDY_CLASS[1]
                          : ''
                  return <i key={hour} className={cls} />
                })}
                {times.flatMap((t, ti) =>
                  t.peaks
                    .map((p, rank) => ({ ...p, rank }))
                    .filter((p) => p.day === day)
                    .map((p) => (
                      <b
                        key={`${ti}-${p.rank}`}
                        className={`week-peak ${STUDY_CLASS[ti]}`}
                        style={{ left: `${((p.hour + 0.5) / 24) * 100}%` }}
                      >
                        {p.rank + 1}
                      </b>
                    )),
                )}
              </div>
            </div>
          )
        })}
        <div className="week-axis">
          {AXIS.map((h) => (
            <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="week-legend">
        {times.map((t, i) => (
          <div className="week-legend-item" key={`${t.source}-${t.label}`}>
            <span
              className={`week-swatch ${STUDY_CLASS[i]} ${t.windows.length ? '' : 'is-dot'}`}
              aria-hidden="true"
            />
            <div>
              <strong>{t.label}</strong>
              {t.windows.length > 0 && <Parts text={describeWindows(t)} />}
              {t.peaks.length > 0 && <Parts label="Spitzen: " text={describePeaks(t)} />}
              {t.weak && <span className="week-weak">Schwach: {t.weak}</span>}
            </div>
          </div>
        ))}
        {overlap && (
          <div className="week-legend-item">
            <span className="week-swatch is-both" aria-hidden="true" />
            <div>
              <strong>Beide Studien</strong>
              <span>Hier stimmen die Fenster überein.</span>
            </div>
          </div>
        )}
        <p className="week-note">Uhrzeiten in der Ortszeit deines Publikums.</p>
      </figcaption>
    </figure>
  )
}

function FactList({
  title,
  facts,
  marker,
  sourceNumber,
  tone,
}: {
  title: string
  facts: readonly Fact[]
  marker: string
  sourceNumber: (id: string) => number
  tone: 'plus' | 'minus'
}) {
  if (!facts.length) return null
  return (
    <div className="playbook-list">
      <h4>{title}</h4>
      <ul>
        {facts.map((f) => (
          <li key={f.text} className={`is-${tone}`}>
            <span className="playbook-marker" aria-hidden="true">
              {marker}
            </span>
            <span>
              {f.text}
              <a className="playbook-ref" href={`#pb-src-${f.source}`}>
                <span className="sr-only">Quelle </span>
                {sourceNumber(f.source)}
              </a>
            </span>
          </li>
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
  const gapInFacts = playbook.gap && !playbook.rewards.length
  return (
    <motion.div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="playbook-panel"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="playbook-body">
        <section className="playbook-col" aria-label={`Ranking bei ${playbook.name}`}>
          <h3>Was der Algorithmus belohnt</h3>
          <FactList
            title="Belohnt"
            facts={playbook.rewards}
            marker="+"
            tone="plus"
            sourceNumber={sourceNumber}
          />
          <FactList
            title="Bremst oder zählt nicht"
            facts={playbook.limits}
            marker="−"
            tone="minus"
            sourceNumber={sourceNumber}
          />
          {gapInFacts && <p className="playbook-gap">{playbook.gap}</p>}
        </section>
        <section className="playbook-col" aria-label={`Posting-Zeiten bei ${playbook.name}`}>
          <h3>Beste Zeiten laut Studien</h3>
          {playbook.times.length > 0 && <WeekGrid times={playbook.times} />}
          {playbook.gap && !gapInFacts && <p className="playbook-gap">{playbook.gap}</p>}
        </section>
      </div>
      <ol className="playbook-sources" aria-label="Quellen">
        {sources.map((s, i) => (
          <li key={s.id} id={`pb-src-${s.id}`}>
            <span className="playbook-source-num">{i + 1}</span>
            <div>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.publisher} · {s.title}
              </a>
              <span>
                {s.kind === 'offiziell' ? 'Offizielle Dokumentation' : 'Studie'} ·{' '}
                {formatSourceDate(s.date)}
                {s.basis ? ` · ${s.basis}` : ''}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
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
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1
    if (next < 0) return
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
      <p className="playbooks-lede">
        Aus der Dokumentation der Plattformen und aus Studien mit offengelegter Methodik. Mit KI
        recherchiert, jede Aussage an der Quelle geprüft – keine Live-Daten.
      </p>
      <div className="playbook-tabs" role="tablist" aria-label="Plattform" onKeyDown={onKey}>
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
