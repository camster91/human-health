import { Equipment, Exercise, GymProfile, SessionId, WorkoutExercise } from './domain';
import { lowerExercises } from './exercises-lower';
import { upperPullExercises } from './exercises-upper-pull';
import { upperPushExercises } from './exercises-upper-push';

export const exercises: Exercise[] = [...upperPushExercises, ...upperPullExercises, ...lowerExercises];

const byId = Object.fromEntries(exercises.map(item => [item.id, item]));

export type ProgramDefinition = {
  id: string;
  version: number;
  name: string;
  sessions: Record<SessionId, { id: string; sets: number }[]>;
};

export const starterProgramDefinition: ProgramDefinition = {
  id: 'upper-lower-foundation',
  version: 2,
  name: 'Upper / Lower Foundation',
  sessions: {
    'upper-a': [{ id: 'bench', sets: 4 }, { id: 'row', sets: 4 }, { id: 'ohp', sets: 3 }, { id: 'pulldown', sets: 3 }, { id: 'pallof', sets: 3 }, { id: 'pushdown', sets: 3 }, { id: 'curl', sets: 3 }],
    'lower-a': [{ id: 'squat', sets: 4 }, { id: 'rdl', sets: 3 }, { id: 'split-squat', sets: 3 }, { id: 'hip-thrust', sets: 3 }, { id: 'calf', sets: 4 }, { id: 'plank', sets: 3 }],
    'upper-b': [{ id: 'incline', sets: 4 }, { id: 'row', sets: 3 }, { id: 'ohp', sets: 3 }, { id: 'pullup', sets: 3 }, { id: 'pushdown', sets: 3 }, { id: 'curl', sets: 3 }],
    'lower-b': [{ id: 'squat', sets: 3 }, { id: 'rdl', sets: 3 }, { id: 'reverse-lunge', sets: 3 }, { id: 'hip-thrust', sets: 3 }, { id: 'calf', sets: 4 }, { id: 'pallof', sets: 3 }],
  },
};
export const starterProgram = starterProgramDefinition.sessions;

export const gyms: GymProfile[] = [
  { id: 'work', name: 'Rack + Cable Gym', equipment: ['barbell', 'rack', 'bench', 'cable', 'bodyweight', 'pullup-bar', 'cardio'] },
  { id: 'commercial', name: 'Commercial Gym', equipment: ['barbell', 'rack', 'bench', 'cable', 'bodyweight', 'dumbbell', 'machine', 'pullup-bar', 'dip-station', 'cardio'] },
  { id: 'home', name: 'Home / No Equipment', equipment: ['bodyweight'] },
  { id: 'hotel', name: 'Hotel / Travel Gym', equipment: ['bodyweight', 'dumbbell', 'bench', 'cardio'], temporary: true },
  { id: 'bodyweight-bar', name: 'Bodyweight + Pull-Up Bar', equipment: ['bodyweight', 'pullup-bar'] },
];

export function findExercise(exerciseId: string) {
  return byId[exerciseId] as Exercise | undefined;
}

export function buildSession(session: SessionId): WorkoutExercise[] {
  return starterProgram[session].map(item => ({ ...byId[item.id], sets: item.sets, logs: [] }));
}

export function exerciseIsAvailable(exercise: Exercise, gym: GymProfile, unavailable: Equipment[] = []) {
  return exercise.equipment.every(item => gym.equipment.includes(item) && !unavailable.includes(item));
}

function substitutionScore(source: Exercise, candidate: Exercise) {
  let score = 0;
  if (candidate.priority === source.priority) score += 5;
  if (candidate.metadata?.loadType === source.metadata?.loadType) score += 3;
  if (candidate.metadata?.fatigueCost === source.metadata?.fatigueCost) score += 2;
  if (candidate.metadata?.stability === source.metadata?.stability) score += 1;
  const sourceMuscles = new Set(source.metadata?.primaryMuscles || []);
  score += (candidate.metadata?.primaryMuscles || []).filter(muscle => sourceMuscles.has(muscle)).length;
  return score;
}

export type ExerciseSubstitution = { exercise: Exercise; score: number; reason: string; preferred: boolean };
export function rankedSubstitutions(exercise: Exercise, gym: GymProfile, options: { unavailable?: Equipment[]; preferredId?: string } = {}): ExerciseSubstitution[] {
  return exercises
    .filter(candidate => candidate.id !== exercise.id && candidate.movement === exercise.movement && exerciseIsAvailable(candidate, gym, options.unavailable))
    .map(candidate => ({
      exercise: candidate,
      score: substitutionScore(exercise, candidate) + (candidate.id === options.preferredId ? 100 : 0),
      preferred: candidate.id === options.preferredId,
      reason: `${candidate.name} preserves ${exercise.movement.replaceAll('-', ' ')} intent. Its load and progression history remain separate from ${exercise.name}.`,
    }))
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
}

export function substitutions(exercise: Exercise, gym: GymProfile, unavailable: Equipment[] = [], preferredId?: string) {
  return rankedSubstitutions(exercise, gym, { unavailable, preferredId }).map(item => item.exercise);
}
