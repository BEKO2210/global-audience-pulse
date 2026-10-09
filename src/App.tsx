import { useEffect, useMemo, useState } from 'react'
import { MotionConfig, motion, useSpring, useTransform } from 'motion/react'
import { DATA_SOURCES, MODEL_CONFIG, PHASES } from './config/model'
import { PRESETS, REGIONS, REGION_BY_ID, type RegionId } from './config/regions'
import { useAudience } from './hooks/useAudience'
import { useLiveData } from './hooks/useLiveData'
import { circularMean, findNextOffsetChange, formatTime, localDecimalHour, relativeTime, timeZoneName } from './lib/time'
import { findBestWindows, globalActivity, normalizedWeights, phaseAt, regionActivity, statusFor } from './lib/model'
import { FALLBACK_SNAPSHOT, loadSnapshot, type Snapshot } from './lib/snapshot'
import { Dial } from './components/Dial'
import { Forecast } from './components/Forecast'
import { Heatmap } from './components/Heatmap'
import { LiveClock } from './components/Clock'
import { Planner } from './components/Planner'
import { RegionCards } from './components/RegionCards'
import { Sparkline } from './components/Sparkline'
import { WorldMap } from './components/WorldMap'

function AnimatedNumber({ value }: { value: number }) {
  const spring=useSpring(value,{stiffness:130,damping:24}); const display=useTransform(spring,(n)=>Math.round(n)); const [shown,setShown]=useState(Math.round(value))
  useEffect(()=>{spring.set(value);return display.on('change',(v)=>setShown(v))},[value,spring,display])
  return <span>{shown}</span>
}

function Section({ children, className='' }: {children:React.ReactNode;className?:string}) { return <motion.div className={className} initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}} transition={{duration:.5}}>{children}</motion.div> }

function nextPhaseStart(region: (typeof REGIONS)[number], from: Date, phaseId='prime') {
  const phase=PHASES.find((p)=>p.id===phaseId)!; const start=from.getTime()+60_000
  for(let m=0;m<48*60;m+=1){const d=new Date(start+m*60_000);const h=localDecimalHour(d,region.timeZone);if(Math.abs(h-phase.from)<1/60)return d}
  return new Date(from.getTime()+24*3_600_000)
}

function freshness(date: string) {
  const minutes=Math.max(0,Math.round((Date.now()-new Date(date).getTime())/60_000));
  if(minutes<60)return `vor ${minutes} Min`; const hours=Math.round(minutes/60); if(hours<48)return `vor ${hours} Std`; return `vor ${Math.round(hours/24)} T`
}

function Header({snapshot,theme,onTheme}:{snapshot:Snapshot;theme:string;onTheme:()=>void}){
  return <header className="site-header"><a className="wordmark" href="#top" aria-label="Global Audience Pulse Start"><svg viewBox="0 0 32 20"><path d="M1 11h6l3-8 5 15 4-8 3 4h9"/></svg><span>Global Audience<br/>Pulse</span></a><div className="header-actions"><span className="freshness"><i/>Messdaten {freshness(snapshot.sources.wikimedia.fetchedAt)}</span><LiveClock/><button className="theme-toggle" onClick={onTheme} aria-label={theme==='dark'?'Helles Design':'Dunkles Design'}>{theme==='dark'?'☼':'◐'}</button></div></header>
}

export default function App(){
  const [snapshot,setSnapshot]=useState<Snapshot>(FALLBACK_SNAPSHOT); const [minuteNow,setMinuteNow]=useState(()=>new Date()); const [scrubbed,setScrubbed]=useState<Date|null>(null); const [detail,setDetail]=useState<RegionId|null>(null); const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('gap-theme')??'dark'}catch{return'dark'}}); const {selected,toggle,selectAll,setSelected}=useAudience()
  useEffect(()=>{void loadSnapshot().then(setSnapshot)},[])
  useEffect(()=>{const id=window.setInterval(()=>setMinuteNow(new Date()),60_000);return()=>clearInterval(id)},[])
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('gap-theme',theme)}catch{/* optional */}},[theme])
  const live=useLiveData(snapshot); const date=scrubbed??minuteNow
  const score=useMemo(()=>globalActivity(REGIONS,selected,date,snapshot),[selected,date,snapshot]); const status=statusFor(score)
  const forecast=useMemo(()=>Array.from({length:97},(_,i)=>{const d=new Date(minuteNow.getTime()+i*15*60_000);return{date:d,score:globalActivity(REGIONS,selected,d,snapshot)}}),[minuteNow,selected,snapshot])
  const windows24=useMemo(()=>findBestWindows((d)=>globalActivity(REGIONS,selected,d,snapshot),minuteNow,24),[minuteNow,selected,snapshot])
  const plannerSets=useMemo(()=>{const tomorrow=new Date(minuteNow);tomorrow.setHours(24,0,0,0);const todayHours=Math.max(1,(tomorrow.getTime()-minuteNow.getTime())/3_600_000);return{today:findBestWindows((d)=>globalActivity(REGIONS,selected,d,snapshot),minuteNow,todayHours,MODEL_CONFIG.windowMinutes,3),tomorrow:findBestWindows((d)=>globalActivity(REGIONS,selected,d,snapshot),tomorrow,24,MODEL_CONFIG.windowMinutes,3),week:findBestWindows((d)=>globalActivity(REGIONS,selected,d,snapshot),minuteNow,24*7,MODEL_CONFIG.windowMinutes,5)}},[minuteNow,selected,snapshot])
  const regionScores=REGIONS.filter((r)=>selected.includes(r.id)).map((region)=>({region,score:regionActivity(region,date,snapshot)})).sort((a,b)=>b.score-a.score)
  const weights=normalizedWeights(selected,snapshot); const worldMean=circularMean(selected.map((id)=>localDecimalHour(date,REGION_BY_ID[id].timeZone)),selected.map((id)=>weights[id]??0))
  const biggestSleeping=regionScores.filter((x)=>phaseAt(localDecimalHour(date,x.region.timeZone)).id==='sleep').sort((a,b)=>(weights[b.region.id]??0)-(weights[a.region.id]??0))[0]
  const nextPrime=REGIONS.filter((r)=>selected.includes(r.id)).map((r)=>({region:r,date:nextPhaseStart(r,date)})).sort((a,b)=>a.date.getTime()-b.date.getTime())[0]
  const dst=REGIONS.map((r)=>({region:r,date:findNextOffsetChange(r.timeZone,date)})).filter((x):x is {region:(typeof REGIONS)[number];date:Date}=>Boolean(x.date)).sort((a,b)=>a.date.getTime()-b.date.getTime())[0]
  const wbYears=Object.values(snapshot.dataYears); const wbYear=wbYears.length?Math.max(...wbYears):null
  const presetWindows=PRESETS.map((preset)=>({preset,window:findBestWindows((d)=>globalActivity(REGIONS,preset.ids,d,snapshot),minuteNow,24,MODEL_CONFIG.windowMinutes,1)[0]}))
  const detailRegion=detail?REGION_BY_ID[detail]:null
  return <MotionConfig reducedMotion="user"><div id="top" className="app-shell"><Header snapshot={snapshot} theme={theme} onTheme={()=>setTheme(theme==='dark'?'light':'dark')}/><main>
    <Section className="hero"><div className="hero-copy"><p className="eyebrow">Live Audience Intelligence · {selected.length}/{REGIONS.length} Regionen</p><h1>Ist deine Welt<br/><em>bereit?</em></h1><div className="score-row"><div className="hero-score" aria-live="polite"><AnimatedNumber value={score}/><small>/100</small></div><div className="score-meta"><span className={`status ${status.tone}`}><i/>{status.label}</span><strong>{status.verdict}</strong><p>{regionScores[0]?.region.city} führt mit {Math.round(regionScores[0]?.score??0)}. {biggestSleeping?`${biggestSleeping.region.city} schläft noch.`:'Alle Kernmärkte sind wach.'}</p></div></div></div><div className="hero-aside"><div className="hero-spark"><span>Nächste 24 Stunden</span><Sparkline values={forecast.map((p)=>p.score)} height={96}/><div><small>jetzt</small><b>Peak {Math.round(Math.max(...forecast.map((p)=>p.score)))}</b><small>+24 h</small></div></div><dl><div><dt>Weltmittelzeit</dt><dd>{String(Math.floor(worldMean)).padStart(2,'0')}:{String(Math.round(worldMean%1*60)%60).padStart(2,'0')}</dd></div><div><dt>Beste Region</dt><dd>{regionScores[0]?.region.flag} {regionScores[0]?.region.city}</dd></div><div><dt>Nächstes Fenster</dt><dd>{windows24[0]?formatTime(windows24[0].start,Intl.DateTimeFormat().resolvedOptions().timeZone):'—'}</dd></div></dl></div></Section>
    <div className="desktop-grid"><Section className="map-slot"><WorldMap date={date} snapshot={snapshot} selected={selected} onRegion={setDetail}/></Section><Section className="forecast-slot"><Forecast points={forecast} selectedDate={date} windows={windows24} onScrub={setScrubbed}/></Section></div>
    <Section><div className="insight-strip"><div><span className="eyebrow">Nächster Wechsel</span><strong>{nextPrime?`In ${relativeTime(nextPrime.date,date)} beginnt Primetime in ${nextPrime.region.city}`:'—'}</strong></div><div><span className="eyebrow">Zeitumstellung</span><strong>{dst?`${dst.region.city} · ${dst.date.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'})}`:'Keine in den nächsten 12 Monaten'}</strong></div></div></Section>
    <Section><section className="presets" aria-labelledby="presets-title"><div className="section-head"><div><p className="eyebrow">Berechnete Presets</p><h2 id="presets-title">Redaktionelle Wellen</h2></div></div><div className="preset-grid">{presetWindows.map(({preset,window})=><button key={preset.name} onClick={()=>setSelected([...preset.ids])}><span className="eyebrow">{preset.ids.length} Regionen</span><h3>{preset.name}</h3>{window&&<><div className="preset-time">{formatTime(window.start,Intl.DateTimeFormat().resolvedOptions().timeZone)}–{formatTime(window.end,Intl.DateTimeFormat().resolvedOptions().timeZone)} <small>{timeZoneName(window.start)}</small></div><div className="preset-score">Score {Math.round(window.score)}</div><p>{preset.ids.map((id)=>{const r=REGION_BY_ID[id];return `${r.city} ${formatTime(window.start,r.timeZone)} · ${phaseAt(localDecimalHour(window.start,r.timeZone)).name}`}).join(' · ')}</p></>}</button>)}</div></section></Section>
    <div className="analysis-grid"><Section><Heatmap start={minuteNow} selected={selected} snapshot={snapshot} onScrub={setScrubbed}/></Section><Section><Dial date={date} selected={selected}/></Section></div>
    <Section><RegionCards date={date} selected={selected} snapshot={snapshot} live={live} onToggle={toggle} onOpen={setDetail}/>{selected.length<REGIONS.length&&<button className="text-button" onClick={selectAll}>Alle {REGIONS.length} Regionen aktivieren</button>}</Section>
    <Section><Planner windowSets={plannerSets} selected={selected}/></Section>
    <Section><section className="method" aria-labelledby="method-title"><div><p className="eyebrow">Methodik & Quellen</p><h2 id="method-title">Messbar, modelliert,<br/>transparent.</h2></div><div className="method-copy"><p>Der Score verbindet die geglättete menschliche Aufmerksamkeitskurve mit den stündlichen Wikipedia-Abrufen der jeweiligen Sprachregion: <strong>{MODEL_CONFIG.measuredBlend*100} % Messprofil + {MODEL_CONFIG.baselineBlend*100} % Baseline</strong>. Die Weltbank-Gewichte basieren auf Bevölkerung × Internetnutzung und werden für deine Auswahl live neu normiert.</p><div className="source-list"><a href={DATA_SOURCES.worldBankPopulation}>Weltbank · Bevölkerung <span>{wbYear??'Fallback'}</span></a><a href={DATA_SOURCES.worldBankInternet}>Weltbank · Internetnutzung <span>{snapshot.sources.worldBank.fetchedAt!==FALLBACK_SNAPSHOT.sources.worldBank.fetchedAt?freshness(snapshot.sources.worldBank.fetchedAt):'Modell'}</span></a><a href={DATA_SOURCES.wikimedia}>Wikimedia Pageviews <span>{freshness(snapshot.sources.wikimedia.fetchedAt)}</span></a><a href={DATA_SOURCES.diagramDesign}>diagram-design, MIT <span>Design-Tokens</span></a></div><p className="limitations">Wikipedia ist ein Aktivitäts-Proxy, keine Social-Plattform-Messung. Englischsprachige Wikipedia wird bewusst nicht für USA/UK verwendet, da sie Zeitzonen mischt. Ländergruppen und der dokumentierte US-Split approximieren globale Zielgruppen; sie ersetzen keine eigenen Analytics.</p></div></section></Section>
  </main><footer><span>Global Audience Pulse v1</span><span>{REGIONS.length} Regionen · live berechnet</span></footer>
  <div className="mobile-bar"><div><span>{status.verdict}</span><strong>{Math.round(score)}/100</strong></div><input aria-label="Mobile Zeitmaschine" type="range" min={-720} max={10080} step={15} value={Math.round((date.getTime()-minuteNow.getTime())/60_000)} onChange={(e)=>setScrubbed(new Date(minuteNow.getTime()+Number(e.target.value)*60_000))}/><button onClick={()=>setScrubbed(null)} disabled={!scrubbed}>Live</button></div>
  {detailRegion&&<div className="sheet-backdrop" onClick={()=>setDetail(null)}><motion.aside className="detail-sheet" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} onClick={(e)=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="sheet-close" onClick={()=>setDetail(null)} aria-label="Schließen">×</button><span className="detail-flag">{detailRegion.flag}</span><p className="eyebrow">Region im Fokus</p><h2 id="detail-title">{detailRegion.name}</h2><div className="detail-score">{Math.round(regionActivity(detailRegion,date,snapshot))}<small>/100</small></div><p>{detailRegion.city} · {formatTime(date,detailRegion.timeZone)} · {timeZoneName(date,detailRegion.timeZone)}</p><p>{phaseAt(localDecimalHour(date,detailRegion.timeZone)).emoji} {phaseAt(localDecimalHour(date,detailRegion.timeZone)).name}</p><button className="button primary" onClick={()=>{if(!selected.includes(detailRegion.id))toggle(detailRegion.id);setDetail(null)}}>{selected.includes(detailRegion.id)?'Ist in deiner Zielgruppe':'Zur Zielgruppe hinzufügen'}</button></motion.aside></div>}
  </div></MotionConfig>
}
