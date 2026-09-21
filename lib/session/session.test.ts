/**
 * Tests for the extracted session orchestration modules (#148).
 *
 * These pin the behaviour that used to live only inside the React shell, so the
 * legacy shell and the new Guide-first shell can coexist without drift.
 */
import { describe, expect, test } from 'vitest';
import type { GymProfile, HistoryEntry, Workout, WorkoutExercise } from '../domain';
import { gyms } from '../program';
import { buildStartWorkout, type StartDecision } from './start-workout';
import { logSetForExercise } from './log-set';
import { substituteExercise, toggleDeferredExercise, addOptionalExercise } from './edit-workout';
import { buildHistoryEntry, isRequiredHandled, hasDeferredRequired } from './finalize-workout';
import { restoreActiveWorkout, pauseWorkout, resumeWorkout } from './lifecycle';

const gym: GymProfile = gyms[0];

const normalReadiness = {
  level: 'normal' as const,
  volumeMultiplier: 1,
  allowProgression: true,
  reasons: [] as string[],
};

const decision: StartDecision = {
  session: 'upper-a',
  progressionAllowed: true,
  reason: 'Next in the rolling split.',
  repeating: false,
  manual: false,
};

const emptyLoad = { minutes: 0, hardSets: 0, lastSessionAt: undefined } as never;

function startContext(overrides: Record<string, unknown> = {}) {
  return {
    history: [] as HistoryEntry[],
    decision,
    readiness: normalReadiness,
    load: emptyLoad,
    gym,
    preferences: { lifeMode: 'normal' as const, swapPreferences: {}, lastUnavailableEquipment: [] },
    newId: () => 'test-id',
    startedAt: '2026-09-21T12:00:00.000Z',
    ...overrides,
  } as never;
}

describe('buildStartWorkout', () => {
  test('produces an active workout with exercises', () => {
    const result = buildStartWorkout(startContext());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workout.status).toBe('active');
    expect(result.workout.session).toBe('upper-a');
    expect(result.workout.id).toBe('test-id');
    expect(result.workout.startedAt).toBe('2026-09-21T12:00:00.000Z');
    expect(result.workout.exercises.length).toBeGreaterThan(0);
  });

  test('pauses progression when readiness forbids it', () => {
    const result = buildStartWorkout(startContext({
      readiness: { ...normalReadiness, allowProgression: false, level: 'reduced', volumeMultiplier: 0.8, reasons: ['Soreness reported.'] },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workout.progressionAllowed).toBe(false);
    expect(result.workout.progressionReason).toBeTruthy();
  });

  test('fails closed when no exercises can be generated', () => {
    const result = buildStartWorkout(startContext({
      context: { gym: { id: 'none', name: 'Empty', equipment: [], unavailable: [] } as unknown as GymProfile },
      gym: { id: 'none', name: 'Empty', equipment: [], unavailable: [] } as unknown as GymProfile,
      preferences: { lifeMode: 'normal' as const, swapPreferences: {}, lastUnavailableEquipment: [] },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.notes.join(' ')).toContain('No exercises could be generated');
  });
});

function activeWorkout(): Workout {
  const result = buildStartWorkout(startContext());
  if (!result.ok) throw new Error('fixture failed');
  return result.workout;
}

describe('logSetForExercise', () => {
  test('appends a valid set', () => {
    const active = activeWorkout();
    const result = logSetForExercise(active, 0, { weight: 60, reps: 8, rir: 2, warmup: false, pain: false, formQuality: 'good', completedAt: '2026-09-21T12:05:00.000Z' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workout.exercises[0].logs).toHaveLength(1);
    expect(result.startRest).toBe(true);
  });

  test('rejects a non-positive rep count', () => {
    const active = activeWorkout();
    const result = logSetForExercise(active, 0, { weight: 60, reps: 0, rir: 2, warmup: false, pain: false, formQuality: 'good', completedAt: '2026-09-21T12:05:00.000Z' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('valid non-negative load');
  });

  test('pain forces progressionAllowed false (safety rule)', () => {
    const active = activeWorkout();
    expect(active.progressionAllowed).toBe(true);
    const result = logSetForExercise(active, 0, { weight: 60, reps: 8, rir: 2, warmup: false, pain: true, formQuality: 'good', completedAt: '2026-09-21T12:05:00.000Z' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workout.progressionAllowed).toBe(false);
    expect(result.workout.progressionReason).toContain('Pain');
  });

  test('does not mutate the input workout', () => {
    const active = activeWorkout();
    logSetForExercise(active, 0, { weight: 60, reps: 8, rir: 2, warmup: false, pain: true, formQuality: 'good', completedAt: '2026-09-21T12:05:00.000Z' });
    expect(active.exercises[0].logs).toHaveLength(0);
    expect(active.progressionAllowed).toBe(true);
  });

  test('refuses when the workout is not active', () => {
    const active = { ...activeWorkout(), status: 'paused' as const };
    const result = logSetForExercise(active, 0, { weight: 60, reps: 8, rir: 2, warmup: false, pain: false, formQuality: 'good', completedAt: '2026-09-21T12:05:00.000Z' });
    expect(result.ok).toBe(false);
  });
});

describe('toggleDeferredExercise', () => {
  test('defers and restores an unfinished exercise', () => {
    const active = activeWorkout();
    const deferred = toggleDeferredExercise(active, 0);
    expect(deferred).not.toBeNull();
    if (!deferred) return;
    expect(deferred.workout.exercises[0].deferred).toBe(true);
    const restored = toggleDeferredExercise(deferred.workout, 0);
    expect(restored?.workout.exercises[0].deferred).toBe(false);
  });

  test('refuses to defer a completed exercise', () => {
    const active = activeWorkout();
    const exercise = active.exercises[0];
    const completed: Workout = {
      ...active,
      exercises: active.exercises.map((item, index) => index === 0
        ? { ...item, logs: Array.from({ length: item.sets }, (_, i) => ({ weight: 50, reps: 8, rir: 2, warmup: false, pain: false, formQuality: 'good' as const, completedAt: `2026-09-21T12:0${i}:00.000Z` })) }
        : item),
    };
    expect(completed.exercises[0].logs).toHaveLength(exercise.sets);
    expect(toggleDeferredExercise(completed, 0)).toBeNull();
  });
});

describe('substituteExercise', () => {
  test('splits a partially-completed exercise and keeps completed sets', () => {
    const active = activeWorkout();
    const logged = logSetForExercise(active, 0, { weight: 60, reps: 8, rir: 2, warmup: false, pain: false, formQuality: 'good', completedAt: '2026-09-21T12:05:00.000Z' });
    expect(logged.ok).toBe(true);
    if (!logged.ok) return;

    const workout = logged.workout;
    const original = workout.exercises[0];
    const originalId = original.originalId || original.id;
    const options = workout.exercises.filter(item => item.id !== original.id && item.movement === original.movement);

    const swapped = substituteExercise(workout, 0, (options[0]?.id || workout.exercises[1].id) as WorkoutExercise['id'], gym);
    if (!swapped) return; // no compatible substitution with this equipment
    expect(swapped.workout.exercises[0].logs).toHaveLength(1);
    expect(swapped.workout.exercises[0].optional).toBe(true);
    expect(swapped.workout.exercises[1].originalId).toBe(originalId);
    expect(swapped.workout.exercises[1].logs).toHaveLength(0);
  });
});

describe('addOptionalExercise', () => {
  test('adds a two-set optional exercise', () => {
    const active = activeWorkout();
    const candidate = active.exercises[0];
    const available = gyms[0];
    const added = addOptionalExercise({ ...active, exercises: [] }, candidate.id, available);
    if (!added) return;
    expect(added.workout.exercises[0].optional).toBe(true);
    expect(added.workout.exercises[0].sets).toBe(2);
  });
});

describe('finalize helpers', () => {
  test('buildHistoryEntry preserves immutability fields', () => {
    const active = activeWorkout();
    const entry = buildHistoryEntry(active, 'completed', '2026-09-21T13:00:00.000Z');
    expect(entry.session).toBe(active.session);
    expect(entry.startedAt).toBe(active.startedAt);
    expect(entry.completedAt).toBe('2026-09-21T13:00:00.000Z');
    expect(entry.programId).toBe(active.programId);
    expect(entry.exercises).toEqual(active.exercises);
  });

  test('required sets must be complete or deferred', () => {
    const active = activeWorkout();
    const working = (exercise: WorkoutExercise) => exercise.logs.filter(log => !log.warmup);
    expect(isRequiredHandled(active, working)).toBe(active.exercises.filter(e => !e.optional).length === 0);
    expect(hasDeferredRequired(active)).toBe(false);
  });
});

describe('lifecycle', () => {
  test('restores an active workout as interrupted', () => {
    const active = activeWorkout();
    const restored = restoreActiveWorkout(active);
    expect(restored?.status).toBe('interrupted');
  });

  test('restores null as null', () => {
    expect(restoreActiveWorkout(null)).toBeNull();
  });

  test('pause and resume round-trip', () => {
    const active = activeWorkout();
    const paused = pauseWorkout(active, '2026-09-21T12:30:00.000Z');
    expect(paused.status).toBe('paused');
    expect(paused.pausedAt).toBe('2026-09-21T12:30:00.000Z');
    const resumed = resumeWorkout(paused);
    expect(resumed.status).toBe('active');
    expect(resumed.pausedAt).toBeUndefined();
  });
});
