import { HistoryEntry, SessionId } from './domain';

const sequence:SessionId[]=['upper-a','lower-a','upper-b','lower-b'];

export type RollingDecision={session:SessionId;reason:string;repeating:boolean};
export type ScheduleLifeMode='normal'|'travel'|'return'|'maintenance';
export type ContextualRollingDecision=RollingDecision&{mode:ScheduleLifeMode;adaptation:'normal'|'portable'|'reduced'|'maintenance';progressionAllowed:boolean};

function advance(session:SessionId){
  return sequence[(sequence.indexOf(session)+1)%sequence.length];
}

export function workoutCompletionRatio(entry:HistoryEntry){
  const prescribed=entry.exercises.reduce((sum,e)=>sum+e.sets,0);
  const completed=entry.exercises.reduce((sum,e)=>sum+Math.min(e.logs.length,e.sets),0);
  return prescribed>0?completed/prescribed:0;
}

export function nextRollingSession(history:HistoryEntry[]):RollingDecision{
  if(!history.length)return {session:'upper-a',reason:'Start the rolling Upper/Lower sequence.',repeating:false};
  const last=history[history.length-1];
  const status=last.status||'completed';
  if(status==='completed') return {session:advance(last.session),reason:'Previous session was completed; continue the rolling sequence.',repeating:false};

  const ratio=workoutCompletionRatio(last);
  const primary=last.exercises.filter(e=>e.priority==='primary');
  const primaryCovered=primary.length>0 && primary.every(e=>e.logs.length>0);
  if(ratio>=.6 && primaryCovered){
    return {session:advance(last.session),reason:`Ended early after ${Math.round(ratio*100)}% of prescribed sets with primary work covered; continue the sequence rather than repeating the whole session.`,repeating:false};
  }
  return {session:last.session,reason:`Ended early after ${Math.round(ratio*100)}% of prescribed sets; repeat this session so important work is not silently skipped.`,repeating:true};
}

export function contextualRollingSession(history:HistoryEntry[],mode:ScheduleLifeMode='normal'):ContextualRollingDecision{
  const base=nextRollingSession(history);
  if(mode==='travel')return {...base,mode,adaptation:'portable',progressionAllowed:false,reason:`${base.reason} Travel mode keeps the rolling position but adapts the session to portable or available equipment instead of treating travel as a missed workout.`};
  if(mode==='return')return {...base,mode,adaptation:'reduced',progressionAllowed:false,reason:`${base.reason} Return-to-training mode keeps the sequence while reducing demand; load progression resumes only after tolerance is re-established.`};
  if(mode==='maintenance')return {...base,mode,adaptation:'maintenance',progressionAllowed:true,reason:`${base.reason} Maintenance mode preserves the sequence with a lower total training burden rather than trying to make up volume.`};
  return {...base,mode,adaptation:'normal',progressionAllowed:true};
}
