import { describe, expect, it } from 'vitest';
import { HistoryEntry } from './domain';
import { nextRollingSession, workoutCompletionRatio } from './schedule';

function entry(status:'completed'|'ended-early',logs:number):HistoryEntry{
  return {session:'upper-a',status,completedAt:'2026-09-02T12:00:00-04:00',exercises:[
    {id:'bench',name:'Bench',movement:'horizontal-push',equipment:['barbell'],priority:'primary',repRange:[5,8],sets:4,logs:Array.from({length:Math.min(logs,4)},()=>({weight:60,reps:6,completedAt:'2026-09-02T12:00:00-04:00'}))},
    {id:'row',name:'Row',movement:'horizontal-pull',equipment:['barbell'],priority:'primary',repRange:[6,10],sets:4,logs:Array.from({length:Math.max(0,logs-4)},()=>({weight:50,reps:8,completedAt:'2026-09-02T12:00:00-04:00'}))},
  ]};
}

describe('rolling schedule',()=>{
  it('starts at Upper A with no history',()=>expect(nextRollingSession([]).session).toBe('upper-a'));
  it('advances after a completed session',()=>expect(nextRollingSession([entry('completed',8)]).session).toBe('lower-a'));
  it('repeats an ended-early session when too little work was completed',()=>{
    const decision=nextRollingSession([entry('ended-early',2)]);
    expect(decision.session).toBe('upper-a');
    expect(decision.repeating).toBe(true);
  });
  it('advances an ended-early session when enough work and both primary lifts were covered',()=>{
    const decision=nextRollingSession([entry('ended-early',6)]);
    expect(workoutCompletionRatio(entry('ended-early',6))).toBe(.75);
    expect(decision.session).toBe('lower-a');
  });
});
