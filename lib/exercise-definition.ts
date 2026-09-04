import { Exercise, ExerciseMetadata } from './domain';

export function defineExercise(input: Omit<Exercise, 'metadata'> & { metadata: ExerciseMetadata }): Exercise {
  return input;
}
