'use client';
import { useEffect, useMemo, useState } from 'react';
import { assessmentDue, cardioCoverage, dueAssessments, normalizedStrengthTrend } from '@/lib/capability-trends';
import { HistoryEntry } from '@/lib/domain';
import { store } from '@/lib/storage';
import { Assessment, capabilityMetrics } from '@/lib/whole-person';

const assessmentMetricIds=['pullups','dead-hang','ankle-mobility','single-leg-balance','jump'];

export function CapabilityTrendPanel({history}:{history:HistoryEntry[]}){
  const [assessments,setAssessments]=useState<Assessment[]>([]);
  const [activityVersion,setActivityVersion]=useState(0);
  useEffect(()=>{setAssessments(store.loadAssessments());setActivityVersion(v=>v+1)},[]);
  const activity=useMemo(()=>{void activityVersion;return store.loadActivity()},[activityVersion]);
  const strength=useMemo(()=>normalizedStrengthTrend(history),[history]);
  const cardio=useMemo(()=>cardioCoverage(activity),[activity]);
  const due=useMemo(()=>dueAssessments(assessments,assessmentMetricIds),[assessments]);

  return <section className="card" aria-labelledby="longitudinal-title">
    <h2 id="longitudinal-title">Longitudinal capability</h2>
    <p className="muted">This view uses relative change and repeated comparable tests. It does not combine unlike exercises or turn fitness into a single health score.</p>
    <div className="metrics" style={{marginBottom:16}}>
      <span><b>Strength trend</b>{strength.percentChange===null?'Need repeat data':`${strength.percentChange>=0?'+':''}${strength.percentChange.toFixed(1)}% median`}</span>
      <span><b>Cardio coverage</b>{Math.round(cardio.coverage*100)}% · {Math.round(cardio.remaining)} equivalent min left</span>
      <span><b>Assessments due</b>{due.length}</span>
      <span><b>Repeated lifts</b>{strength.exerciseCount}</span>
    </div>
    <div className="coach-note">{strength.message}</div>
    {due.length>0&&<div style={{marginTop:14}}><b>Retest when convenient</b>{due.map(id=>{const metric=capabilityMetrics.find(m=>m.id===id);const state=assessmentDue(assessments,id);return <div className="history" key={id}><b>{metric?.name||id}</b><span>{state.daysSince===null?'No baseline':`${state.daysSince} days`}</span><small>{state.message}</small></div>})}</div>}
  </section>;
}
