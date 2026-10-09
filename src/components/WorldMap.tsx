import { geoCircle, geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landData from 'world-atlas/land-110m.json'
import { motion } from 'motion/react'
import { REGIONS, type RegionId } from '../config/regions'
import { PHASES, SERIES } from '../config/model'
import { phaseAt, type ScoreGrid } from '../lib/model'
import { antipode, solarElevation, subsolarPoint } from '../lib/solar'
import { localDecimalHourFast } from '../lib/time'

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
const SPHERE_PATH = path({ type: 'Sphere' }) ?? ''
const LAND_PATH = path(land as any) ?? ''

export function WorldMap({
  date,
  grid,
  selected,
  onRegion,
}: {
  date: Date
  grid: ScoreGrid
  selected: readonly RegionId[]
  onRegion: (id: RegionId) => void
}) {
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
        <div>
          <p className="eyebrow">Live-Karte</p>
          <h2 id="map-title">Wo die Welt gerade wach ist</h2>
        </div>
        <span className="micro">
          {date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
        </span>
      </div>
      <svg
        viewBox="0 0 800 400"
        className="world-map"
        role="group"
        aria-label="Weltkarte mit Tag-Nacht-Grenze und Aktivitätspunkten"
      >
        <defs>
          <clipPath id="sphere">
            <path d={SPHERE_PATH} />
          </clipPath>
        </defs>
        <path d={SPHERE_PATH} className="ocean" />
        <g clipPath="url(#sphere)">
          <path d={LAND_PATH} className="land" />
          <path d={path(twilight) ?? ''} className="twilight" />
          <path d={path(night) ?? ''} className="night" />
        </g>
        <path d={SPHERE_PATH} className="sphere-line" />
        {REGIONS.map((region, index) => {
          const point = projection([...region.coordinates])
          if (!point) return null
          const score = grid.activityAt(region.id, date)
          const hour = localDecimalHourFast(date, region.timeZone)
          const prime = primePhase ? phaseAt(hour).id === primePhase.id : false
          const elevation = solarElevation(region.coordinates[1], region.coordinates[0], date)
          const labelOffset =
            region.id === 'eu_uk'
              ? { x: -12, y: -17, anchor: 'end' as const }
              : region.id === 'eu_central'
                ? { x: 12, y: -29, anchor: 'start' as const }
                : { x: 0, y: -13, anchor: 'middle' as const }
          return (
            <g
              key={region.id}
              data-region={region.id}
              data-solar-elevation={elevation.toFixed(2)}
              transform={`translate(${point[0]} ${point[1]})`}
              className={selected.includes(region.id) ? '' : 'pin-muted'}
              onClick={() => onRegion(region.id)}
              role="button"
              tabIndex={0}
              aria-label={`${region.name}: ${Math.round(score)} Prozent Aktivität`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRegion(region.id)
                }
              }}
            >
              <circle r="24" fill="transparent" className="map-hitbox" />
              {prime && selected.includes(region.id) && (
                <motion.circle
                  r="13"
                  fill="none"
                  stroke={SERIES[index]}
                  initial={{ opacity: 0.6, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <circle
                r={5 + score / 30}
                fill={SERIES[index]}
                stroke="var(--paper)"
                strokeWidth="2"
              />
              {labelOffset.x !== 0 && (
                <line
                  x1="0"
                  y1="-8"
                  x2={labelOffset.x * 0.75}
                  y2={labelOffset.y + 4}
                  className="map-label-leader"
                />
              )}
              <text
                x={labelOffset.x}
                y={labelOffset.y}
                textAnchor={labelOffset.anchor}
                className="map-pin-label"
              >
                {region.city}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="map-key">
        <span>
          <i className="day-dot" />
          Tag
        </span>
        <span>
          <i className="twilight-dot" />
          Dämmerung
        </span>
        <span>
          <i className="night-dot" />
          Nacht
        </span>
      </div>
    </section>
  )
}
