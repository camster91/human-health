import { describe, expect, it } from 'vitest';
import { adaptWorkout, nextLoadRecommendation, platePlan, summarizeWorkout, workingLogs } from './engine';
import { buildSession, findExercise, gyms } from './program';

describe('adaptive workout engine', () => {
  it('defers lower-priority work before primary movements when time is short', () => {
    const base = buildSession('upper-a');
    const result = adaptWorkout(base, { minutes: 20, gym: gyms[0] });
    expect(result.exercises.length).toBeLessThan(base.length);
    expect(result.exercises.some(exercise => exercise.priority === 'primary')).toBe(true);
    expect(result.notes.join(' ')).toContain('20-minute');
  });

  it('reduces return-to-training volume, including primary exercises', () => {
    const base = buildSession('lower-a');
    const result = adaptWorkout(base, { gym: gyms[0], mode: 'return', volumeMultiplier: 0.65 });
    expect(result.exercises.find(exercise => exercise.id === 'squat')!.sets).toBeLessThan(base.find(exercise => exercise.id === 'squat')!.sets);
  });

  it('does not count warm-up sets as working sets', () => {
    const exercise = { ...buildSession('upper-a')[0], logs: [
      { weight: 20, reps: 10, warmup: true, completedAt: '2026-09-01T10:00:00Z' },
      { weight: 60, reps: 8, completedAt: '2026-09-01T10:05:00Z' },
    ] };
    expect(workingLogs(exercise)).toHaveLength(1);
  });
});

describe('deterministic progression', () => {
  it('increases only after all working sets reach the top range at one load', () => {
    const exercise = { ...buildSession('upper-a')[0], logs: Array.from({ length: 4 }, () => ({ weight: 60, reps: 8, rir: 2, formQuality: 'good' as const, completedAt: new Date().toISOString() })) };
    expect(nextLoadRecommendation(exercise).action).toBe('increase');
    expect(nextLoadRecommendation({ ...exercise, logs: exercise.logs.map((log, index) => ({ ...log, weight: index ? 62.5 : 60 })) }).action).toBe('hold');
  });

  it('recommends variation or external load instead of inventing a bodyweight machine load', () => {
    const definition = findExercise('pushup')!;
    const exercise = { ...definition, sets: 3, logs: Array.from({ length: 3 }, () => ({ weight: 0, reps: definition.repRange[1], rir: 2, formQuality: 'good' as const, completedAt: new Date().toISOString() })) };
    const recommendation = nextLoadRecommendation(exercise);
    expect(recommendation.action).toBe('increase');
    expect(recommendation.message).toContain('variation');
  });

  it('blocks progression for pain, poor form, recovery context and long gaps', () => {
    const base = buildSession('upper-a')[0];
    expect(nextLoadRecommendation({ ...base, logs: [{ weight: 60, reps: 8, pain: true, completedAt: new Date().toISOString() }] }).action).toBe('hold');
    expect(nextLoadRecommendation({ ...base, logs: [{ weight: 60, reps: 8, formQuality: 'poor', completedAt: new Date().toISOString() }] }).action).toBe('hold');
    expect(nextLoadRecommendation({ ...base, logs: [{ weight: 60, reps: 8, completedAt: new Date().toISOString() }] }, undefined, { progressionAllowed: false }).action).toBe('hold');
    expect(nextLoadRecommendation({ ...base, logs: [{ weight: 60, reps: 8, completedAt: new Date().toISOString() }] }, undefined, { daysSincePrevious: 30 }).action).toBe('reduce');
  });

  it('recognizes rep progress only at the same exercise load', () => {
    const base = buildSession('upper-a')[0];
    const previous = { ...base, logs: [{ weight: 60, reps: 6, completedAt: '2026-08-01T10:00:00Z' }] };
    expect(nextLoadRecommendation({ ...base, logs: [{ weight: 60, reps: 7, completedAt: '2026-09-01T10:00:00Z' }] }, previous).action).toBe('reps');
    expect(nextLoadRecommendation({ ...base, logs: [{ weight: 62.5, reps: 7, completedAt: '2026-09-01T10:00:00Z' }] }, previous).action).toBe('hold');
  });

  it('does not award PRs from warm-ups, pain sets or abandoned history', () => {
    const exercise = { ...buildSession('upper-a')[0], logs: [{ weight: 20, reps: 20, warmup: true, completedAt: '2026-09-01T10:00:00Z' }] };
    const history = [{ session: 'upper-a' as const, status: 'abandoned' as const, completedAt: '2026-08-01T10:00:00Z', exercises: [{ ...exercise, logs: [{ weight: 100, reps: 10, completedAt: '2026-08-01T10:00:00Z' }] }] }];
    expect(summarizeWorkout([exercise], history).prs).toBe(0);
  });
});

describe('plate calculator', () => {
  it('supports configurable plates and rejects impossible loads', () => {
    expect(platePlan(80)).toEqual([25, 5]);
    expect(platePlan(45, 15, [10, 5, 2.5])).toEqual([10, 5]);
    expect(platePlan(21)).toBeNull();
  });

  it('finds exact non-greedy combinations for custom plate denominations', () => {
    expect(platePlan(32, 20, [4, 3])).toEqual([3, 3]);
  });
});
