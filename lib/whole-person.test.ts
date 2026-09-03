import { describe, expect, it } from 'vitest';
import { assessmentTrend, athleticPlan, cardioEquivalentMinutes, cardioOptions, cardioPrescription, latestAssessment, minimumEffectiveOptions, nextSkillStep, readinessDecision, readinessTrend, targetProgress, weeklyMinutes } from './whole-person';

describe('whole-person fitness model',()=>{
  it('caps target progress at one',()=>{
    expect(targetProgress(180,150)).toBe(1);
    expect(targetProgress(75,150)).toBe(.5);
  });

  it('counts recent weekly domain minutes',()=>{
    const now=new Date('2026-09-02T12:00:00-04:00');
    const doses=[
      {domain:'cardio' as const,minutes:30,completedAt:'2026-09-01T10:00:00-04:00'},
      {domain:'cardio' as const,minutes:20,completedAt:'2026-08-20T10:00:00-04:00'},
      {domain:'mobility' as const,minutes:10,completedAt:'2026-09-01T10:00:00-04:00'},
    ];
    expect(weeklyMinutes(doses,'cardio',now)).toBe(30);
  });

  it('returns short sessions that match available time and current needs',()=>{
    const result=minimumEffectiveOptions(10,['bodyweight','core']);
    expect(result.map(x=>x.domain)).toEqual(['bodyweight','core']);
    expect(result.every(x=>x.minutes<=10)).toBe(true);
  });

  it('reduces training recommendations under multiple recovery strains',()=>{
    const result=readinessDecision({sleep:'poor',fatigue:'high'});
    expect(result.level).toBe('reduced');
    expect(result.allowProgression).toBe(false);
    expect(result.volumeMultiplier).toBeLessThan(1);
  });

  it('treats pain as a recovery-state guardrail rather than a progression signal',()=>{
    const result=readinessDecision({pain:true});
    expect(result.level).toBe('recovery');
    expect(result.allowProgression).toBe(false);
  });

  it('summarizes repeated readiness constraints across the recent week',()=>{
    const now=new Date('2026-09-02T12:00:00Z');
    const trend=readinessTrend([
      {recordedAt:'2026-09-01T12:00:00Z',input:{sleep:'poor',fatigue:'high'}},
      {recordedAt:'2026-08-31T12:00:00Z',input:{stress:'high'}},
      {recordedAt:'2026-08-30T12:00:00Z',input:{sleep:'good',fatigue:'low'}},
    ],now);
    expect(trend.reduced).toBe(2);
    expect(trend.message).toContain('common');
  });

  it('converts hard cardio to moderate-equivalent minutes',()=>{
    expect(cardioEquivalentMinutes(30,'hard')).toBe(60);
    expect(cardioEquivalentMinutes(30,'moderate')).toBe(30);
  });

  it('prescribes cardio against the remaining weekly target',()=>{
    expect(cardioPrescription(150,150,30).minutes).toBe(0);
    const next=cardioPrescription(90,150,30);
    expect(next.minutes).toBe(30);
    expect(next.effort).toBe('moderate');
  });

  it('removes hard interval option when readiness is reduced',()=>{
    expect(cardioOptions(60,150,'normal',30).some(x=>x.type==='intervals')).toBe(true);
    expect(cardioOptions(60,150,'reduced',30).some(x=>x.type==='intervals')).toBe(false);
  });

  it('advances through a bodyweight skill tree without exceeding the last step',()=>{
    expect(nextSkillStep('pull-up','assisted')?.id).toBe('strict');
    expect(nextSkillStep('pull-up','weighted')?.id).toBe('weighted');
  });

  it('returns latest assessment and a simple measurable trend',()=>{
    const values=[
      {metricId:'pullups',value:3,recordedAt:'2026-08-01T12:00:00Z'},
      {metricId:'pullups',value:6,recordedAt:'2026-09-01T12:00:00Z'},
    ];
    expect(latestAssessment(values,'pullups')?.value).toBe(6);
    expect(assessmentTrend(values,'pullups')).toBe(3);
  });

  it('keeps athletic plan low risk in recovery state',()=>{
    const plan=athleticPlan([], 'recovery');
    expect(plan.every(x=>x.domain!=='power')).toBe(true);
    expect(plan[0].domain).toBe('balance');
  });
});
