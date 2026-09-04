'use client';

import {useEffect,useMemo,useState} from 'react';
import type {HistoryEntry} from '@/lib/domain';
import {coordinateCardio,powerAllowed,recentTrainingLoad} from '@/lib/load-management';
import {defaultPreferences,normalizePreferences,UserPreferences} from '@/lib/preferences';
import {store} from '@/lib/storage';
import {
  ActivityDose,
  ActivityKind,
  Assessment,
  CapabilityDomain,
  CardioModality,
  ReadinessInput,
  assessmentTrend,
  athleticPlan,
  capabilityMetrics,
  cardioOptions,
  cardioPrescription,
  incidentalMovementMinutes,
  latestAssessment,
  minimumEffectiveOptions,
  mobilitySessions,
  plannedCardioEquivalentMinutes,
  progressionTracks,
  readinessDecision,
  readinessTrend,
  skillTrees,
  targetProgress,
} from '@/lib/whole-person';

function isRecent(item:{completedAt:string},now=Date.now()){return now-new Date(item.completedAt).getTime()<=7*24*60*60*1000}
const cardioModalities:CardioModality[]=['walk','run','cycle','row','incline-treadmill','other'];

export function TodayWholePerson({strengthSessions,history=[]}:{strengthSessions:number;history?:HistoryEntry[]}){
  const [activity,setActivity]=useState<ActivityDose[]>([]);
  const [readiness,setReadiness]=useState<ReadinessInput>({sleep:'okay',sleepHours:7,fatigue:'moderate',soreness:'low',stress:'moderate',subjective:3});
  const [savedReadiness,setSavedReadiness]=useState<ReadinessInput|undefined>();
  const [readinessRecords,setReadinessRecords]=useState<{recordedAt:string;input:ReadinessInput}[]>([]);
  const [minutes,setMinutes]=useState(20);
  const [effort,setEffort]=useState<'easy'|'moderate'|'hard'>('moderate');
  const [kind,setKind]=useState<ActivityKind>('planned');
  const [modality,setModality]=useState<CardioModality>('walk');
  const [skills,setSkills]=useState<Record<string,string>>({});
  const [progressions,setProgressions]=useState<Record<string,string>>({});
  const [assessments,setAssessments]=useState<Assessment[]>([]);
  const [preferences,setPreferences]=useState<UserPreferences>(defaultPreferences);

  useEffect(()=>{
    setActivity(store.loadActivity());
    const checks=store.loadReadiness();
    setReadinessRecords(checks);
    if(checks.length){
      const latest=checks.at(-1)!.input;
      setSavedReadiness(latest);
      setReadiness(latest);
    }
    setSkills(store.loadSkills());
    setProgressions(store.loadProgressions());
    setAssessments(store.loadAssessments());
    const saved=store.loadPreferences();
    setPreferences(saved);
    setModality(saved.preferredCardio);
  },[]);

  const recentActivity=useMemo(()=>activity.filter(item=>isRecent(item)),[activity]);
  const cardioMinutes=useMemo(()=>plannedCardioEquivalentMinutes(recentActivity),[recentActivity]);
  const incidentalMinutes=useMemo(()=>incidentalMovementMinutes(recentActivity),[recentActivity]);
  const quick=minimumEffectiveOptions(10,['mobility','core','bodyweight']);
  const decision=readinessDecision(savedReadiness||{});
  const prescription=cardioPrescription(cardioMinutes,preferences.weeklyCardioTarget,30);
  const load=useMemo(()=>recentTrainingLoad(history,activity),[history,activity]);
  const cardioChoices=coordinateCardio(cardioOptions(cardioMinutes,preferences.weeklyCardioTarget,decision.level,30),load,decision.level);
  const recoveryTrend=readinessTrend(readinessRecords);
  const power=powerAllowed(load,decision.level,preferences.highImpactEnabled);
  const athletic=athleticPlan(assessments,decision.level,{highImpactEnabled:preferences.highImpactEnabled}).filter(plan=>plan.domain!=='power'||power.allowed);

  function savePreferences(next:UserPreferences){
    const normalized=normalizePreferences(next);
    store.savePreferences(normalized);
    setPreferences(normalized);
  }

  function saveCheck(){
    const next=[...store.loadReadiness(),{recordedAt:new Date().toISOString(),input:readiness}].slice(-90);
    store.saveReadiness(next);
    setReadinessRecords(next);
    setSavedReadiness(readiness);
  }

  function logCardio(){
    const dose:ActivityDose={domain:'cardio',minutes,effort,kind,modality,sessionType:effort==='hard'?'intervals':effort==='easy'?'recovery':'steady',sessionId:`manual-cardio:${modality}`,completedAt:new Date().toISOString()};
    const next=[...activity,dose];
    store.saveActivity(next);
    setActivity(next);
    savePreferences({...preferences,preferredCardio:modality});
  }

  function logMicro(domain:CapabilityDomain,sessionMinutes:number,sessionId?:string){
    const dose:ActivityDose={domain,minutes:sessionMinutes,effort:'easy',kind:'planned',sessionId,completedAt:new Date().toISOString()};
    const next=[...activity,dose];
    store.saveActivity(next);
    setActivity(next);
  }

  function setSkill(treeId:string,stepId:string){
    const next={...skills,[treeId]:stepId};
    store.saveSkills(next);
    setSkills(next);
  }

  function setProgression(trackId:string,levelId:string){
    const next={...progressions,[trackId]:levelId};
    store.saveProgressions(next);
    setProgressions(next);
  }

  return <>
    <section className="card" aria-labelledby="whole-person-title">
      <h3 id="whole-person-title">Whole-person fitness</h3>
      <div className="metrics">
        <span><b>Strength</b>{strengthSessions}/4 recent sessions</span>
        <span><b>Planned cardio</b>{Math.round(cardioMinutes)}/{preferences.weeklyCardioTarget} equivalent min</span>
        <span><b>Incidental movement</b>{Math.round(incidentalMinutes)} min logged separately</span>
        <span><b>Mobility</b>{recentActivity.filter(item=>item.domain==='mobility').length} recent sessions</span>
        <span><b>Body control</b>{Object.keys(skills).length} skills in progress</span>
        <span><b>Recovery</b>{decision.level}</span>
      </div>
      <div className="coach-note"><b>Cardio next step</b><br/>{prescription.message}</div>
      {quick[0]&&<p className="muted">Short on time? {quick[0].name} takes about {quick[0].minutes} minutes and complements rather than replaces the main plan.</p>}
    </section>

    <section className="card" aria-labelledby="readiness-title">
      <h3 id="readiness-title">Readiness check</h3>
      <p className="muted">Optional context changes training demand only when it is useful. It does not create a diagnosis.</p>
      <div className="metrics">
        <label><b>Sleep quality</b><select value={readiness.sleep||'okay'} onChange={event=>setReadiness({...readiness,sleep:event.target.value as ReadinessInput['sleep']})}><option value="poor">Poor</option><option value="okay">Okay</option><option value="good">Good</option></select></label>
        <label><b>Sleep hours</b><input type="number" min="0" max="14" step="0.25" value={readiness.sleepHours??''} onChange={event=>setReadiness({...readiness,sleepHours:Number(event.target.value)})}/></label>
        <label><b>Fatigue</b><select value={readiness.fatigue||'moderate'} onChange={event=>setReadiness({...readiness,fatigue:event.target.value as ReadinessInput['fatigue']})}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Soreness</b><select value={readiness.soreness||'low'} onChange={event=>setReadiness({...readiness,soreness:event.target.value as ReadinessInput['soreness']})}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Stress</b><select value={readiness.stress||'moderate'} onChange={event=>setReadiness({...readiness,stress:event.target.value as ReadinessInput['stress']})}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>How ready do you feel?</b><select value={readiness.subjective||3} onChange={event=>setReadiness({...readiness,subjective:Number(event.target.value) as ReadinessInput['subjective']})}><option value="1">1 — very low</option><option value="2">2 — low</option><option value="3">3 — okay</option><option value="4">4 — good</option><option value="5">5 — excellent</option></select></label>
      </div>
      <div className="quick-grid">
        <button onClick={()=>setReadiness({...readiness,illness:!readiness.illness})}>{readiness.illness?'Illness flagged':'Flag illness'}</button>
        <button onClick={()=>setReadiness({...readiness,pain:!readiness.pain})}>{readiness.pain?'Pain flagged':'Flag pain'}</button>
        <button className="primary" onClick={saveCheck}>Save check-in</button>
      </div>
      <div className="coach-note"><b>{decision.level==='normal'?'Normal training':decision.level==='reduced'?'Reduce optional volume':'Recovery-first'}</b><br/>{decision.reasons.join(' ')||'No major recovery constraints are currently recorded.'}</div>
      <p className="muted"><b>7-day pattern:</b> {recoveryTrend.message} Normal {recoveryTrend.normal} · reduced {recoveryTrend.reduced} · recovery-first {recoveryTrend.recovery}.</p>
    </section>

    <section className="card" aria-labelledby="cardio-log-title">
      <h3 id="cardio-log-title">Cardio and daily movement</h3>
      <div className="log-box">
        <label>Weekly planned target<input type="number" min="0" max="600" value={preferences.weeklyCardioTarget} onChange={event=>savePreferences({...preferences,weeklyCardioTarget:Number(event.target.value)})}/></label>
        <label>Modality<select value={modality} onChange={event=>setModality(event.target.value as CardioModality)}>{cardioModalities.map(item=><option key={item} value={item}>{item.replace('-',' ')}</option>)}</select></label>
        <label>Record as<select value={kind} onChange={event=>setKind(event.target.value as ActivityKind)}><option value="planned">Planned cardio</option><option value="incidental">Incidental movement</option></select></label>
      </div>
      <div className="quick-grid">{cardioChoices.map(choice=><button key={choice.type} onClick={()=>{setMinutes(Math.max(1,choice.minutes));setEffort(choice.effort);setKind('planned')}}><b>{choice.name}</b><br/><small>{choice.minutes} min · {choice.effort}</small></button>)}</div>
      {load.hoursSinceLower!==null&&load.hoursSinceLower<36&&<p className="coach-note">Recent lower-body work: {load.lowerSets} sets. Hard intervals are deferred when that workload is demanding.</p>}
      <div className="log-box">
        <label>Minutes<input type="number" min="1" max="240" value={minutes} onChange={event=>setMinutes(Math.max(1,Number(event.target.value)))}/></label>
        <label>Effort<select value={effort} onChange={event=>setEffort(event.target.value as typeof effort)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option></select></label>
        <button className="primary" onClick={logCardio}>Log {kind==='planned'?'cardio':'movement'}</button>
      </div>
      <p className="muted">Planned and incidental activity remain distinguishable. Hard planned minutes count as roughly double only for training planning, not as a medical fitness score.</p>
    </section>

    <section className="card" aria-labelledby="mobility-title">
      <h3 id="mobility-title">Mobility intent</h3>
      <p className="muted">Preparation is short and movement-specific; longer flexibility work is relaxed and performed separately when appropriate.</p>
      {mobilitySessions.map(session=><div className="history" key={session.id}><b>{session.name}</b><span>{session.minutes} min · {session.purpose}</span><small>{session.items.join(' · ')}</small><button className="link" onClick={()=>logMicro('mobility',session.minutes,`mobility:${session.id}`)}>Mark done</button></div>)}
    </section>

    <section className="card" aria-labelledby="athletic-title">
      <h3 id="athletic-title">Athleticism</h3>
      <p className="muted">Power, balance, coordination and practical movement stay low-volume so they support strength and health rather than becoming random fatigue.</p>
      {!power.allowed&&<div className="coach-note">{power.reason}</div>}
      {athletic.map(plan=><div className="history" key={`${plan.domain}-${plan.name}`}><b>{plan.name}</b><span>{plan.domain} · {plan.impact}</span><small>{plan.items.join(' · ')} · {plan.reason}</small><button className="link" onClick={()=>logMicro(plan.domain,10,`athletic:${plan.domain}`)}>Mark 10 min done</button></div>)}
    </section>

    <section className="card" aria-labelledby="progression-title">
      <h3 id="progression-title">Core and mobility progression</h3>
      {progressionTracks.map(track=>{
        const current=track.levels.find(level=>level.id===progressions[track.id])||track.levels[0];
        return <div key={track.id} className="history" style={{display:'block'}}><b>{track.name}</b><p className="muted">{current.name}: {current.target}</p><small>{current.items.join(' · ')}</small><div className="quick-grid">{track.levels.map(level=><button key={level.id} className={current.id===level.id?'active':''} onClick={()=>setProgression(track.id,level.id)}>{level.name}</button>)}<button className="primary" onClick={()=>logMicro(track.domain,8,`${track.id}:${current.id}`)}>Complete 8 min</button></div></div>;
      })}
    </section>

    <section className="card" aria-labelledby="skill-title">
      <h3 id="skill-title">Bodyweight skills</h3>
      {skillTrees.map(tree=><div key={tree.id} className="history" style={{display:'block'}}><b>{tree.name}</b><p className="muted">Choose the step you can perform cleanly; measured assessments and repeatable targets determine progression.</p><div className="quick-grid">{tree.steps.map(step=><button key={step.id} className={skills[tree.id]===step.id?'active':''} onClick={()=>setSkill(tree.id,step.id)}>{step.name}</button>)}</div>{skills[tree.id]&&<small>{tree.steps.find(step=>step.id===skills[tree.id])?.target}</small>}</div>)}
    </section>
  </>;
}

export function CapabilityPanel({history=[]}:{history?:HistoryEntry[]}){
  const [activity,setActivity]=useState<ActivityDose[]>([]);
  const [assessments,setAssessments]=useState<Assessment[]>([]);
  const [checks,setChecks]=useState<{recordedAt:string;input:ReadinessInput}[]>([]);
  const [preferences,setPreferences]=useState<UserPreferences>(defaultPreferences);
  const [metricId,setMetricId]=useState('pullups');
  const [value,setValue]=useState(0);

  useEffect(()=>{
    setActivity(store.loadActivity());
    setAssessments(store.loadAssessments());
    setChecks(store.loadReadiness());
    setPreferences(store.loadPreferences());
  },[]);

  const recentActivity=activity.filter(item=>isRecent(item));
  const cardio=plannedCardioEquivalentMinutes(recentActivity);
  const readinessSummary=readinessTrend(checks);

  function recordAssessment(){
    const entry:Assessment={metricId,value,recordedAt:new Date().toISOString()};
    const next=[...assessments,entry];
    store.saveAssessments(next);
    setAssessments(next);
  }

  return <section className="card" aria-labelledby="capability-title">
    <h2 id="capability-title">Capability map</h2>
    <p className="muted">Each domain stays measurable on its own. Priorities shape recommendations, but Human Health does not collapse them into a universal medical health score.</p>
    <div className="metrics">
      <span><b>Planned cardio</b>{Math.round(targetProgress(cardio,preferences.weeklyCardioTarget)*100)}% of weekly target</span>
      <span><b>Training consistency</b>{history.filter(item=>isRecent(item)).length} strength sessions in 7 days</span>
      <span><b>Recovery evidence</b>{checks.filter(item=>isRecent(item)).length} check-ins · {readinessSummary.reduced+readinessSummary.recovery} constrained</span>
      <span><b>Recorded domains</b>{new Set(activity.map(item=>item.domain)).size} of 10</span>
    </div>
    <div className="log-box">
      <label>Assessment<select value={metricId} onChange={event=>setMetricId(event.target.value)}>{capabilityMetrics.filter(metric=>!['readiness-pattern','training-consistency'].includes(metric.id)).map(metric=><option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label>
      <label>Value<input type="number" value={value} onChange={event=>setValue(Number(event.target.value))}/></label>
      <button className="primary" onClick={recordAssessment}>Record test</button>
    </div>
    {capabilityMetrics.map(metric=>{
      const latest=latestAssessment(assessments,metric.id);
      const trend=assessmentTrend(assessments,metric.id);
      const derived=metric.id==='readiness-pattern'?`${checks.filter(item=>isRecent(item)).length} recent check-ins`:metric.id==='training-consistency'?`${history.filter(item=>isRecent(item)).length} recent sessions`:null;
      return <div className="history" key={metric.id}><b>{metric.name}</b><span>{derived||latest?derived||`${latest!.value} ${metric.unit}`:'Insufficient data'}</span><small>{metric.domain} · {metric.description}{trend!==null?` · change ${trend>0?'+':''}${trend}`:''} · priority {preferences.goals[metric.domain]||'maintain'}</small></div>;
    })}
  </section>;
}
