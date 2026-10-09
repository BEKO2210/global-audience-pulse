import { geoCircle, geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landData from 'world-atlas/land-110m.json'
import { motion } from 'motion/react'
import { REGIONS, type RegionId } from '../config/regions'
import { SERIES } from '../config/model'
import { regionActivity } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { subsolarPoint } from '../lib/solar'
import { localDecimalHour } from '../lib/time'

const projection = geoEqualEarth().fitExtent([[8, 8], [792, 392]], { type: 'Sphere' })
const path = geoPath(projection)
const land = feature(landData as any, (landData as any).objects.land)

export function WorldMap({ date, snapshot, selected, onRegion }: { date: Date; snapshot: Snapshot; selected: readonly RegionId[]; onRegion: (id: RegionId) => void }) {
  const sun = subsolarPoint(date)
  const night = geoCircle().center([((sun.longitude + 180) % 360) - 180, -sun.latitude]).radius(90)()
  const twilight = geoCircle().center([((sun.longitude + 180) % 360) - 180, -sun.latitude]).radius(96)()
  return <section className="panel map-panel" aria-labelledby="map-title">
    <div className="section-head"><div><p className="eyebrow">Live-Karte</p><h2 id="map-title">Wo die Welt gerade wach ist</h2></div><span className="micro">{date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}</span></div>
    <svg viewBox="0 0 800 400" className="world-map" role="img" aria-label="Weltkarte mit Tag-Nacht-Grenze und Aktivitätspunkten">
      <defs><clipPath id="sphere"><path d={path({ type: 'Sphere' }) ?? ''} /></clipPath></defs>
      <path d={path({ type: 'Sphere' }) ?? ''} className="ocean" />
      <g clipPath="url(#sphere)"><path d={path(land as any) ?? ''} className="land" /><path d={path(twilight) ?? ''} className="twilight" /><path d={path(night) ?? ''} className="night" /></g>
      <path d={path({ type: 'Sphere' }) ?? ''} className="sphere-line" />
      {REGIONS.map((region, index) => {
        const point = projection([...region.coordinates]); if (!point) return null
        const score = regionActivity(region, date, snapshot); const prime = localDecimalHour(date, region.timeZone) >= 18 && localDecimalHour(date, region.timeZone) < 22
        return <g key={region.id} transform={`translate(${point[0]} ${point[1]})`} className={selected.includes(region.id) ? '' : 'pin-muted'} onClick={() => onRegion(region.id)} role="button" tabIndex={0} aria-label={`${region.name}: ${Math.round(score)} Prozent Aktivität`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRegion(region.id) }}>
          {prime && selected.includes(region.id) && <motion.circle r="13" fill="none" stroke={SERIES[index]} initial={{ opacity: .6, scale: .6 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 2, repeat: Infinity }} />}
          <circle r={5 + score / 30} fill={SERIES[index]} stroke="var(--paper)" strokeWidth="2" />
        </g>
      })}
    </svg>
    <div className="map-key"><span><i className="day-dot" />Tag</span><span><i className="twilight-dot" />Dämmerung</span><span><i className="night-dot" />Nacht</span></div>
  </section>
}
