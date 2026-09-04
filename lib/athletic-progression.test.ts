import { describe, expect, it } from 'vitest';
import { athleticLevelSession, recommendAthleticProgression } from './athletic-progression';

describe('athletic progression', () => {
  it('holds until enough comparable evidence exists', () => {
    const result = recommendAthleticProgression({ metricId: 'jump', assessments: [{ metricId: 'jump', value: 40, recordedAt: '2026-08-01T12:00:00Z' }], readiness: 'normal' });
    expect(result.action).toBe('hold');
  });

  it('advances after two repeatable improvements above baseline', () => {
    const result = recommendAthleticProgression({ metricId: 'jump', currentLevel: 'foundation', readiness: 'normal', assessments: [
      { metricId: 'jump', value: 40, recordedAt: '2026-07-01T12:00:00Z' },
      { metricId: 'jump', value: 41, recordedAt: '2026-08-01T12:00:00Z' },
      { metricId: 'jump', value: 42, recordedAt: '2026-09-01T12:00:00Z' },
    ] });
    expect(result.action).toBe('advance');
    expect(result.nextLevel).toBe('develop');
  });

  it('holds jump progression when readiness or impact preferences require it', () => {
    expect(recommendAthleticProgression({ metricId: 'jump', readiness: 'reduced', assessments: [] }).action).toBe('hold');
    expect(recommendAthleticProgression({ metricId: 'jump', readiness: 'normal', highImpactAllowed: false, assessments: [] }).action).toBe('hold');
  });

  it('provides distinct sessions by level', () => {
    expect(athleticLevelSession('jump', 'foundation')).not.toEqual(athleticLevelSession('jump', 'develop'));
  });
});
