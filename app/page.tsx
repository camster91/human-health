'use client';
import { useEffect, useMemo, useState } from 'react';
import { AdaptContext, GymProfile, HistoryEntry, SessionId, Workout } from '@/lib/domain';
import { buildSession, gyms, substitutions } from '@/lib/program';
import { adaptWorkout, nextLoadRecommendation, platePlan, summarizeWorkout } from '@/lib/engine';
import { store } from '@/lib/storage';

const sequence:SessionId[]=['upper-a','lower-a','upper-b','lower-b'];
const title=(s:SessionId)=>s.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ');

export default function Home(){
  const [history,setHistory]=useState<HistoryEntry[]>([]);
  const [active,setActive]=useState<Workout|null>(null);
  const [gym,setGym]=useState<GymProfile>(gyms[0]);
  const [notes,setNotes]=useState<string[]>([]);
  const [restUntil,setRestUntil]=useState<number|null>(null);
  const [now,setNow]=useState(Date.now());
  const [tab,setTab]=useState<'today'|'progress'|'coach'>('today');
  useEffect(()=>{setHistory(store.loadHistory());setActive(store.loadActive())},[]);
  useEffect(()=>{if(active)store.saveActive(active)},[active]);
  useEffect(()=>{if(!restUntil)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[restUntil]);
  useEffect(()=>{
    if(!active || typeof navigator==='undefined' || !('wakeLock' in navigator)) return;
    let sentinel:{release:()=>Promise<void>;released?:boolean}|null=null;
    let cancelled=false;
    const request=async()=>{try{const s=await (navigator as Navigator & {wakeLock:{request:(type:'screen')=>Promise<{release:()=>Promise<void>;released?:boolean}>}}).wakeLock.request('screen');if(cancelled)await s.release();else sentinel=s}catch{}};
    const onVisibility=()=>{if(document.visibilityState==='visible' && !sentinel)void request()};
    void request(); document.addEventListener('visibilitychange',onVisibility);
    return()=>{cancelled=true;document.removeEventListener('visibilitychange',onVisibility);if(sentinel&&!sentinel.released)void sentinel.release()};
  },[active?.id]);
  const nextSession=useMemo(()=>{if(!history.length)return 'upper-a' as SessionId;const last=history[history.length-1].session;return sequence[(sequence.indexOf(last)+1)%sequence.length]},[history]);

  function start(context:AdaptContext={}){
    const base=buildSession(nextSession);
    const adapted=adaptWorkout(base,{...context,gym:context.gym||gym});
    setNotes(adapted.notes);
    setActive({id:crypto.randomUUID(),session:nextSession,startedAt:new Date().toISOString(),status:'active',gymId:(context.gym||gym).id,exercises:adapted.exercises});
  }
  function logSet(ei:number,reps:number,weight:number,rir=2,pain=false){
    if(!active)return;const copy=structuredClone(active);copy.exercises[ei].logs.push({reps,weight,rir,pain,completedAt:new Date().toISOString()});setActive(copy);setRestUntil(Date.now()+90000);
  }
  function swap(ei:number){if(!active)return;const item=active.exercises[ei];const alt=substitutions(item,gym)[0];if(!alt)return;const copy=structuredClone(active);copy.exercises[ei]={...alt,sets:item.sets,logs:[],originalId:item.id};setActive(copy)}
  function finish(early=false){if(!active)return;const entry:HistoryEntry={session:active.session,completedAt:new Date().toISOString(),status:early?'ended-early':'completed',exercises:active.exercises};const next=[...history,entry];setHistory(next);store.saveHistory(next);store.saveActive(null);setActive(null);setRestUntil(null);setNotes(summarizeWorkout(entry.exercises,history).messages);setTab('coach')}
  const remaining=restUntil?Math.max(0,Math.ceil((restUntil-now)/1000)):0;

  if(active) return <main className="workout-shell"><header className="workout-head"><div><span className="eyebrow">LIVE WORKOUT</span><h1>{title(active.session)}</h1></div><button className="ghost" onClick={()=>finish(true)}>End early</button></header>{notes.length>0&&<div className="coach-note">{notes.join(' ')}</div>}{active.exercises.map((e,ei)=>{const prev=[...history].reverse().flatMap(h=>h.exercises).find(x=>x.id===e.id);const suggestion=nextLoadRecommendation(e,prev);const last=e.logs[e.logs.length-1];return <section className="exercise" key={`${e.id}-${ei}`}><div className="exercise-title"><div><span className="pill">{e.priority}</span><h2>{e.name}</h2><p>{e.sets} sets · {e.repRange[0]}–{e.repRange[1]} reps</p></div><button className="link" onClick={()=>swap(ei)}>Swap</button></div>{prev&&<div className="previous">Previous: {prev.logs.map(x=>`${x.weight}kg × ${x.reps}`).join(' · ')||'No logged sets'}</div>}<div className="set-grid">{Array.from({length:e.sets}).map((_,i)=><div className={i<e.logs.length?'set done':'set'} key={i}><b>Set {i+1}</b><span>{e.logs[i]?`${e.logs[i].weight} kg × ${e.logs[i].reps}${e.logs[i].pain?' · discomfort flagged':''}`:'Ready'}</span></div>)}</div>{e.logs.length<e.sets&&<SetEntry defaultWeight={last?.weight||prev?.logs.at(-1)?.weight||20} defaultReps={e.repRange[0]} onLog={(r,w,rir,pain)=>logSet(ei,r,w,rir,pain)} />}{e.equipment.includes('barbell')&&<PlateHelper target={last?.weight||prev?.logs.at(-1)?.weight||20}/>}<div className="coach-mini">Coach: {suggestion.message}</div></section>})}{restUntil&&<div className="rest-dock"><b>Rest</b><span>{remaining>0?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Ready'}</span><button onClick={()=>setRestUntil(null)}>Skip</button></div>}<button className="primary finish" onClick={()=>finish(false)}>Finish workout</button></main>;

  return <main className="app-shell"><header><div><span className="eyebrow">HUMAN HEALTH</span><h1>{tab==='today'?'Today':tab==='progress'?'Progress':'Coach'}</h1></div><select value={gym.id} onChange={e=>setGym(gyms.find(g=>g.id===e.target.value)||gyms[0])} aria-label="Gym profile">{gyms.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></header>{tab==='today'&&<><section className="hero"><span className="pill">NEXT SESSION</span><h2>{title(nextSession)}</h2><p>Structured goals. Flexible execution. Start the best version of the workout for the time, energy and equipment you have now.</p><button className="primary" onClick={()=>start()}>Start workout</button></section><section><h3>Plans changed?</h3><div className="quick-grid"><button onClick={()=>start({minutes:20})}>20 minutes</button><button onClick={()=>start({minutes:30})}>30 minutes</button><button onClick={()=>start({lowEnergy:true})}>Low energy</button><button onClick={()=>start({gym:gyms[1]})}>Different gym</button></div></section><section className="card"><h3>Your focus</h3><div className="metrics"><span><b>Strength</b> Upper/lower</span><span><b>Core</b> Built in</span><span><b>Equipment</b> {gym.name}</span><span><b>Consistency</b> {history.length} sessions</span></div></section></>}{tab==='progress'&&<section className="card"><h2>Training history</h2>{history.length?history.slice().reverse().map((h,i)=><div className="history" key={i}><b>{title(h.session)}</b><span>{new Date(h.completedAt).toLocaleDateString()}</span><small>{h.exercises.reduce((s,e)=>s+e.logs.length,0)} sets logged · {(h.status||'completed')==='ended-early'?'ended early':'completed'}</small></div>):<p>No completed workouts yet. Your history, PRs and trends will appear here.</p>}</section>}{tab==='coach'&&<section className="card"><h2>Coach</h2>{notes.length?notes.map((n,i)=><p className="coach-note" key={i}>{n}</p>):<p>Complete a workout to get an evidence-based summary and next-session guidance.</p>}<p className="muted">Recommendations are training guidance, not medical diagnosis or medication advice.</p></section>}<nav className="bottom-nav"><button className={tab==='today'?'active':''} onClick={()=>setTab('today')}>Today</button><button className={tab==='progress'?'active':''} onClick={()=>setTab('progress')}>Progress</button><button className={tab==='coach'?'active':''} onClick={()=>setTab('coach')}>Coach</button></nav></main>;
}

function SetEntry({defaultWeight,defaultReps,onLog}:{defaultWeight:number;defaultReps:number;onLog:(r:number,w:number,rir:number,pain:boolean)=>void}){const [w,setW]=useState(defaultWeight);const [r,setR]=useState(defaultReps);const [rir,setRir]=useState(2);const [pain,setPain]=useState(false);return <div className="log-box"><label>Weight (kg)<input type="number" step="0.5" value={w} onChange={e=>setW(Number(e.target.value))}/></label><label>Reps<input type="number" value={r} onChange={e=>setR(Number(e.target.value))}/></label><label>RIR<select value={rir} onChange={e=>setRir(Number(e.target.value))}><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option></select></label><label><span>Discomfort</span><input type="checkbox" checked={pain} onChange={e=>setPain(e.target.checked)} aria-label="Flag pain or unusual discomfort for this set"/></label><button className="primary" onClick={()=>onLog(r,w,rir,pain)}>{pain?'Log set + flag':'Log set'}</button></div>}
function PlateHelper({target}:{target:number}){const plan=platePlan(target);return <details><summary>Plate calculator · {target} kg</summary><p>{plan?plan.length?`Each side: ${plan.join(' + ')} kg`:'Empty bar':`Target cannot be loaded with configured plates.`}</p></details>}
