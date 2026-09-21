/**
 * Session finalization (extracted from app/human-health-app.tsx for #148).
 *
 * Persists a finished workout as an immutable history entry plus derived activity
 * doses. The fail-closed rule is preserved: if either write fails, nothing is
 * cleared and the workout stays open so the user can retry or export.
 */
import type { HistoryEntry, SetLog, Workout } from '../domain';
import { store } from '../storage';
import { workoutActivityDoses, type ActivityDose } from '../whole-person';

export type FinishStatus = 'completed' | 'ended-early' | 'abandoned';

export type FinishResult =
  | { ok: true; entry: HistoryEntry; history: HistoryEntry[]; activity: ActivityDose[] }
  | { ok: false; error: string };

export function buildHistoryEntry(active: Workout, status: FinishStatus, completedAt = new Date().toISOString()): HistoryEntry {
  return {
    session: active.session,
    startedAt: active.startedAt,
    completedAt,
    status,
    gymId: active.gymId,
    mode: active.mode,
    programId: active.programId,
    programVersion: active.programVersion,
    exercises: active.exercises,
  };
}

/**
 * Finalize a workout into local storage. Writes history and activity first and
 * only clears the active workout when both succeed.
 */
export function finalizeWorkout(
  active: Workout,
  status: FinishStatus,
  history: HistoryEntry[],
  activity: ActivityDose[]
): FinishResult {
  const entry = buildHistoryEntry(active, status);
  const nextHistory = [...history, entry];
  const nextActivity = [...activity, ...workoutActivityDoses(entry)];

  const historySaved = store.saveHistory(nextHistory);
  const activitySaved = store.saveActivity(nextActivity);
  if (!historySaved || !activitySaved) {
    return {
      ok: false,
      error: 'The workout could not be finalized in local storage. It remains open so you can retry or export data after storage is restored.',
    };
  }

  store.saveActive(null);
  store.saveRestTimer(null);
  return { ok: true, entry, history: nextHistory, activity: nextActivity };
}

/** Count of working (non-warmup) sets across a session. */
export function countWorkingSets(exercises: Workout['exercises'], working: (exercise: Workout['exercises'][number]) => SetLog[]): number {
  return exercises.reduce((sum, exercise) => sum + working(exercise).length, 0);
}

/** Whether every non-optional exercise is either deferred or complete. */
export function isRequiredHandled(active: Workout, working: (exercise: Workout['exercises'][number]) => SetLog[]): boolean {
  return active.exercises
    .filter(exercise => !exercise.optional)
    .every(exercise => exercise.deferred || working(exercise).length >= exercise.sets);
}

export function hasDeferredRequired(active: Workout): boolean {
  return active.exercises.some(exercise => !exercise.optional && exercise.deferred);
}
