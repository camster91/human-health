import { describe, expect, it } from 'vitest';
import { athleticLevelSession, recommendAthleticProgression } from './athletic-progression';

describe('athletic progression',()=>{
  it('holds until enough comparable evidence exists',()=>{
    const result=recommendAthleticProgression({metricId:'jump',assessments:[{metricId:'jump',value:40,recordedAt:'2026-08-01T12:00:00Z'}],readiness:'normal'});
    expect(result.action).toBe('hold');
    expect(result.evidenceCount).toBe(1);
  });

  it('advances after two repeatable improvements above baseline',()=>{
    const result=recommendAthleticProgression({metricId:'jump',currentLevel:'foundation',readiness:'normal',assessments:[
      {metricId:'jump',value:40,recordedAt:'2026-07-01T12:00:00Z'},
      {metricId:'jump',value:41,recordedAt:'2026-08-01T12:00:00Z'},
      {metricId:'jump',value:42,recordedAt:'2026-09-01T12:00:00Z'},
    ]});
    expect(result.action).toBe('advance');
    expect(result.nextLevel).toBe('develop');
  });

  it('does not advance athletic work when readiness is reduced',()=>{
    const result=recommendAthleticProgression({metricId:'single-leg-balance',currentLevel:'develop',readiness:'reduced',assessments:[
      {metricId:'single-leg-balance',value:30,recordedAt:'2026-07-01T12:00:00Z'},
      {metricId:'single-leg-balance',value:40,recordedAt:'2026-08-01T12:00:00Z'},
      {metricId:'single-leg-balance',value:45,recordedAt:'2026-09-01T12:00:00Z'},
    ]});
    expect(result.action).toBe('hold');
    expect(result.nextLevel).toBe('develop');
  });

  it('provides distinct sessions by level',()=>{
    expect(athleticLevelSession('jump','foundation')).not.toEqual(athleticLevelSession('jump','develop'));
  });
});
