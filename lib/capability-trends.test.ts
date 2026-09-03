import { describe, expect, it } from 'vitest';
import { assessmentDue, cardioCoverage, normalizedStrengthTrend, strengthTrends } from './capability-trends';

describe('capability trends',()=>{
  it('tracks primary lift strength without combining exercise variants',()=>{
    const history=[
      {session:'upper-a' as const,completedAt:'2026-08-01T12:00:00Z',exercises:[{id:'bench',name:'Bench',movement:'horizontal-push' as const,equipment:['barbell' as const],priority:'primary' as const,repRange:[5,8] as [number,number],sets:1,logs:[{weight:80,reps:5,completedAt:'2026-08-01T12:00:00Z'}]}]},
      {session:'upper-a' as const,completedAt:'2026-09-01T12:00:00Z',exercises:[{id:'bench',name:'Bench',movement:'horizontal-push' as const,equipment:['barbell' as const],priority:'primary' as const,repRange:[5,8] as [number,number],sets:1,logs:[{weight:85,reps:5,completedAt:'2026-09-01T12:00:00Z'}]}]},
    ];
    const trends=strengthTrends(history);
    expect(trends).toHaveLength(1);
    expect(trends[0].exerciseId).toBe('bench');
    expect(trends[0].percentChange).toBeGreaterThan(0);
    expect(normalizedStrengthTrend(history).percentChange).toBeGreaterThan(0);
  });

  it('uses equivalent cardio minutes for weekly coverage',()=>{
    const activity=[{domain:'cardio' as const,minutes:30,effort:'hard' as const,completedAt:'2026-09-01T12:00:00Z'}];
    const result=cardioCoverage(activity,150,new Date('2026-09-02T12:00:00Z'));
    expect(result.equivalentMinutes).toBe(60);
    expect(result.remaining).toBe(90);
  });

  it('marks assessments due after the configured interval',()=>{
    const values=[{metricId:'jump',value:40,recordedAt:'2026-07-01T12:00:00Z'}];
    expect(assessmentDue(values,'jump',new Date('2026-09-02T12:00:00Z'),42).due).toBe(true);
  });
});
