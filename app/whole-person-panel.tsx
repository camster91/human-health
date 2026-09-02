'use client';
import { useEffect, useMemo, useState } from 'react';
import { store } from '@/lib/storage';
import { ActivityDose, CapabilityDomain, ReadinessInput, capabilityMetrics, cardioEquivalentMinutes, minimumEffectiveOptions, readinessDecision, skillTrees, targetProgress, weeklyMinutes, weeklyTargets } from '@/lib/whole-person';

export function TodayWholePerson({strengthSessions}:{strengthSessions:number}){
  const [activity,setActivity]=useState<ActivityDose[]>([]);
  const [readiness,setReadiness]=useState<ReadinessInput>({sleep:'okay',fatigue:'moderate',soreness:'low',stress:'moderate'});
  const [savedReadiness,setSavedReadiness]=useState<ReadinessInput|undefined>();
  const [minutes,setMinutes]=useState(20);
  const [effort,setEffort]=useState<'easy'|'moderate'|'hard'>('moderate');
  const [skills,setSkills]=useState<Record<string,string>>({});

  useEffect(()=>{
    setActivity(store.loadActivity());
    const checks=store.loadReadiness();
    if(checks.length){setSavedReadiness(checks[checks.length-1].input);setReadiness(checks[checks.length-1].input)}
    setSkills(store.loadSkills());
  },[]);

  const cardioTarget=weeklyTargets.find(t=>t.domain==='cardio')?.minutes||150;
  const cardioMinutes=useMemo(()=>activity.filter(d=>d.domain==='cardio').reduce((sum,d)=>sum+cardioEquivalentMinutes(d.minutes||0,d.effort||'moderate'),0),[activity]);
  const quick=minimumEffectiveOptions(10,['mobility','core','bodyweight']);
  const decision=readinessDecision(savedReadiness||{});

  function saveCheck(){
    const next=[...store.loadReadiness(),{recordedAt:new Date().toISOString(),input:readiness}].slice(-30);
    store.saveReadiness(next); setSavedReadiness(readiness);
  }

  function logCardio(){
    const dose:ActivityDose={domain:'cardio',minutes,effort,completedAt:new Date().toISOString()};
    const next=[...activity,dose]; store.saveActivity(next); setActivity(next);
  }

  function logMicro(domain:CapabilityDomain,sessionMinutes:number){
    const dose:ActivityDose={domain,minutes:sessionMinutes,effort:'easy',completedAt:new Date().toISOString()};
    const next=[...activity,dose]; store.saveActivity(next); setActivity(next);
  }

  function advanceSkill(treeId:string,stepId:string){
    const next={...skills,[treeId]:stepId}; store.saveSkills(next); setSkills(next);
  }

  return <>
    <section className="card" aria-labelledby="whole-person-title">
      <h3 id="whole-person-title">Whole-person fitness</h3>
      <div className="metrics">
        <span><b>Strength</b>{strengthSessions}/4 recent sessions</span>
        <span><b>Cardio</b>{Math.round(cardioMinutes)}/{cardioTarget} equivalent min</span>
        <span><b>Mobility</b>{activity.filter(d=>d.domain==='mobility').length} logged sessions</span>
        <span><b>Body control</b>{Object.keys(skills).length} skills in progress</span>
      </div>
      {quick[0]&&<p className="muted" style={{marginTop:12,marginBottom:0}}>Short on time? {quick[0].name} takes about {quick[0].minutes} minutes and can complement—not replace—the main plan.</p>}
    </section>

    <section className="card" aria-labelledby="readiness-title">
      <h3 id="readiness-title">Readiness check</h3>
      <p className="muted">A quick check helps adjust training demand without treating recovery signals as a medical diagnosis.</p>
      <div className="metrics">
        <label><b>Sleep</b><select value={readiness.sleep||'okay'} onChange={e=>setReadiness({...readiness,sleep:e.target.value as ReadinessInput['sleep']})}><option value="poor">Poor</option><option value="okay">Okay</option><option value="good">Good</option></select></label>
        <label><b>Fatigue</b><select value={readiness.fatigue||'moderate'} onChange={e=>setReadiness({...readiness,fatigue:e.target.value as ReadinessInput['fatigue']})}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Soreness</b><select value={readiness.soreness||'low'} onChange={e=>setReadiness({...readiness,soreness:e.target.value as ReadinessInput['soreness']})}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Stress</b><select value={readiness.stress||'moderate'} onChange={e=>setReadiness({...readiness,stress:e.target.value as ReadinessInput['stress']})}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
      </div>
      <div className="quick-grid" style={{marginTop:12}}>
        <button onClick={()=>setReadiness({...readiness,illness:!readiness.illness})}>{readiness.illness?'Illness flagged':'Flag illness'}</button>
        <button onClick={()=>setReadiness({...readiness,pain:!readiness.pain})}>{readiness.pain?'Pain flagged':'Flag pain'}</button>
        <button className="primary" onClick={saveCheck}>Save check-in</button>
      </div>
      <div className="coach-note"><b>{decision.level==='normal'?'Normal training':decision.level==='reduced'?'Reduce optional volume':'Recovery-first'}</b><br/>{decision.reasons.length?decision.reasons.join(' '):'No major recovery constraints are currently recorded.'}</div>
    </section>

    <section className="card" aria-labelledby="cardio-log-title">
      <h3 id="cardio-log-title">Log cardio</h3>
      <div className="log-box">
        <label>Minutes<input type="number" min="1" max="240" value={minutes} onChange={e=>setMinutes(Math.max(1,Number(e.target.value)))}/></label>
        <label>Effort<select value={effort} onChange={e=>setEffort(e.target.value as typeof effort)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option></select></label>
        <button className="primary" onClick={logCardio}>Log cardio</button>
      </div>
      <p className="muted" style={{marginTop:10}}>Hard minutes count as roughly double for the app's planning target; this is a training-planning convention, not a medical fitness score.</p>
    </section>

    <section className="card" aria-labelledby="quick-work-title">
      <h3 id="quick-work-title">Quick whole-person work</h3>
      {quick.map(s=><div className="history" key={s.id}><b>{s.name}</b><span>{s.minutes} min</span><small>{s.items.join(' · ')}</small><button className="link" onClick={()=>logMicro(s.domain,s.minutes)}>Mark done</button></div>)}
    </section>

    <section className="card" aria-labelledby="skill-title">
      <h3 id="skill-title">Bodyweight skills</h3>
      {skillTrees.map(tree=><div key={tree.id} style={{marginBottom:18}}><b>{tree.name}</b><p className="muted">Choose the step you can currently perform cleanly. Progress only when its target is repeatable.</p><div className="quick-grid">{tree.steps.map(step=><button key={step.id} className={skills[tree.id]===step.id?'active':''} onClick={()=>advanceSkill(tree.id,step.id)}>{step.name}</button>)}</div>{skills[tree.id]&&<small>{tree.steps.find(s=>s.id===skills[tree.id])?.target}</small>}</div>)}
    </section>
  </>;
}

export function CapabilityPanel(){
  const [activity,setActivity]=useState<ActivityDose[]>([]);
  useEffect(()=>setActivity(store.loadActivity()),[]);
  const cardioTarget=weeklyTargets.find(t=>t.domain==='cardio')?.minutes||150;
  const cardio=weeklyMinutes(activity,'cardio');
  return <section className="card" aria-labelledby="capability-title">
    <h2 id="capability-title">Capability map</h2>
    <p className="muted">Each domain stays measurable on its own. Human Health does not collapse these into a universal health score.</p>
    <div className="metrics" style={{marginBottom:16}}><span><b>Cardio target</b>{Math.round(targetProgress(cardio,cardioTarget)*100)}% of weekly minutes</span><span><b>Recorded domains</b>{new Set(activity.map(a=>a.domain)).size} active</span></div>
    {capabilityMetrics.map(metric=><div className="history" key={metric.id}>
      <b>{metric.name}</b><span>{metric.unit}</span><small>{metric.domain} · {metric.description}</small>
    </div>)}
  </section>;
}
