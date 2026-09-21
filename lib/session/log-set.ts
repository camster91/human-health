/**
 * Session set logging + pain handling (extracted from app/human-health-app.tsx for #148).
 *
 * The pain rule is the safety-critical part: reporting pain during a set must set
 * progressionAllowed = false and record a reason. That behaviour is preserved
 * exactly; a regression here would be a safety regression.
 */
import type { SetLog, Workout } from '../domain';

export type LogSetOutcome =
  | { ok: true; workout: Workout; startRest: true }
  | { ok: false; error: string; workout: Workout };

/**
 * Append a set to an exercise. Returns a new Workout; never mutates the input.
 * `progressionAllowed` is forced false when the set reports pain.
 */
export function logSetForExercise(
  active: Workout,
  exerciseIndex: number,
  log: SetLog
): LogSetOutcome {
  if (active.status !== 'active') {
    return { ok: false, error: 'This workout is not active.', workout: active };
  }
  if (!Number.isFinite(log.weight) || log.weight < 0 || !Number.isFinite(log.reps) || log.reps <= 0) {
    return {
      ok: false,
      error: 'Enter a valid non-negative load and at least one rep or second before logging the set.',
      workout: active,
    };
  }

  const next = structuredClone(active);
  next.exercises[exerciseIndex].logs.push(log);
  if (log.pain) {
    next.progressionAllowed = false;
    next.progressionReason = 'Pain or unusual discomfort was flagged during this workout. Automatic progression is paused.';
  }
  return { ok: true, workout: next, startRest: true };
}
