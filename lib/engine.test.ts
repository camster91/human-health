import { describe, expect, it } from 'vitest';
import { adaptWorkout, nextLoadRecommendation, platePlan } from './engine';
import { buildSession, gyms } from './program';

describe('adaptive workout engine',()=>{
  it('reduces low-priority volume before primary work',()=>{
    const base=buildSession('upper-a');
    const result=adaptWorkout(base,{minutes:20,gym:gyms[0]});
    expect(result.exercises.length).toBeLessThan(base.length);
    expect(result.exercises.some(e=>e.priority==='primary')).toBe(true);
  });
  it('substitutes incompatible equipment without copying logs',()=>{
    const base=buildSession('upper-a');
    const result=adaptWorkout(base,{gym:gyms[2]});
    expect(result.exercises.every(e=>e.equipment.every(eq=>gyms[2].equipment.includes(eq)))).toBe(true);
    expect(result.exercises.every(e=>e.logs.length===0)).toBe(true);
  });
});

describe('progression',()=>{
  it('recommends a small increase only after all sets reach the top range',()=>{
    const ex={...buildSession('upper-a')[0],logs:Array.from({length:4},()=>({weight:60,reps:8,rir:2,completedAt:new Date().toISOString()}))};
    expect(nextLoadRecommendation(ex).action).toBe('increase');
  });
  it('blocks automatic progression when pain is flagged',()=>{
    const ex={...buildSession('upper-a')[0],logs:[{weight:60,reps:8,rir:2,pain:true,completedAt:new Date().toISOString()}]};
    expect(nextLoadRecommendation(ex).action).toBe('hold');
  });
});

describe('plate calculator',()=>{
  it('calculates each side for an 80kg target',()=>expect(platePlan(80)).toEqual([25,5]));
  it('rejects impossible loads',()=>expect(platePlan(21)).toBeNull());
});
