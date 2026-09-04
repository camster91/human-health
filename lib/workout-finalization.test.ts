import { describe, expect, it } from 'vitest';
import { HistoryEntry, Workout } from './domain';
import { activeWorkoutWasFinalized, replaceWorkoutActivity, upsertHistoryEntry } from './workout-finalization';

const workout: Workout = { id: 'workout-1', session: 'upper-a', startedAt: '2026-09-01T10:00:00Z', status: 'active', gymId: 'work', exercises: [] };
const entry: HistoryEntry = { workoutId: workout.id, session: workout.session, startedAt: workout.startedAt, completedAt: '2026-09-01T11:00:00Z', status: 'completed', exercises: [] };

describe('idempotent workout finalization', () => {
  it('replaces the same workout history entry rather than duplicating it', () => {
    expect(upsertHistoryEntry([entry], { ...entry, completedAt: '2026-09-01T11:01:00Z' })).toHaveLength(1);
    expect(upsertHistoryEntry([entry], { ...entry, completedAt: '2026-09-01T11:01:00Z' })[0].completedAt).toBe('2026-09-01T11:01:00Z');
  });

  it('replaces workout-derived activity while preserving manual activity', () => {
    const activity = [
      { workoutId: workout.id, domain: 'strength' as const, sets: 4, source: 'workout' as const, completedAt: entry.completedAt },
      { domain: 'cardio' as const, minutes: 20, source: 'manual' as const, completedAt: entry.completedAt },
    ];
    const next = replaceWorkoutActivity(activity, workout.id, [{ workoutId: workout.id, domain: 'strength', sets: 5, source: 'workout', completedAt: entry.completedAt }]);
    expect(next).toHaveLength(2);
    expect(next.find(item => item.workoutId === workout.id)?.sets).toBe(5);
    expect(next.some(item => item.domain === 'cardio')).toBe(true);
  });

  it('detects a stale active record that was already finalized', () => {
    expect(activeWorkoutWasFinalized(workout, [entry])).toBe(true);
    expect(activeWorkoutWasFinalized({ ...workout, id: 'workout-2' }, [entry])).toBe(false);
  });
});
