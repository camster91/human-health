'use client';
import { useEffect, useMemo, useState } from 'react';
import { store } from '@/lib/storage';
import { athleticRecommendation, LifeMode, minimumEffectiveDay, recommendSkillProgression, SkillAssessment } from '@/lib/performance';
import { athleticLevelSession, AthleticLevel, recommendAthleticProgression } from '@/lib/athletic-progression';
import { Assessment, microSessions, readinessDecision, skillTrees } from '@/lib/whole-person';

export function PerformancePanel(){
  const [mode,setMode]=useState<LifeMode>('normal');
  const [minutes,setMinutes]=useState(20);
  const [skills,setSkills]=useState<Record<string,string>>({});
  const [assessments,setAssessments]=useState<SkillAssessment[]>([]);
  const [capabilityAssessments,setCapabilityAssessments]=useState<Assessment[]>([]);
  const [progressions,setProgressions]=useState<Record<string,string>>({});
  const [,rerender]=useState(0);

  useEffect(()=>{setSkills(store.loadSkills());setAssessments(store.loadSkillAssessments());setCapabilityAssessments(store.loadAssessments());setProgressions(store.loadProgressions())},[]);
  const activity=store.loadActivity();
  const checks=store.loadReadiness();
  const readiness=readinessDecision(checks.at(-1)?.input||{});
  const plan=minimumEffectiveDay({availableMinutes:minutes,activity,readiness,mode});
  const athletic=athleticRecommendation({pain:checks.at(-1)?.input.pain,lowEnergy:readiness.level!=='normal',highImpactOkay:mode!=='return'});

  function completePlan(){
    const now=new Date().toISOString();
    const doses=plan.sessionIds.flatMap(id=>{const session=microSessions.find(s=>s.id===id);return session?[{domain:session.domain,minutes:session.minutes,effort:'easy' as const,sessionId:`daily:${mode}:${id}`,completedAt:now}]:[]});
    store.saveActivity([...store.loadActivity(),...doses]);rerender(x=>x+1);
  }

  function assess(treeId:string,passed:boolean,pain=false){
    const tree=skillTrees.find(t=>t.id===treeId);if(!tree)return;
    const stepId=skills[treeId]||tree.steps[0].id;
    const entry:SkillAssessment={treeId,stepId,passed,clean:passed&&!pain,pain,recordedAt:new Date().toISOString()};
    const next=[...assessments,entry];store.saveSkillAssessments(next);setAssessments(next);
    const recommendation=recommendSkillProgression(treeId,stepId,next);
    if(recommendation.action!=='hold'){const nextSkills={...skills,[treeId]:recommendation.stepId};store.saveSkills(nextSkills);setSkills(nextSkills)}
  }

  function applyAthletic(metricId:'single-leg-balance'|'jump',level:AthleticLevel){
    const next={...progressions,[`athletic:${metricId}`]:level};
    store.saveProgressions(next);setProgressions(next);
  }

  const recommendations=useMemo(()=>skillTrees.map(tree=>{const step=skills[tree.id]||tree.steps[0].id;return {tree,step,recommendation:recommendSkillProgression(tree.id,step,assessments)} }),[skills,assessments]);
  const athleticProgressions=(['single-leg-balance','jump'] as const).map(metricId=>{
    const level=(progressions[`athletic:${metricId}`] as AthleticLevel)||'foundation';
    return {metricId,level,decision:recommendAthleticProgression({metricId,assessments:capabilityAssessments,currentLevel:level,readiness:readiness.level})};
  });

  return <>
    <section className="card" aria-labelledby="life-mode-title">
      <h3 id="life-mode-title">Today can change</h3>
      <p className="muted">Pick the situation you are actually in. The app protects the goal instead of forcing the original plan.</p>
      <div className="quick-grid">
        {(['normal','travel','return','maintenance'] as LifeMode[]).map(item=><button key={item} className={mode===item?'active':''} onClick={()=>setMode(item)}>{item==='return'?'Return to training':item[0].toUpperCase()+item.slice(1)}</button>)}
      </div>
      <label>Available minutes <input type="number" min="8" max="120" value={minutes} onChange={e=>setMinutes(Math.max(8,Number(e.target.value)))}/></label>
      <div className="coach-note"><b>{mode} plan · {plan.minutes} min</b><br/>{plan.message}{plan.sessionIds.length?` Suggested: ${plan.sessionIds.map(id=>microSessions.find(s=>s.id===id)?.name||id).join(' + ')}.`:''}</div>
      {plan.sessionIds.length>0&&<button className="primary" onClick={completePlan}>Mark suggested work done</button>}
    </section>

    <section className="card" aria-labelledby="skill-assessment-title">
      <h3 id="skill-assessment-title">Skill assessments</h3>
      <p className="muted">The coach advances bodyweight skills only after two clean passes at the current step. Pain never triggers advancement.</p>
      {recommendations.map(({tree,step,recommendation})=>{
        const current=tree.steps.find(s=>s.id===step)||tree.steps[0];
        return <div key={tree.id} style={{marginBottom:20}}><b>{tree.name}: {current.name}</b><p className="muted">Target: {current.target}</p><div className="coach-note">{recommendation.message}</div><div className="quick-grid"><button onClick={()=>assess(tree.id,true)}>Target met cleanly</button><button onClick={()=>assess(tree.id,false)}>Not yet</button><button onClick={()=>assess(tree.id,false,true)}>Discomfort</button></div></div>
      })}
    </section>

    <section className="card" aria-labelledby="athletic-title">
      <h3 id="athletic-title">Athleticism</h3>
      <p className="muted">Power, balance and practical movement are trained in small doses rather than added as random fatigue.</p>
      <b>{athletic.name} · {athletic.minutes} min</b><p>{athletic.items.join(' · ')}</p><small>{athletic.impact} impact recommendation based on current context.</small>
      {athleticProgressions.map(({metricId,level,decision})=><div className="history" key={metricId} style={{marginTop:14}}><b>{metricId==='jump'?'Jump/power':'Single-leg balance'} · {level}</b><span>{decision.evidenceCount} tests</span><small>{decision.message}</small><p className="muted">Current work: {athleticLevelSession(metricId,level).join(' · ')}</p>{decision.action!=='hold'&&<button className="link" onClick={()=>applyAthletic(metricId,decision.nextLevel)}>Apply {decision.action}: {decision.nextLevel}</button>}</div>)}
    </section>
  </>;
}
