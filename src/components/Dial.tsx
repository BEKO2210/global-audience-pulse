import { REGIONS, type RegionId } from '../config/regions'
import { SERIES } from '../config/model'
import { formatTime, localDecimalHour } from '../lib/time'

export function Dial({ date, selected }: { date: Date; selected: readonly RegionId[] }) {
  const cx = 150; const cy = 150; const radius = 108
  return <section className="panel dial-panel" aria-labelledby="dial-title"><div className="section-head"><div><p className="eyebrow">24-Stunden-Zifferblatt</p><h2 id="dial-title">Ein Tag, acht Orte</h2></div></div>
    <div className="dial-wrap"><svg viewBox="0 0 300 300" className="dial" aria-label="Ortszeiten als kreisförmige Uhr">
      <circle cx={cx} cy={cy} r={radius} className="dial-ring" />
      {Array.from({ length: 24 }, (_, h) => { const a = h / 24 * Math.PI * 2 - Math.PI/2; const outer = radius+5; const inner = radius+(h%6===0 ? -8 : -3); return <g key={h}><line x1={cx+Math.cos(a)*inner} y1={cy+Math.sin(a)*inner} x2={cx+Math.cos(a)*outer} y2={cy+Math.sin(a)*outer} className="dial-tick" />{h%6===0 && <text x={cx+Math.cos(a)*(radius-22)} y={cy+Math.sin(a)*(radius-22)+4} textAnchor="middle">{String(h).padStart(2,'0')}</text>}</g> })}
      {REGIONS.map((region, i) => { const h = localDecimalHour(date, region.timeZone); const a = h/24*Math.PI*2-Math.PI/2; const r = radius-38-(i%2)*13; return <g key={region.id} className={selected.includes(region.id) ? '' : 'pin-muted'}><line x1={cx} y1={cy} x2={cx+Math.cos(a)*r} y2={cy+Math.sin(a)*r} stroke={SERIES[i]} className="dial-hand"/><circle cx={cx+Math.cos(a)*r} cy={cy+Math.sin(a)*r} r="6" fill={SERIES[i]} /><title>{region.name}: {formatTime(date, region.timeZone)}</title></g> })}
      <circle cx={cx} cy={cy} r="4" className="dial-center"/><text x={cx} y={cy+28} textAnchor="middle" className="dial-date">{date.toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}</text>
    </svg><ol className="dial-list">{REGIONS.map((region, i) => <li key={region.id} className={selected.includes(region.id)?'':'muted-item'}><i style={{background:SERIES[i]}}/><span>{region.city}</span><strong>{formatTime(date,region.timeZone)}</strong></li>)}</ol></div>
  </section>
}
