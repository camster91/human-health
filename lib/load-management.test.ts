import { describe,expect,it } from 'vitest';
import { HistoryEntry } from './domain';
import { coordinateCardio,powerAllowed,recentTrainingLoad } from './load-management';

const lower:HistoryEntry={session:'lower-a',status:'completed',completedAt:'2026-09-03T06:00:00-04:00',exercises:[{id:'squat',name:'Squat',movement:'squat',equipment:['barbell'],priority:'primary',repRange:[5,8],sets:4,logs:Array.from({length:4},()=>({weight:80,reps:6,completedAt:'2026-09-03T06:30:00-04:00'}))},{id:'rdl',name:'RDL',movement:'hinge',equipment:['barbell'],priority:'secondary',repRange:[6,10],sets:3,logs:Array.from({length:3},()=>({weight:70,reps:8,completedAt:'2026-09-03T06:45:00-04:00'}))}]};

describe('cross-domain load management',()=>{
  it('detects recent demanding lower-body work',()=>{
    const load=recentTrainingLoad([lower],new Date('2026-09-03T08:00:00-04:00'));
    expect(load.lowerSets).toBe(7);expect(load.hoursSinceLower).toBe(2);
    expect(powerAllowed(load,'normal').allowed).toBe(false);
  });
  it('removes intervals after demanding recent lower-body work',()=>{
    const load=recentTrainingLoad([lower],new Date('2026-09-03T08:00:00-04:00'));
    const options=[{type:'recovery' as const,name:'Easy',minutes:20,effort:'easy' as const,description:'Easy.'},{type:'steady' as const,name:'Steady',minutes:30,effort:'moderate' as const,description:'Steady.'},{type:'intervals' as const,name:'Intervals',minutes:20,effort:'hard' as const,description:'Hard.'}];
    expect(coordinateCardio(options,load,'normal').some(o=>o.type==='intervals')).toBe(false);
  });
});
