import { useState } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import type { PostingWindow, } from '../lib/model'
import { formatDateTime, formatTime, timeZoneName } from '../lib/time'

function icsDate(date: Date) { return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'') }
function downloadIcs(window: PostingWindow) {
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Global Audience Pulse//DE','BEGIN:VEVENT',`UID:${window.start.getTime()}@global-audience-pulse`,`DTSTAMP:${icsDate(new Date())}`,`DTSTART:${icsDate(window.start)}`,`DTEND:${icsDate(window.end)}`,'SUMMARY:Optimales Posting-Fenster','END:VEVENT','END:VCALENDAR'].join('\r\n')
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'})); a.download='posting-fenster.ics'; a.click(); URL.revokeObjectURL(a.href)
}

export function Planner({ windowSets, selected }: { windowSets: { today: readonly PostingWindow[]; tomorrow: readonly PostingWindow[]; week: readonly PostingWindow[] }; selected: readonly RegionId[] }) {
  const [message,setMessage]=useState(''); const [scope,setScope]=useState<keyof typeof windowSets>('today'); const zone=Intl.DateTimeFormat().resolvedOptions().timeZone; const windows=windowSets[scope]
  const plan=windows.map((w,i)=>`${i+1}. ${formatDateTime(w.start,zone)}–${formatTime(w.end,zone)} (${Math.round(w.score)}/100)`).join('\n')
  const copy=async()=>{try{await navigator.clipboard.writeText(plan)}catch{const ta=document.createElement('textarea');ta.value=plan;document.body.append(ta);ta.select();document.execCommand('copy');ta.remove()}setMessage('Plan kopiert')}
  const share=async()=>{const data={title:'Mein Posting-Plan',text:plan,url:location.href};if(navigator.share)await navigator.share(data);else await copy()}
  return <section className="panel planner" aria-labelledby="planner-title"><div className="section-head"><div><p className="eyebrow">7-Tage-Planer</p><h2 id="planner-title">Die nächsten starken Fenster</h2></div><span className="micro">{timeZoneName(new Date(),zone)}</span></div>
    <div className="filter-row planner-tabs"><button onClick={()=>setScope('today')} aria-pressed={scope==='today'}>Heute ({windowSets.today.length})</button><button onClick={()=>setScope('tomorrow')} aria-pressed={scope==='tomorrow'}>Morgen ({windowSets.tomorrow.length})</button><button onClick={()=>setScope('week')} aria-pressed={scope==='week'}>7 Tage ({windowSets.week.length})</button></div>
    <div className="planner-list">{windows.map((window,i)=><article key={window.start.toISOString()}><span className="window-index">0{i+1}</span><div><strong>{formatDateTime(window.start,zone)}</strong><p>bis {formatTime(window.end,zone)} · Score {Math.round(window.score)}</p><small>{selected.map((id)=>{const r=REGIONS.find(x=>x.id===id)!;return `${r.city} ${formatTime(window.start,r.timeZone)}`}).join(' · ')}</small></div><button className="icon-button" onClick={()=>downloadIcs(window)} aria-label="Als Kalenderdatei laden">↓</button></article>)}</div>
    <div className="planner-actions"><button className="button primary" onClick={copy}>Plan kopieren</button><button className="button" onClick={share}>Link teilen</button></div><span className="sr-only" aria-live="polite">{message}</span>
  </section>
}
