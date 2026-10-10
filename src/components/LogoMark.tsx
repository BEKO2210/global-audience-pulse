import type { CSSProperties } from 'react'
import { beatSeconds } from '../lib/beat'
import './LogoMark.css'

const MERIDIANS = [0, 1, 2]

/**
 * The globe-and-pulse mark, inline so it can move: drawn once on load, then the meridians turn like a sphere
 * (cosine sweep, 60° apart) and a light point runs along the pulse line at the live score's beat.
 * prefers-reduced-motion shows the static mark.
 */
export function LogoMark({
  size = 32,
  score,
  intro = true,
}: {
  size?: number
  score?: number
  intro?: boolean
}) {
  const style = { '--beat': `${beatSeconds(score).toFixed(1)}s` } as CSSProperties
  return (
    <svg
      className={`logo-mark${intro ? ' has-intro' : ''}`}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#11110f" />
      <g fill="none" stroke="#f3efe6">
        <circle className="logo-draw" cx="32" cy="32" r="20" strokeWidth="3" pathLength={1} />
        {/* non-scaling stroke is in screen px: 2 viewBox units at this size */}
        <g className="logo-meridians" strokeWidth={(2 * size) / 64}>
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
        stroke="#f08a59"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <path
        className="logo-beat"
        d="M7 35h13l5-10 7 18 6-13 4 5h15"
        fill="none"
        stroke="#fff7ef"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
      />
    </svg>
  )
}
