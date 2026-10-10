import { useId } from 'react'
import { motion } from 'motion/react'
import { REGIONS, type RegionId } from '../config/regions'
import { Flag } from './Flag'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { cityName } from '../i18n/labels'
import './WeightingToggle.css'

type Mode = 'value' | 'reach'

const MODES: Mode[] = ['value', 'reach']

const DE = {
  options: {
    value: {
      title: 'Werbewert',
      sub: 'Internetnutzer × BIP pro Kopf – nach Kaufkraft gewichtet',
    },
    reach: {
      title: 'Reichweite',
      sub: 'Internetnutzer – nach erreichbaren Menschen gewichtet',
    },
  } as Record<Mode, { title: string; sub: string }>,
  label: 'Gewichtung der Regionen',
  leads: (city: string, percent: number) => `${city} führt mit ${percent} %`,
}
const EN: typeof DE = {
  options: {
    value: {
      title: 'Ad value',
      sub: 'Internet users × GDP per capita – weighted by purchasing power',
    },
    reach: {
      title: 'Reach',
      sub: 'Internet users – weighted by people reachable',
    },
  },
  label: 'Region weighting',
  leads: (city, percent) => `${city} leads with ${percent}%`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

/** Region weighting as two equal, self-explaining options; each shows which market leads under it. */
export function WeightingToggle({
  mode,
  weights,
  onChange,
}: {
  mode: Mode
  weights: Record<Mode, Record<RegionId, number>>
  onChange: (mode: Mode) => void
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const base = useId()
  return (
    <div className="wt" role="group" aria-labelledby={`${base}-label`}>
      <span className="wt-label" id={`${base}-label`}>
        {t.label}
      </span>
      <div className="wt-options">
        {MODES.map((optionMode) => {
          const option = { mode: optionMode, ...t.options[optionMode] }
          const active = option.mode === mode
          const [leaderId, leaderShare] = Object.entries(weights[option.mode]).sort(
            (a, b) => b[1] - a[1],
          )[0] ?? ['', 0]
          const leader = REGIONS.find((r) => r.id === leaderId)
          const percent = Math.round(leaderShare * 100)
          return (
            <button
              key={option.mode}
              type="button"
              className="wt-option"
              aria-pressed={active}
              onClick={() => onChange(option.mode)}
            >
              {active && (
                <motion.span
                  className="wt-active"
                  layoutId={`${base}-active`}
                  transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                  aria-hidden="true"
                />
              )}
              <span className="wt-head">
                <span className="wt-radio" aria-hidden="true" />
                <strong>{option.title}</strong>
              </span>
              <span className="wt-sub">{option.sub}</span>
              {leader && (
                <span className="wt-leader">
                  <span className="wt-leader-name">
                    <Flag code={leader.flag} label="" size={16} />
                    {t.leads(cityName(leader.id, leader.city, locale), percent)}
                  </span>
                  <span className="wt-bar" aria-hidden="true">
                    <i style={{ width: `${percent}%` }} />
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
