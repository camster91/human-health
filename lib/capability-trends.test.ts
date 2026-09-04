import { describe, expect, it } from 'vitest';
import { assessmentDue, cardioCoverage, consistencyPattern, normalizedStrengthTrend, recoveryPattern, strengthTrends } from './capability-trends';

describe('capability trends', () => {
  it('tracks comparable primary lifts without warm-ups, pain, poor form, future data, or abandoned sessions', () => {
    const history = [
      { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2026-08-01T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 20, reps: 20, warmup: true, completedAt: '2026-08-01T11:50:00Z' }, { weight: 80, reps: 5, completedAt: '2026-08-01T12:00:00Z' }] }] },
      { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2026-09-01T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 200, reps: 5, formQuality: 'poor' as const, completedAt: '2026-09-01T11:59:00Z' }, { weight: 85, reps: 5, completedAt: '2026-09-01T12:00:00Z' }] }] },
      { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2027-09-01T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 300, reps: 5, completedAt: '2027-09-01T12:00:00Z' }] }] },
    ];
    const now = new Date('2026-09-02T12:00:00Z');
    const trends = strengthTrends(history, now);
    expect(trends).toHaveLength(1);
    expect(trends[0].latest).toBeLessThan(110);
    expect(normalizedStrengthTrend(history, now).percentChange).toBeGreaterThan(0);
  });

  it('counts only current planned cardio toward target coverage', () => {
    const activity = [
      { domain: 'cardio' as const, minutes: 30, effort: 'hard' as const, kind: 'planned' as const, completedAt: '2026-09-01T12:00:00Z' },
      { domain: 'cardio' as const, minutes: 30, effort: 'hard' as const, kind: 'incidental' as const, completedAt: '2026-09-01T12:00:00Z' },
      { domain: 'cardio' as const, minutes: 300, effort: 'hard' as const, kind: 'planned' as const, completedAt: '2027-09-01T12:00:00Z' },
    ];
    const result = cardioCoverage(activity, 150, new Date('2026-09-02T12:00:00Z'));
    expect(result.equivalentMinutes).toBe(60);
    expect(result.remaining).toBe(90);
  });

  it('keeps recovery and consistency explicit and excludes future records', () => {
    const recovery = recoveryPattern([
      { recordedAt: '2026-09-02T12:00:00Z', input: { sleep: 'good', fatigue: 'low' } },
      { recordedAt: '2027-09-02T12:00:00Z', input: { pain: true } },
    ], new Date('2026-09-03T12:00:00Z'));
    expect(recovery.checkIns).toBe(1);
    expect(recovery.normal).toBe(1);
    const session = { session: 'upper-a' as const, status: 'completed' as const, completedAt: '2026-09-02T12:00:00Z', exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 1, logs: [{ weight: 80, reps: 5, completedAt: '2026-09-02T12:00:00Z' }] }] };
    const future = { ...session, completedAt: '2027-09-02T12:00:00Z' };
    const consistency = consistencyPattern([session, future], new Date('2026-09-03T12:00:00Z'));
    expect(consistency.sessions).toBe(1);
    expect(consistency.activeWeeks).toBe(1);
  });

  it('marks assessments due after the configured interval and ignores future assessments', () => {
    const now = new Date('2026-09-02T12:00:00Z');
    expect(assessmentDue([{ metricId: 'jump', value: 40, recordedAt: '2026-07-01T12:00:00Z' }], 'jump', now, 42).due).toBe(true);
    expect(assessmentDue([{ metricId: 'jump', value: 99, recordedAt: '2027-07-01T12:00:00Z' }], 'jump', now, 42).daysSince).toBeNull();
  });
});
