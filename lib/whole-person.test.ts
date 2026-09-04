import { describe, expect, it } from 'vitest';
import { buildSession } from './program';
import {
  activityCountsTowardCardioTarget,
  assessmentTrend,
  athleticPlan,
  cardioEquivalentMinutes,
  cardioOptions,
  corePrescription,
  latestAssessment,
  minimumEffectiveOptions,
  mobilityPrescription,
  nextSkillStep,
  readinessDecision,
  readinessDecisionFromRecords,
  readinessTrend,
  skillTrees,
  targetProgress,
  weeklyMinutes,
  workoutActivityDoses,
} from './whole-person';

describe('whole-person fitness model', () => {
  it('covers pull-up, chin-up, push-up, dip and hang skills', () => {
    expect(skillTrees.map(tree => tree.id)).toEqual(['pull-up', 'chin-up', 'push-up', 'dip', 'hang-skill']);
    expect(nextSkillStep('pull-up', 'assisted')?.id).toBe('strict');
    expect(nextSkillStep('pull-up', 'weighted')?.id).toBe('weighted');
  });

  it('programs all core patterns and reduces fatigue under recovery constraints', () => {
    const normal = corePrescription({ session: 'upper-a', equipment: ['bodyweight', 'cable', 'dumbbell'], readiness: 'normal' });
    const recovery = corePrescription({ session: 'lower-a', equipment: ['bodyweight', 'cable', 'dumbbell'], readiness: 'recovery' });
    expect(normal.length).toBeGreaterThan(1);
    expect(recovery).toHaveLength(1);
    expect(recovery.every(session => session.fatigue === 'low')).toBe(true);
  });

  it('separates pre-workout preparation from longer mobility work', () => {
    const prepare = mobilityPrescription('lower-a', 'prepare', 6);
    const restore = mobilityPrescription('lower-a', 'restore', 12);
    expect(prepare.kind).toBe('prepare');
    expect(restore.kind).toBe('restore');
    expect(restore.minutes).toBeGreaterThan(prepare.minutes);
    expect(prepare.items).not.toEqual(restore.items);
  });

  it('uses sleep duration and subjective readiness without diagnosing', () => {
    expect(readinessDecision({ sleepHours: 5.5 }).level).toBe('reduced');
    expect(readinessDecision({ subjective: 1, stress: 'high' }).allowProgression).toBe(false);
    expect(readinessDecision({ pain: true }).level).toBe('recovery');
  });

  it('summarizes repeated readiness constraints', () => {
    const trend = readinessTrend([
      { recordedAt: '2026-09-01T12:00:00Z', input: { sleep: 'poor', fatigue: 'high' } },
      { recordedAt: '2026-08-31T12:00:00Z', input: { stress: 'high' } },
      { recordedAt: '2026-08-30T12:00:00Z', input: { sleep: 'good', fatigue: 'low' } },
    ], new Date('2026-09-02T12:00:00Z'));
    expect(trend.reduced).toBe(2);
    expect(trend.message).toContain('common');
  });

  it('keeps progression conservative after repeated recent strain even when the latest check is normal', () => {
    const records = [
      { recordedAt: '2026-09-01T12:00:00Z', input: { sleep: 'poor' as const } },
      { recordedAt: '2026-09-02T12:00:00Z', input: { fatigue: 'high' as const } },
      { recordedAt: '2026-09-03T12:00:00Z', input: { sleep: 'good' as const, fatigue: 'low' as const } },
    ];
    const decision = readinessDecisionFromRecords(records, new Date('2026-09-03T13:00:00Z'));
    expect(decision.level).toBe('reduced');
    expect(decision.allowProgression).toBe(false);
  });

  it('distinguishes planned cardio from incidental movement', () => {
    expect(activityCountsTowardCardioTarget({ domain: 'cardio', minutes: 30, kind: 'planned', completedAt: '2026-09-01T12:00:00Z' })).toBe(true);
    expect(activityCountsTowardCardioTarget({ domain: 'cardio', minutes: 30, kind: 'incidental', completedAt: '2026-09-01T12:00:00Z' })).toBe(false);
    expect(cardioEquivalentMinutes(30, 'hard')).toBe(60);
    expect(cardioOptions(60, 150, 'normal', 30).some(option => option.type === 'intervals')).toBe(true);
    expect(cardioOptions(60, 150, 'reduced', 30).some(option => option.type === 'intervals')).toBe(false);
  });

  it('selects only compatible minimum-effective sessions', () => {
    const result = minimumEffectiveOptions(10, ['bodyweight', 'core'], ['bodyweight']);
    expect(result.every(session => session.minutes <= 10)).toBe(true);
    expect(result.every(session => (session.requiredEquipment || []).every(item => item === 'bodyweight'))).toBe(true);
  });

  it('keeps high-impact power out of recovery/disabled plans', () => {
    expect(athleticPlan([], 'recovery').every(plan => plan.domain !== 'power')).toBe(true);
    const lowImpact = athleticPlan([], 'normal', { highImpactAllowed: false });
    expect(lowImpact.every(plan => plan.domain !== 'power')).toBe(true);
    expect(lowImpact.some(plan => plan.domain === 'movement')).toBe(true);
  });

  it('tracks weekly minutes and explicit assessment trends', () => {
    const now = new Date('2026-09-02T12:00:00Z');
    const doses = [{ domain: 'mobility' as const, minutes: 10, completedAt: '2026-09-01T12:00:00Z' }];
    expect(weeklyMinutes(doses, 'mobility', now)).toBe(10);
    expect(targetProgress(75, 150)).toBe(0.5);
    const values = [{ metricId: 'pullups', value: 3, recordedAt: '2026-08-01T12:00:00Z' }, { metricId: 'pullups', value: 6, recordedAt: '2026-09-01T12:00:00Z' }];
    expect(latestAssessment(values, 'pullups')?.value).toBe(6);
    expect(assessmentTrend(values, 'pullups')).toBe(3);
  });

  it('does not let unfinished optional additions lower required-workout quality', () => {
    const exercises = buildSession('upper-a');
    exercises.forEach(exercise => { exercise.logs = Array.from({ length: exercise.sets }, () => ({ weight: 20, reps: exercise.repRange[0], completedAt: '2026-09-01T12:00:00Z' })); });
    exercises.push({ ...exercises[0], id: 'optional-test', name: 'Optional test', sets: 3, logs: [], optional: true });
    const doses = workoutActivityDoses({ session: 'upper-a', status: 'completed', completedAt: '2026-09-01T12:00:00Z', exercises });
    expect(doses.find(dose => dose.domain === 'strength')?.quality).toBe(1);
  });
});
