/**
 * Session editing: substitution, deferral, add-exercise
 * (extracted from app/human-health-app.tsx for #148).
 *
 * Preserves the `originalId` split semantics: when a partially-completed exercise
 * is swapped, the completed sets stay recorded under the original id as optional,
 * and the replacement is inserted after it with the remaining sets.
 */
import type { Exercise, Workout, WorkoutExercise } from '../domain';
import { workingLogs } from '../engine';
import { exerciseIsAvailable, exercises as allExercises, rankedSubstitutions } from '../program';
import type { GymProfile } from '../domain';

export type EditOutcome = { workout: Workout; notes: string[] } | null;

export function substituteExercise(
  active: Workout,
  exerciseIndex: number,
  replacementId: WorkoutExercise['id'],
  gym: GymProfile
): EditOutcome {
  if (active.status !== 'active') return null;
  const current = active.exercises[exerciseIndex];
  if (!current) return null;

  const workingCompleted = workingLogs(current).length;
  const remainingSets = current.sets - Math.min(current.sets, workingCompleted);
  if (remainingSets <= 0) return null;

  const option = rankedSubstitutions(current, gym, {
    unavailable: active.unavailableEquipment || [],
    preferredId: replacementId,
  }).find(item => item.exercise.id === replacementId);
  if (!option) return null;

  const next = structuredClone(active);
  const originalId = current.originalId || current.id;
  const replacementExercise: WorkoutExercise = {
    ...option.exercise,
    sets: remainingSets,
    logs: [],
    originalId,
    optional: current.optional,
  };

  if (current.logs.length) {
    next.exercises[exerciseIndex] = { ...current, sets: workingCompleted, optional: true };
    next.exercises.splice(exerciseIndex + 1, 0, replacementExercise);
  } else {
    next.exercises[exerciseIndex] = replacementExercise;
  }

  return { workout: next, notes: [option.reason] };
}

export function toggleDeferredExercise(active: Workout, exerciseIndex: number): EditOutcome {
  if (active.status !== 'active') return null;
  const current = active.exercises[exerciseIndex];
  if (!current) return null;
  if (workingLogs(current).length >= current.sets) return null;

  const next = structuredClone(active);
  next.exercises[exerciseIndex].deferred = !current.deferred;
  return {
    workout: next,
    notes: [
      next.exercises[exerciseIndex].deferred
        ? `${current.name} was deferred. Completed sets remain recorded, and the session will be finalized as partial unless you restore and finish it.`
        : `${current.name} was restored to the active workout.`,
    ],
  };
}

export function addOptionalExercise(active: Workout, exerciseId: string, gym: GymProfile): EditOutcome {
  if (active.status !== 'active') return null;
  const definition: Exercise | undefined = allExercises.find(item => item.id === exerciseId);
  if (!definition) return null;
  if (!exerciseIsAvailable(definition, gym, active.unavailableEquipment || [])) return null;

  const next = structuredClone(active);
  next.exercises.push({ ...definition, sets: 2, logs: [], optional: true });
  return {
    workout: next,
    notes: [`${definition.name} was added as two optional working sets. It will not make the original session appear incomplete if you leave it unfinished.`],
  };
}
