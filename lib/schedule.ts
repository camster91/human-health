import { HistoryEntry, SessionId } from './domain';

const sequence:SessionId[]=['upper-a','lower-a','upper-b','lower-b'];

export type RollingDecision={session:SessionId;reason:string;repeating:boolean};

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
