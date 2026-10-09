import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { REGIONS, type RegionId } from '../config/regions'
import { PHASES, SERIES } from '../config/model'
import { normalizedWeights, phaseAt, regionActivity } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'
import { formatTime, localDecimalHour } from '../lib/time'
import type { LiveMeasure } from '../hooks/useLiveData'
import { Sparkline } from './Sparkline'

function RegionTime({ date, timeZone }: { date: Date; timeZone: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = window.setInterval(() => setTick((n) => n + 1), 1_000); return () => clearInterval(id) }, [])
  return <>{formatTime(new Date(date.getTime() + tick * 1_000), timeZone, true)}</>
}

function measuredAge(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  return minutes < 60 ? `${minutes} Min` : `${Math.round(minutes / 60)} Std`
}

export function RegionCards({ date, selected, snapshot, live, onToggle, onOpen }: { date: Date; selected: readonly RegionId[]; snapshot: Snapshot; live: Partial<Record<RegionId, LiveMeasure>>; onToggle: (id: RegionId) => void; onOpen: (id: RegionId) => void }) {
  const [filter, setFilter] = useState<'all'|'measured'|'model'>('all')
  const weights = normalizedWeights(selected, snapshot)
  const measuredCount = REGIONS.filter((r) => Boolean(snapshot.profiles[r.id])).length
  const visible = REGIONS.filter((r) => filter === 'all' || (filter === 'measured' ? Boolean(snapshot.profiles[r.id]) : !snapshot.profiles[r.id]))
  return <section className="regions-section" aria-labelledby="regions-title">
    <div className="section-head"><div><p className="eyebrow">Regionen</p><h2 id="regions-title">Deine globale Redaktion</h2></div><span className="micro">{selected.length} von {REGIONS.length} aktiv</span></div>
    <div className="audience-selector" aria-label="Zielgruppen-Auswahl">{REGIONS.map((region) => <button key={region.id} className={selected.includes(region.id)?'chip active':'chip'} onClick={() => onToggle(region.id)} aria-pressed={selected.includes(region.id)}>{region.flag} {region.city}</button>)}</div>
    <div className="filter-row" aria-label="Regionen filtern"><button onClick={()=>setFilter('all')} aria-pressed={filter==='all'}>Alle ({REGIONS.length})</button><button onClick={()=>setFilter('measured')} aria-pressed={filter==='measured'}>Gemessen ({measuredCount})</button><button onClick={()=>setFilter('model')} aria-pressed={filter==='model'}>Modell ({REGIONS.length-measuredCount})</button></div>
    <div className="region-grid">{visible.map((region) => {
      const index=REGIONS.findIndex((item)=>item.id===region.id)
      const score=regionActivity(region,date,snapshot); const phase=phaseAt(localDecimalHour(date,region.timeZone)); const measured=Boolean(snapshot.profiles[region.id]); const values=Array.from({length:48},(_,i)=>regionActivity(region,new Date(date.getTime()+(i-12)*30*60_000),snapshot)); const measure=live[region.id]; const measuredAt=measure?.lastMeasuredAt??snapshot.profiles[region.id]?.lastMeasuredAt
      return <motion.article layout key={region.id} className={selected.includes(region.id)?'region-card':'region-card unselected'} whileInView={{opacity:1,y:0}} initial={{opacity:0,y:14}} viewport={{once:true}} transition={{delay:index*.035}}>
        <button className="card-main" onClick={()=>onOpen(region.id)} aria-label={`Details für ${region.name}`}><div className="card-top"><span className="flag">{region.flag}</span><span className={measured?'badge measured':'badge'}>{measured?'gemessen':'Modell'}</span></div><p className="eyebrow">{region.name}</p><div className="region-time"><RegionTime date={date} timeZone={region.timeZone}/></div><p className="phase" style={{color:phase.color}}>{phase.emoji} {phase.name}</p><div className="card-score"><strong>{Math.round(score)}</strong><span>/100</span></div><Sparkline values={values} color={SERIES[index]} height={36}/>{measuredAt&&<p className="deviation">{measure?`gerade ${measure.deviation>=0?'+':''}${Math.round(measure.deviation)} % · `:''}Messung vor {measuredAge(measuredAt)}</p>}<div className="weight"><span style={{width:`${(weights[region.id]??0)*100}%`,background:SERIES[index]}}/></div><p className="weight-label"><span>Zielgruppenanteil</span><b>{selected.includes(region.id)?`${Math.round((weights[region.id]??0)*100)} %`:'—'}</b></p></button>
        <button className="include-button" onClick={()=>onToggle(region.id)} aria-pressed={selected.includes(region.id)}>{selected.includes(region.id)?'In Zielgruppe':'Hinzufügen'}</button>
      </motion.article>
    })}</div>
    <div className="phase-legend">{PHASES.map((phase)=><span key={phase.id}><i style={{background:phase.color}}/>{phase.name} · {String(phase.from).padStart(2,'0')}–{String(phase.to).padStart(2,'0')} Uhr</span>)}</div>
  </section>
}
