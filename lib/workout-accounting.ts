import { WorkoutExercise } from './domain';

function rootExerciseId(exercise: WorkoutExercise) {
  return exercise.originalId || exercise.id;
}

/**
 * Planned exercises are required by default. An item made optional solely because a
 * mid-workout substitution split its completed and remaining sets still counts as
 * planned work when a required replacement with the same root id exists.
 */
export function exerciseCountsTowardPlannedWork(exercise: WorkoutExercise, all: WorkoutExercise[]) {
  if (!exercise.optional) return true;
  const hasWorkingSets = exercise.logs.some(log => !log.warmup);
  if (!hasWorkingSets) return false;
  const rootId = rootExerciseId(exercise);
  return all.some(other => other !== exercise && !other.optional && rootExerciseId(other) === rootId);
}

export function plannedExercises(exercises: WorkoutExercise[]) {
  return exercises.filter(exercise => exerciseCountsTowardPlannedWork(exercise, exercises));
}
