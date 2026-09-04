export type Movement =
  | 'horizontal-push'
  | 'horizontal-pull'
  | 'vertical-push'
  | 'vertical-pull'
  | 'squat'
  | 'hinge'
  | 'single-leg'
  | 'glute'
  | 'calf'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'carry'
  | 'jump'
  | 'balance';

export type Equipment =
  | 'barbell'
  | 'rack'
  | 'bench'
  | 'cable'
  | 'bodyweight'
  | 'dumbbell'
  | 'machine'
  | 'pullup-bar'
  | 'dip-station'
  | 'cardio';

export type ExerciseMetadata = {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  stability: 'low' | 'moderate' | 'high';
  fatigueCost: 'low' | 'moderate' | 'high';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  unilateral: boolean;
  loadType: 'bodyweight' | 'external' | 'machine';
};

export type Exercise = {
  id: string;
  name: string;
  movement: Movement;
  equipment: Equipment[];
  priority: 'primary' | 'secondary' | 'accessory';
  repRange: [number, number];
  metadata?: ExerciseMetadata;
};

export type SetLog = {
  reps: number;
  /** Canonical stored load in kilograms. Bodyweight-only work can use 0. */
  weight: number;
  rir?: number;
  completedAt: string;
  pain?: boolean;
  warmup?: boolean;
  note?: string;
  formQuality?: 'poor' | 'okay' | 'good';
};

export type WorkoutExercise = Exercise & {
  /** Prescribed working sets; warm-up sets do not count toward this number. */
  sets: number;
  logs: SetLog[];
  originalId?: string;
  /** Optional additions never reduce required-session completion. */
  optional?: boolean;
  /** A planned exercise explicitly left unfinished; preserved for truthful partial-session accounting. */
  deferred?: boolean;
};

export type SessionId = 'upper-a' | 'lower-a' | 'upper-b' | 'lower-b';
export type TrainingMode = 'normal' | 'travel' | 'return' | 'maintenance';
export type WorkoutStatus = 'active' | 'paused' | 'interrupted' | 'completed' | 'ended-early' | 'abandoned';
export type FinalWorkoutStatus = Extract<WorkoutStatus, 'completed' | 'ended-early' | 'abandoned'>;

export type Workout = {
  id: string;
  session: SessionId;
  startedAt: string;
  status: Exclude<WorkoutStatus, FinalWorkoutStatus>;
  gymId: string;
  mode?: TrainingMode;
  programId?: string;
  programVersion?: number;
  unavailableEquipment?: Equipment[];
  exercises: WorkoutExercise[];
  pausedAt?: string;
  /** Snapshot of whether automatic progression was allowed when this workout began. */
  progressionAllowed?: boolean;
  /** Human-readable evidence for a held progression decision. */
  progressionReason?: string;
};

export type GymProfile = {
  id: string;
  name: string;
  equipment: Equipment[];
  temporary?: boolean;
};

export type HistoryEntry = {
  /** Stable id of the active workout that produced this history entry. Legacy entries may omit it. */
  workoutId?: string;
  session: SessionId;
  completedAt: string;
  startedAt?: string;
  gymId?: string;
  mode?: TrainingMode;
  programId?: string;
  programVersion?: number;
  exercises: WorkoutExercise[];
  status?: FinalWorkoutStatus;
};

export type AdaptContext = {
  minutes?: number;
  gym?: GymProfile;
  lowEnergy?: boolean;
  unavailable?: Equipment[];
  volumeMultiplier?: number;
  mode?: TrainingMode;
  /** Allow original set volume after a reduced-readiness check while still holding load progression. */
  overrideRecoveryVolume?: boolean;
  /** Preferred replacement exercise by original exercise id for the active gym. */
  preferredSubstitutions?: Record<string, string>;
};
