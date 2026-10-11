import { useState, type CSSProperties } from 'react'
import { beatSeconds } from '../lib/beat'
import { useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import './LogoMark.css'

const MERIDIANS = [0, 1, 2]

const DE = { home: 'Global Audience Pulse Start' }
const EN: typeof DE = { home: 'Global Audience Pulse home' }
const M: Messages<typeof DE> = { de: DE, en: EN }

/**
 * Keep in sync with the static copy in index.html (first paint before React). Size comes from CSS
 * (--logo-size); intro timings subtract --elapsed so React continues the shell's animation seamlessly.
 *
 * The globe-and-pulse mark, inline so it can move: drawn once on load, then the meridians turn like a sphere
 * (cosine sweep, 60° apart) and a light point runs along the pulse line at the live score's beat.
 * prefers-reduced-motion shows the static mark.
 */
export function LogoMark({ score, intro = true }: { score?: number; intro?: boolean }) {
  const style = { '--beat': `${beatSeconds(score).toFixed(1)}s` } as CSSProperties
  return (
    <svg
      className={`logo-mark${intro ? ' has-intro' : ''}`}
      viewBox="0 0 64 64"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <rect className="logo-tile" width="64" height="64" rx="14" />
      <g className="logo-lines" fill="none">
        <circle className="logo-draw" cx="32" cy="32" r="20" strokeWidth="3" pathLength={1} />
        <g className="logo-meridians">
          {MERIDIANS.map((i) => (
            <ellipse
              key={i}
              className="logo-meridian"
              style={{ '--i': i } as CSSProperties}
              cx="32"
              cy="32"
              rx="20"
              ry="20"
            />
          ))}
        </g>
        <path className="logo-draw logo-equator" d="M13 32h38" strokeWidth="2" pathLength={1} />
      </g>
      <path
        className="logo-draw logo-pulse"
        d="M7 35h13l5-10 7 18 6-13 4 5h15"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <path
        className="logo-beat"
        d="M7 35h13l5-10 7 18 6-13 4 5h15"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
      />
    </svg>
  )
}

/** Logo + name. `--elapsed` is the time since navigation start, so the intro picks up where the static
 * first-paint copy in index.html already is instead of restarting when React mounts. */
export function Wordmark({
  score,
  intro = true,
  className = '',
}: {
  score?: number
  intro?: boolean
  className?: string
}) {
  const t = useMessages(M)
  const [elapsed] = useState(() => Math.round(performance.now()))
  return (
    <a
      className={`wordmark ${className}`.trim()}
      href="#top"
      aria-label={t.home}
      style={{ '--elapsed': `${elapsed}ms` } as CSSProperties}
    >
      <LogoMark score={score} intro={intro} />
      <span className={`wordmark-text${intro ? ' has-intro' : ''}`}>
        <span className="wm-word" style={{ '--w': 0 } as CSSProperties}>
          Global
        </span>{' '}
        <span className="wm-word" style={{ '--w': 1 } as CSSProperties}>
          Audience
        </span>{' '}
        <span className="wm-word" style={{ '--w': 2 } as CSSProperties}>
          Pulse
        </span>
      </span>
    </a>
  )
}
