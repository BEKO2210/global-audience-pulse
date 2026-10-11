import { geoCircle, geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landData from 'world-atlas/land-110m.json'
import { motion, useReducedMotion } from 'motion/react'
import { REGIONS, type RegionId } from '../config/regions'
import { PHASES } from '../config/model'
import { phaseAt, type ScoreGrid } from '../lib/model'
import { antipode, solarElevation, subsolarPoint } from '../lib/solar'
import { localDecimalHourFast } from '../lib/time'
import { MOTION } from '../config/motion'
import { useSvgBox } from '../hooks/useSvgBox'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { cityName, regionName } from '../i18n/labels'

const DE = {
  title: 'Wo die Welt gerade wach ist',
  mapLabel: 'Weltkarte mit Tag-Nacht-Grenze und Aktivitätspunkten',
  pin: (region: string, score: number) => `${region}: ${score} Prozent Aktivität`,
  day: 'Tag',
  twilight: 'Dämmerung',
  night: 'Nacht',
  prime: 'Primetime',
}
const EN: typeof DE = {
  title: 'Who’s awake right now',
  mapLabel: 'World map with day–night line and activity points',
  pin: (region, score) => `${region}: ${score}% activity`,
  day: 'Day',
  twilight: 'Twilight',
  night: 'Night',
  prime: 'Prime time',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const projection = geoEqualEarth().fitExtent(
  [
    [8, 8],
    [792, 392],
  ],
  { type: 'Sphere' },
)
const path = geoPath(projection)
const land = feature(landData as any, (landData as any).objects.land)
// Static geometry: project once at module load, not on every scrub step.
const LABEL_SIDE: Record<RegionId, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = {
  us_west: { x: 0, y: 16, anchor: 'middle' },
  us_east: { x: 9, y: 4, anchor: 'start' },
  latam: { x: 9, y: 4, anchor: 'start' },
  eu_uk: { x: -9, y: -4, anchor: 'end' },
  eu_central: { x: 9, y: -4, anchor: 'start' },
  mena: { x: -9, y: 4, anchor: 'end' },
  india: { x: 9, y: 8, anchor: 'start' },
  east_asia: { x: 9, y: 4, anchor: 'start' },
}
const SPHERE_PATH = path({ type: 'Sphere' }) ?? ''
const LAND_PATH = path(land as any) ?? ''

export function WorldMap({
  date,
  grid,
  selected,
  onRegion,
  caption,
}: {
  date: Date
  grid: ScoreGrid
  selected: readonly RegionId[]
  onRegion: (id: RegionId) => void
  caption?: string
}) {
  const t = useMessages(M)
  const { locale, intl } = useLocale()
  const reduceMotion = useReducedMotion()
  // The map scales with its panel; k converts CSS px to map units so labels stay 11 px and pin hit areas
  // stay ≥ 44 px on every screen.
  const { ref: svgRef, width: renderedWidth } = useSvgBox<SVGSVGElement>({
    width: 800,
    height: 400,
  })
  const k = 800 / renderedWidth
  const sun = subsolarPoint(date)
  const nightCenter = antipode(sun)
  const night = geoCircle().center([nightCenter.longitude, nightCenter.latitude]).radius(90)()
  // Civil twilight reaches six degrees below the horizon: 90° + 6° from the antisolar point.
  const twilight = geoCircle().center([nightCenter.longitude, nightCenter.latitude]).radius(96)()
  const primePhase = PHASES.find((phase) => phase.id === 'prime')
  return (
    <section
      className="panel map-panel"
      data-timestamp={date.toISOString()}
      aria-labelledby="map-title"
    >
      <div className="section-head">
        <h2 id="map-title">{t.title}</h2>
        <span className="micro">
          {date.toLocaleDateString(intl, { weekday: 'short', day: '2-digit', month: 'short' })}
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="world-map"
        role="group"
        aria-label={t.mapLabel}
      >
        <defs>
          <clipPath id="sphere">
            <path d={SPHERE_PATH} />
          </clipPath>
        </defs>
        <path d={SPHERE_PATH} className="ocean" />
        <g clipPath="url(#sphere)">
          <motion.path d={LAND_PATH} className="land" />
          <motion.path
            d={path(twilight) ?? ''}
            className="twilight"
            animate={{ d: path(twilight) ?? '' }}
            transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
          />
          <motion.path
            d={path(night) ?? ''}
            className="night"
            initial={false}
            animate={{ d: path(night) ?? '' }}
            transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
          />
        </g>
        <path d={SPHERE_PATH} className="sphere-line" />
        {REGIONS.map((region) => {
          const point = projection([...region.coordinates])
          if (!point) return null
          const score = grid.activityAt(region.id, date)
          const hour = localDecimalHourFast(date, region.timeZone)
          const prime = primePhase ? phaseAt(hour).id === primePhase.id : false
          const elevation = solarElevation(region.coordinates[1], region.coordinates[0], date)
          // Side labels placed by geography so neighbours never collide at 11 px, even on a phone.
          const baseOffset = LABEL_SIDE[region.id]
          const labelOffset = { ...baseOffset, x: baseOffset.x * k, y: baseOffset.y * k }
          return (
            <motion.g
              key={region.id}
              data-region={region.id}
              data-solar-elevation={elevation.toFixed(2)}
              transform={`translate(${point[0]} ${point[1]})`}
              className={selected.includes(region.id) ? '' : 'pin-muted'}
              onClick={() => onRegion(region.id)}
              role="button"
              tabIndex={0}
              aria-label={t.pin(regionName(region.id, locale), Math.round(score))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRegion(region.id)
                }
              }}
              animate={{ opacity: selected.includes(region.id) ? 1 : 0.42 }}
              transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
            >
              <circle r={Math.max(24, 22 * k)} fill="transparent" className="map-hitbox" />
              {prime && (
                <circle
                  className="map-prime-ring"
                  r="12"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="1"
                />
              )}
              <motion.circle
                r={5 + score / 30}
                fill="var(--ink)"
                stroke="var(--paper)"
                strokeWidth="2"
                animate={{ r: 5 + score / 30 }}
                transition={{ duration: reduceMotion ? 0 : MOTION.change, ease: MOTION.ease }}
              />
              <text
                x={labelOffset.x}
                y={labelOffset.y}
                textAnchor={labelOffset.anchor}
                className="map-pin-label"
                style={{
                  fontSize: `calc(var(--text-meta) * ${k})`,
                  strokeWidth: 1.2 * k,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {cityName(region.id, region.city, locale)}
              </text>
            </motion.g>
          )
        })}
      </svg>
      <div className="map-key">
        <span>
          <i className="day-dot" />
          {t.day}
        </span>
        <span>
          <i className="twilight-dot" />
          {t.twilight}
        </span>
        <span>
          <i className="night-dot" />
          {t.night}
        </span>
        <span>
          <i className="prime-dot" />
          {t.prime}
        </span>
      </div>
      {caption && (
        <p className="chart-caption" title={caption}>
          {caption}
        </p>
      )}
    </section>
  )
}
