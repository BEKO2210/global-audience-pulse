import { curveMonotoneX, line } from 'd3-shape'
import { PHASES } from '../config/model'
import type { RegionConfig } from '../config/regions'
import { regionActivity } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { fastZonedParts, localDecimalHourFast } from '../lib/time'
import { useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import { useSvgBox } from '../hooks/useSvgBox'
import './RegionDayChart.css'

const DE = {
  title: (city: string): string => `${city} im Tagesverlauf, Ortszeit`,
  today: (weekend: boolean): string => (weekend ? 'Heute (Wochenende)' : 'Heute (Werktag)'),
  other: (weekend: boolean): string => (weekend ? 'Werktag' : 'Wochenende'),
  peak: (time: string, score: number) => `Spitze ${time} · ${score}`,
  label: (city: string, peak: string, score: number) =>
    `Aktivität in ${city} über den Tag in Ortszeit, Spitze ${peak} mit ${score}`,
}
const EN: typeof DE = {
  title: (city) => `${city} through the local day`,
  today: (weekend) => (weekend ? 'Today (weekend)' : 'Today (weekday)'),
  other: (weekend) => (weekend ? 'Weekday' : 'Weekend'),
  peak: (time, score) => `Peak ${time} · ${score}`,
  label: (city, peak, score) =>
    `Activity in ${city} across the local day, peak ${peak} at ${score}`,
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const HEIGHT = 132
const PAD = { top: 20, right: 8, bottom: 22, left: 8 }
const STEP = 0.5 // hours

const isWeekendAt = (date: Date, timeZone: string) => {
  const day = fastZonedParts(date, timeZone).weekday
  return day === 'Sat' || day === 'Sun'
}
const hh = (hour: number) =>
  `${String(Math.floor(hour) % 24).padStart(2, '0')}:${hour % 1 ? '30' : '00'}`

/**
 * The region's whole local day (00–24) with phase bands, a "now" marker and the peak, plus the other day type
 * (weekday vs. weekend) dashed for comparison – detail the compact card's sparkline does not show (Belkis:
 * "unten ein detaillierteres oder anderes Diagramm").
 */
export function RegionDayChart({
  region,
  city,
  date,
  snapshot,
}: {
  region: RegionConfig
  city: string
  date: Date
  snapshot: Snapshot
}) {
  const t = useMessages(M)
  const { ref, width } = useSvgBox<SVGSVGElement>({ width: 320, height: HEIGHT })
  const nowHour = localDecimalHourFast(date, region.timeZone)
  // local midnight of the selected day, as an instant (DST jumps inside the day are ignored for the drawing)
  const midnight = date.getTime() - nowHour * 3_600_000
  const weekend = isWeekendAt(date, region.timeZone)
  // the nearest day of the other type, same local hours
  let otherMidnight = midnight
  for (let d = 1; d <= 6; d += 1) {
    const probe = midnight + d * 86_400_000 + 12 * 3_600_000
    if (isWeekendAt(new Date(probe), region.timeZone) !== weekend) {
      otherMidnight = midnight + d * 86_400_000
      break
    }
  }
  const hours = Array.from({ length: 24 / STEP + 1 }, (_, i) => i * STEP)
  const today = hours.map((h) =>
    regionActivity(region, new Date(midnight + h * 3_600_000), snapshot),
  )
  const other = hours.map((h) =>
    regionActivity(region, new Date(otherMidnight + h * 3_600_000), snapshot),
  )
  const x = (h: number) => PAD.left + (h / 24) * (width - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - v / 100) * (HEIGHT - PAD.top - PAD.bottom)
  const path = (values: number[]) =>
    line<number>()
      .x((_, i) => x(hours[i]!))
      .y((v) => y(v))
      .curve(curveMonotoneX)(values) ?? ''
  const peakIndex = today.reduce((best, v, i) => (v > today[best]! ? i : best), 0)
  const peakHour = hours[peakIndex]!
  const peakScore = Math.round(today[peakIndex]!)
  const nowScore = regionActivity(region, date, snapshot)
  const peakLabelLeft = x(peakHour) > width - 120

  return (
    <figure className="rdc">
      <figcaption className="rdc-head">
        <span className="rdc-title">{t.title(city)}</span>
        <span className="rdc-legend">
          <span>
            <i className="rdc-key is-today" />
            {t.today(weekend)}
          </span>
          <span>
            <i className="rdc-key is-other" />
            {t.other(weekend)}
          </span>
        </span>
      </figcaption>
      <svg
        ref={ref}
        className="rdc-svg"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={t.label(city, hh(peakHour), peakScore)}
      >
        {PHASES.map((phase) => (
          <rect
            key={phase.id}
            className={`rdc-band is-${phase.id}`}
            x={x(phase.from)}
            y={PAD.top}
            width={x(phase.to) - x(phase.from)}
            height={HEIGHT - PAD.top - PAD.bottom}
          />
        ))}
        <path className="rdc-other" d={path(other)} />
        <path className="rdc-today" d={path(today)} />
        <line
          className="rdc-now"
          x1={x(nowHour)}
          x2={x(nowHour)}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
        />
        <circle className="rdc-now-dot" cx={x(nowHour)} cy={y(nowScore)} r={4} />
        <circle className="rdc-peak-dot" cx={x(peakHour)} cy={y(peakScore)} r={3} />
        <text
          className="rdc-peak"
          x={x(peakHour) + (peakLabelLeft ? -8 : 8)}
          y={Math.max(PAD.top - 6, y(peakScore) - 8)}
          textAnchor={peakLabelLeft ? 'end' : 'start'}
        >
          {t.peak(hh(peakHour), peakScore)}
        </text>
        {[0, 6, 12, 18, 24].map((h) => (
          <text
            key={h}
            className="rdc-axis"
            x={x(h)}
            y={HEIGHT - 6}
            textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}
          >
            {String(h % 24 === 0 && h ? 24 : h).padStart(2, '0')}
          </text>
        ))}
      </svg>
    </figure>
  )
}
