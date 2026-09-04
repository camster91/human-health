import {describe,expect,it} from 'vitest';
import {domainDeficits,minimumEffectiveDay} from './performance';
import {defaultPreferences} from './preferences';
import {incidentalMovementMinutes,mobilitySessions,plannedCardioEquivalentMinutes,readinessDecision,skillTrees} from './whole-person';

describe('Phase 2 completion behaviours',()=>{
  it('distinguishes planned cardio from incidental movement',()=>{
    const activity=[
      {domain:'cardio' as const,kind:'planned' as const,effort:'moderate' as const,minutes:30,completedAt:'2026-09-03T12:00:00Z'},
      {domain:'cardio' as const,kind:'incidental' as const,effort:'easy' as const,minutes:40,completedAt:'2026-09-03T13:00:00Z'},
    ];
    expect(plannedCardioEquivalentMinutes(activity)).toBe(30);
    expect(incidentalMovementMinutes(activity)).toBe(40);
  });

  it('uses sleep duration and subjective readiness conservatively',()=>{
    expect(readinessDecision({sleepHours:5.5,subjective:2}).level).toBe('reduced');
  });

  it('provides distinct preparation and flexibility sessions',()=>{
    expect(mobilitySessions.some(session=>session.purpose==='preparation')).toBe(true);
    expect(mobilitySessions.some(session=>session.purpose==='flexibility')).toBe(true);
  });

  it('covers the planned bodyweight skill families',()=>{
    expect(skillTrees.map(tree=>tree.id)).toEqual(expect.arrayContaining(['pull-up','chin-up','push-up','dip','hang-skill']));
  });

  it('lets deprioritized domains stop driving catch-up plans',()=>{
    const goals={...defaultPreferences.goals,cardio:'deprioritize' as const};
    expect(domainDeficits([],new Date('2026-09-03T12:00:00Z'),goals)).not.toContain('cardio');
    const plan=minimumEffectiveDay({availableMinutes:20,activity:[],readiness:{level:'normal',volumeMultiplier:1,allowProgression:true,reasons:[]},goals});
    expect(plan.domains).not.toContain('cardio');
  });
});
