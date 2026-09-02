import { describe, expect, it } from 'vitest';
import { athleticRecommendation, domainDeficits, minimumEffectiveDay, recommendSkillProgression } from './performance';

describe('skill progression',()=>{
  it('advances only after two clean passes',()=>{
    const assessments=[
      {treeId:'pull-up',stepId:'assisted',passed:true,clean:true,pain:false,recordedAt:'2026-09-01T12:00:00Z'},
      {treeId:'pull-up',stepId:'assisted',passed:true,clean:true,pain:false,recordedAt:'2026-09-02T12:00:00Z'},
    ];
    expect(recommendSkillProgression('pull-up','assisted',assessments).stepId).toBe('strict');
  });

  it('does not advance when discomfort is reported',()=>{
    const assessments=[{treeId:'pull-up',stepId:'assisted',passed:true,clean:true,pain:true,recordedAt:'2026-09-02T12:00:00Z'}];
    expect(recommendSkillProgression('pull-up','assisted',assessments).action).toBe('hold');
  });
});

describe('whole-person daily planning',()=>{
  it('finds weekly domains that are still under target',()=>{
    expect(domainDeficits([],new Date('2026-09-02T12:00:00Z'))).toContain('cardio');
  });

  it('makes recovery signals override deficit chasing',()=>{
    const plan=minimumEffectiveDay({availableMinutes:20,activity:[],readiness:{level:'recovery',volumeMultiplier:.5,allowProgression:false,reasons:['pain']}});
    expect(plan.domains).toEqual(['mobility']);
  });

  it('uses travel mode to favour portable fitness domains',()=>{
    const plan=minimumEffectiveDay({availableMinutes:20,activity:[],readiness:{level:'normal',volumeMultiplier:1,allowProgression:true,reasons:[]},mode:'travel'});
    expect(plan.mode).toBe('travel');
    expect(plan.domains.some(d=>['bodyweight','cardio','mobility'].includes(d))).toBe(true);
  });
});

describe('athletic planning',()=>{
  it('avoids high-impact power when high impact is not appropriate',()=>{
    expect(athleticRecommendation({highImpactOkay:false}).impact).toBe('low');
  });
});
