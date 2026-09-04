'use client';

import {useEffect,useMemo,useState} from 'react';
import type {Equipment,HistoryEntry} from '@/lib/domain';
import {athleticLevelSession,AthleticLevel,recommendAthleticProgression} from '@/lib/athletic-progression';
import {powerAllowed,recentTrainingLoad} from '@/lib/load-management';
import {athleticRecommendation,LifeMode,minimumEffectiveDay,recommendSkillProgression,SkillAssessment} from '@/lib/performance';
import {capabilityDomains,defaultPreferences,GoalPriority,normalizePreferences,UserPreferences} from '@/lib/preferences';
import {store} from '@/lib/storage';
import {ActivityDose,Assessment,ReadinessRecord,microSessions,readinessDecision,skillTrees} from '@/lib/whole-person';

export function PerformancePanel({history,equipment=[],onStartOriginal}:{history:HistoryEntry[];equipment?:Equipment[];onStartOriginal?:()=>void}){
  const [minutes,setMinutes]=useState(20);
  const [skills,setSkills]=useState<Record<string,string>>({});
  const [assessments,setAssessments]=useState<SkillAssessment[]>([]);
  const [capabilityAssessments,setCapabilityAssessments]=useState<Assessment[]>([]);
  const [progressions,setProgressions]=useState<Record<string,string>>({});
  const [activity,setActivity]=useState<ActivityDose[]>([]);
  const [checks,setChecks]=useState<ReadinessRecord[]>([]);
  const [preferences,setPreferences]=useState<UserPreferences>(defaultPreferences);
  const [measurements,setMeasurements]=useState<Record<string,number>>({});

  useEffect(()=>{
    setSkills(store.loadSkills());
    setAssessments(store.loadSkillAssessments());
    setCapabilityAssessments(store.loadAssessments());
    setProgressions(store.loadProgressions());
    setActivity(store.loadActivity());
    setChecks(store.loadReadiness());
    setPreferences(store.loadPreferences());
  },[]);

  const readiness=readinessDecision(checks.at(-1)?.input||{});
  const mode=preferences.lifeMode as LifeMode;
  const plan=useMemo(()=>minimumEffectiveDay({availableMinutes:minutes,activity,readiness,mode,goals:preferences.goals,equipment}),[minutes,activity,readiness.level,readiness.volumeMultiplier,mode,preferences.goals,equipment]);
  const load=useMemo(()=>recentTrainingLoad(history,activity),[history,activity]);
  const power=powerAllowed(load,readiness.level,preferences.highImpactEnabled);
  const athletic=athleticRecommendation({
    pain:checks.at(-1)?.input.pain,
    lowEnergy:readiness.level!=='normal',
    highImpactOkay:mode!=='return'&&power.allowed,
    highImpactEnabled:preferences.highImpactEnabled,
    recentLowerBody:load.hoursSinceLower!==null&&load.hoursSinceLower<36&&load.lowerSets>=6,
    recentHardCardio:load.hoursSinceHardCardio!==null&&load.hoursSinceHardCardio<24&&load.hardCardioMinutes>=12,
  });

  function savePreferences(next:UserPreferences){
    const normalized=normalizePreferences(next);
    store.savePreferences(normalized);
    setPreferences(normalized);
  }

  function setMode(next:LifeMode){savePreferences({...preferences,lifeMode:next})}
  function setGoal(domain:keyof UserPreferences['goals'],priority:GoalPriority){savePreferences({...preferences,goals:{...preferences.goals,[domain]:priority}})}

  function completePlan(){
    const completedAt=new Date().toISOString();
    const doses=plan.sessionIds.flatMap(id=>{
      const session=microSessions.find(item=>item.id===id);
      return session?[{domain:session.domain,minutes:session.minutes,effort:'easy' as const,kind:'planned' as const,sessionId:`daily:${mode}:${id}`,completedAt}]:[];
    });
    const next=[...activity,...doses];
    store.saveActivity(next);
    setActivity(next);
  }

  function assess(treeId:string,passed:boolean,pain=false){
    const tree=skillTrees.find(item=>item.id===treeId);
    if(!tree)return;
    const stepId=skills[treeId]||tree.steps[0].id;
    const step=tree.steps.find(item=>item.id===stepId)||tree.steps[0];
    const value=measurements[treeId];
    const unit=step.measure==='seconds'?'seconds':step.measure==='load'?'kg':step.measure==='assistance'?'assistance':'reps';
    const entry:SkillAssessment={treeId,stepId,passed,clean:passed&&!pain,pain,recordedAt:new Date().toISOString(),value:Number.isFinite(value)?value:undefined,unit,load:step.measure==='load'?value:undefined,assistance:step.measure==='assistance'?value:undefined};
    const next=[...assessments,entry];
    store.saveSkillAssessments(next);
    setAssessments(next);
    const recommendation=recommendSkillProgression(treeId,stepId,next);
    if(recommendation.action!=='hold'){
      const nextSkills={...skills,[treeId]:recommendation.stepId};
      store.saveSkills(nextSkills);
      setSkills(nextSkills);
    }
  }

  function applyAthletic(metricId:'single-leg-balance'|'jump',level:AthleticLevel){
    const next={...progressions,[`athletic:${metricId}`]:level};
    store.saveProgressions(next);
    setProgressions(next);
  }

  const recommendations=useMemo(()=>skillTrees.map(tree=>{
    const step=skills[tree.id]||tree.steps[0].id;
    return {tree,step,recommendation:recommendSkillProgression(tree.id,step,assessments)};
  }),[skills,assessments]);

  const athleticProgressions=(['single-leg-balance','jump'] as const).map(metricId=>{
    const level=(progressions[`athletic:${metricId}`] as AthleticLevel)||'foundation';
    return {metricId,level,decision:recommendAthleticProgression({metricId,assessments:capabilityAssessments,currentLevel:level,readiness:readiness.level})};
  });

  return <>
    <section className="card" aria-labelledby="life-mode-title">
      <h3 id="life-mode-title">Today can change</h3>
      <p className="muted">Choose the situation you are actually in. Temporary modes preserve the long-term plan rather than treating a changed day as failure.</p>
      <div className="quick-grid">
        {(['normal','busy','travel','return','maintenance','recovery'] as LifeMode[]).map(item=><button key={item} className={mode===item?'active':''} onClick={()=>setMode(item)}>{item==='return'?'Return to training':item[0].toUpperCase()+item.slice(1)}</button>)}
      </div>
      <label>Available minutes <input type="number" min="8" max="120" value={minutes} onChange={event=>setMinutes(Math.max(8,Number(event.target.value)))}/></label>
      <div className="coach-note"><b>{mode} plan · {plan.minutes} min</b><br/>{plan.message}{plan.sessionIds.length?` Suggested: ${plan.sessionIds.map(id=>microSessions.find(item=>item.id===id)?.name||id).join(' + ')}.`:''}</div>
      <div className="quick-grid">
        {plan.sessionIds.length>0&&<button className="primary" onClick={completePlan}>Mark suggested work done</button>}
        {onStartOriginal&&<button onClick={onStartOriginal}>Use original strength workout</button>}
      </div>
    </section>

    <section className="card" aria-labelledby="priorities-title">
      <h3 id="priorities-title">Capability priorities</h3>
      <p className="muted">Priorities rank recommendations without inventing a universal health score. Deprioritized domains remain visible but do not drive catch-up work.</p>
      <div className="metrics">
        {capabilityDomains.map(domain=><label key={domain}><b>{domain[0].toUpperCase()+domain.slice(1)}</b><select value={preferences.goals[domain]||'maintain'} onChange={event=>setGoal(domain,event.target.value as GoalPriority)}><option value="focus">Focus</option><option value="maintain">Maintain</option><option value="deprioritize">Deprioritize</option></select></label>)}
      </div>
    </section>

    <section className="card" aria-labelledby="skill-assessment-title">
      <h3 id="skill-assessment-title">Bodyweight skill assessments</h3>
      <p className="muted">Record the actual reps, seconds, load, or assistance. Advancement still requires two clean passes, and discomfort never triggers progression.</p>
      {recommendations.map(({tree,step,recommendation})=>{
        const current=tree.steps.find(item=>item.id===step)||tree.steps[0];
        const label=current.measure==='seconds'?'Seconds':current.measure==='load'?'Added load (kg)':current.measure==='assistance'?'Assistance level/load':'Reps';
        return <div key={tree.id} className="history" style={{display:'block'}}>
          <b>{tree.name}: {current.name}</b>
          <p className="muted">Target: {current.target}</p>
          <label>{label}<input type="number" min="0" step={current.measure==='load'?0.5:1} value={measurements[tree.id]??''} onChange={event=>setMeasurements({...measurements,[tree.id]:Number(event.target.value)})}/></label>
          <div className="coach-note">{recommendation.message}</div>
          <div className="quick-grid"><button onClick={()=>assess(tree.id,true)}>Target met cleanly</button><button onClick={()=>assess(tree.id,false)}>Not yet</button><button onClick={()=>assess(tree.id,false,true)}>Discomfort</button></div>
        </div>;
      })}
    </section>

    <section className="card" aria-labelledby="athletic-title">
      <h3 id="athletic-title">Athleticism</h3>
      <p className="muted">Power, balance, coordination and practical movement are trained in small doses and coordinated with recent strength/cardio load.</p>
      <label><input type="checkbox" checked={preferences.highImpactEnabled} onChange={event=>savePreferences({...preferences,highImpactEnabled:event.target.checked})}/> Allow optional high-impact power work</label>
      <div className="coach-note"><b>Recent training context</b><br/>{power.reason}</div>
      <b>{athletic.name} · {athletic.minutes} min</b><p>{athletic.items.join(' · ')}</p><small>{athletic.impact} impact recommendation based on preferences, recovery and recent training load.</small>
      {athleticProgressions.map(({metricId,level,decision})=><div className="history" key={metricId} style={{marginTop:14}}><b>{metricId==='jump'?'Jump/power':'Single-leg balance'} · {level}</b><span>{decision.evidenceCount} tests</span><small>{decision.message}</small><p className="muted">Current work: {athleticLevelSession(metricId,level).join(' · ')}</p>{decision.action!=='hold'&&<button className="link" onClick={()=>applyAthletic(metricId,decision.nextLevel)}>Apply {decision.action}: {decision.nextLevel}</button>}</div>)}
    </section>
  </>;
}
