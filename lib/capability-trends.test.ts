import { describe, expect, it } from 'vitest';
import { assessmentDue, cardioCoverage, consistencyPattern, normalizedStrengthTrend, recoveryPattern, strengthTrends } from './capability-trends';

describe('capability trends', () => {
  it('tracks comparable primary lifts without warm-ups, pain or abandoned sessions', () => {
    const history = [
      { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2026-08-01T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 20, reps: 20, warmup: true, completedAt: '2026-08-01T11:50:00Z' }, { weight: 80, reps: 5, completedAt: '2026-08-01T12:00:00Z' }] }] },
      { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2026-09-01T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 85, reps: 5, completedAt: '2026-09-01T12:00:00Z' }] }] },
    ];
    expect(strengthTrends(history)).toHaveLength(1);
    expect(normalizedStrengthTrend(history).percentChange).toBeGreaterThan(0);
  });

  it('counts only planned cardio toward target coverage', () => {
    const activity = [
      { domain: 'cardio' as const, minutes: 30, effort: 'hard' as const, kind: 'planned' as const, completedAt: '2026-09-01T12:00:00Z' },
      { domain: 'cardio' as const, minutes: 30, effort: 'hard' as const, kind: 'incidental' as const, completedAt: '2026-09-01T12:00:00Z' },
    ];
    const result = cardioCoverage(activity, 150, new Date('2026-09-02T12:00:00Z'));
    expect(result.equivalentMinutes).toBe(60);
    expect(result.remaining).toBe(90);
  });

  it('keeps recovery and consistency explicit rather than inventing one score', () => {
    const recovery = recoveryPattern([{ recordedAt: '2026-09-02T12:00:00Z', input: { sleep: 'good', fatigue: 'low' } }], new Date('2026-09-03T12:00:00Z'));
    expect(recovery.checkIns).toBe(1);
    expect(recovery.normal).toBe(1);
    const session = { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2026-09-02T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 80, reps: 5, completedAt: '2026-09-02T12:00:00Z' }] }] };
    const consistency = consistencyPattern([session], new Date('2026-09-03T12:00:00Z'));
    expect(consistency.sessions).toBe(1);
    expect(consistency.activeWeeks).toBe(1);
  });

  it('marks assessments due after the configured interval', () => {
    expect(assessmentDue([{ metricId: 'jump', value: 40, recordedAt: '2026-07-01T12:00:00Z' }], 'jump', new Date('2026-09-02T12:00:00Z'), 42).due).toBe(true);
  });
});
