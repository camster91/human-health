import { describe, expect, it } from 'vitest';
import { minimumEffectiveOptions, targetProgress, weeklyMinutes } from './whole-person';

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
});
