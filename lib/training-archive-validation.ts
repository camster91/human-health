import type { Equipment, ExerciseMetadata, HistoryEntry, Movement, SetLog, TrainingMode, Workout, WorkoutExercise } from './domain';
import type { SkillAssessment } from './performance';
import { defaultPreferences, normalizePreferences, type UserPreferences } from './preferences';
import type { RestTimerState } from './rest-timer';
import type { ScheduleEvent } from './schedule';
import type { ActivityDose, Assessment, CapabilityDomain, ReadinessInput, ReadinessRecord, SkillMetric } from './whole-person';

const FUTURE_TOLERANCE_MS = 5 * 60_000;
const sessions = ['upper-a', 'lower-a', 'upper-b', 'lower-b'] as const;
const modes = ['normal', 'travel', 'return', 'maintenance'] as const;
const movements: Movement[] = ['horizontal-push', 'horizontal-pull', 'vertical-push', 'vertical-pull', 'squat', 'hinge', 'single-leg', 'glute', 'calf', 'biceps', 'triceps', 'core', 'carry', 'jump', 'balance'];
const equipmentValues: Equipment[] = ['barbell', 'rack', 'bench', 'cable', 'bodyweight', 'dumbbell', 'machine', 'pullup-bar', 'dip-station', 'cardio'];
const domains: CapabilityDomain[] = ['strength', 'cardio', 'mobility', 'core', 'bodyweight', 'balance', 'power', 'movement', 'recovery', 'consistency'];
const skillMetrics: SkillMetric[] = ['reps', 'seconds', 'assistance-kg', 'external-load-kg', 'quality'];
const cardioModalities = ['walk', 'run', 'cycle', 'row', 'incline-treadmill', 'other'] as const;
const priorities = ['focus', 'maintain', 'deprioritize', 'off'] as const;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, optional = false) {
  if (optional && (value === undefined || value === null || (typeof value === 'string' && !value.trim()))) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 1000) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function optionalBoolean(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean.`);
  return value;
}

function finite(value: unknown, label: string, options: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {}) {
  if (options.optional && value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  if (options.integer && !Number.isInteger(value)) throw new Error(`${label} must be an integer.`);
  if (options.min !== undefined && value < options.min) throw new Error(`${label} is below the supported range.`);
  if (options.max !== undefined && value > options.max) throw new Error(`${label} is above the supported range.`);
  return value;
}

function timestamp(value: unknown, label: string, now: Date, options: { optional?: boolean; allowFuture?: boolean } = {}) {
  if (options.optional && value === undefined) return undefined;
  const text = stringValue(value, label);
  const parsed = Date.parse(text!);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not a valid timestamp.`);
  if (!options.allowFuture && parsed > now.getTime() + FUTURE_TOLERANCE_MS) throw new Error(`${label} is materially in the future.`);
  return text!;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], label: string, optional = false): T | undefined {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${label} is unsupported.`);
  return value as T;
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > 100) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => stringValue(item, `${label}[${index}]`)!).filter(Boolean);
}

function validateSet(value: unknown, label: string, now: Date, startedAt?: string): SetLog {
  const item = record(value, label);
  const completedAt = timestamp(item.completedAt, `${label}.completedAt`, now)!;
  if (startedAt && Date.parse(completedAt) + FUTURE_TOLERANCE_MS < Date.parse(startedAt)) throw new Error(`${label}.completedAt is before the workout started.`);
  return {
    reps: finite(item.reps, `${label}.reps`, { min: 0.01, max: 100_000 })!,
    weight: finite(item.weight, `${label}.weight`, { min: 0, max: 100_000 })!,
    completedAt,
    rir: finite(item.rir, `${label}.rir`, { min: 0, max: 20, optional: true }),
    pain: optionalBoolean(item.pain, `${label}.pain`),
    warmup: optionalBoolean(item.warmup, `${label}.warmup`),
    note: stringValue(item.note, `${label}.note`, true),
    formQuality: enumValue(item.formQuality, ['poor', 'okay', 'good'] as const, `${label}.formQuality`, true),
  };
}

function validateMetadata(value: unknown, label: string): ExerciseMetadata | undefined {
  if (value === undefined) return undefined;
  const item = record(value, label);
  return {
    primaryMuscles: stringArray(item.primaryMuscles, `${label}.primaryMuscles`),
    secondaryMuscles: item.secondaryMuscles === undefined ? undefined : stringArray(item.secondaryMuscles, `${label}.secondaryMuscles`),
    stability: enumValue(item.stability, ['low', 'moderate', 'high'] as const, `${label}.stability`)!,
    fatigueCost: enumValue(item.fatigueCost, ['low', 'moderate', 'high'] as const, `${label}.fatigueCost`)!,
    skillLevel: enumValue(item.skillLevel, ['beginner', 'intermediate', 'advanced'] as const, `${label}.skillLevel`)!,
    unilateral: typeof item.unilateral === 'boolean' ? item.unilateral : (() => { throw new Error(`${label}.unilateral must be boolean.`); })(),
    loadType: enumValue(item.loadType, ['bodyweight', 'external', 'machine'] as const, `${label}.loadType`)!,
  };
}

function validateExercise(value: unknown, label: string, now: Date, startedAt?: string): WorkoutExercise {
  const item = record(value, label);
  const repRange = item.repRange;
  if (!Array.isArray(repRange) || repRange.length !== 2) throw new Error(`${label}.repRange must contain exactly two values.`);
  const low = finite(repRange[0], `${label}.repRange[0]`, { min: 0.01, max: 100_000 })!;
  const high = finite(repRange[1], `${label}.repRange[1]`, { min: low, max: 100_000 })!;
  if (!Array.isArray(item.equipment) || item.equipment.some(value => !equipmentValues.includes(value as Equipment))) throw new Error(`${label}.equipment contains an unsupported value.`);
  if (!Array.isArray(item.logs) || item.logs.length > 2000) throw new Error(`${label}.logs must be an array.`);
  return {
    id: stringValue(item.id, `${label}.id`)!,
    name: stringValue(item.name, `${label}.name`)!,
    movement: enumValue(item.movement, movements, `${label}.movement`)! as Movement,
    equipment: [...new Set(item.equipment as Equipment[])],
    priority: enumValue(item.priority, ['primary', 'secondary', 'accessory'] as const, `${label}.priority`)!,
    repRange: [low, high],
    metadata: validateMetadata(item.metadata, `${label}.metadata`),
    sets: finite(item.sets, `${label}.sets`, { min: 1, max: 100, integer: true })!,
    logs: item.logs.map((log, index) => validateSet(log, `${label}.logs[${index}]`, now, startedAt)),
    originalId: stringValue(item.originalId, `${label}.originalId`, true),
    optional: optionalBoolean(item.optional, `${label}.optional`),
    deferred: optionalBoolean(item.deferred, `${label}.deferred`),
  };
}

export function validateActiveWorkout(value: unknown, now = new Date()): Workout | null {
  if (value === null) return null;
  const item = record(value, 'activeWorkout');
  const startedAt = timestamp(item.startedAt, 'activeWorkout.startedAt', now)!;
  if (!Array.isArray(item.exercises) || item.exercises.length > 200) throw new Error('activeWorkout.exercises must be an array.');
  return {
    id: stringValue(item.id, 'activeWorkout.id')!,
    session: enumValue(item.session, sessions, 'activeWorkout.session')!,
    startedAt,
    status: enumValue(item.status, ['active', 'paused', 'interrupted'] as const, 'activeWorkout.status')!,
    gymId: stringValue(item.gymId, 'activeWorkout.gymId')!,
    mode: enumValue(item.mode, modes, 'activeWorkout.mode', true) as TrainingMode | undefined,
    programId: stringValue(item.programId, 'activeWorkout.programId', true),
    programVersion: finite(item.programVersion, 'activeWorkout.programVersion', { min: 1, max: 1_000_000, integer: true, optional: true }),
    unavailableEquipment: item.unavailableEquipment === undefined ? undefined : validateEquipmentArray(item.unavailableEquipment, 'activeWorkout.unavailableEquipment'),
    exercises: item.exercises.map((exercise, index) => validateExercise(exercise, `activeWorkout.exercises[${index}]`, now, startedAt)),
    pausedAt: timestamp(item.pausedAt, 'activeWorkout.pausedAt', now, { optional: true }),
    progressionAllowed: optionalBoolean(item.progressionAllowed, 'activeWorkout.progressionAllowed'),
    progressionReason: stringValue(item.progressionReason, 'activeWorkout.progressionReason', true),
  };
}

function validateEquipmentArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some(item => !equipmentValues.includes(item as Equipment))) throw new Error(`${label} contains an unsupported equipment value.`);
  return [...new Set(value as Equipment[])];
}

export function validateHistory(value: unknown, now = new Date()): HistoryEntry[] {
  if (!Array.isArray(value)) throw new Error('Training history must be an array.');
  if (value.length > 100_000) throw new Error('Training history is too large to import safely.');
  return value.map((raw, index) => {
    const label = `history[${index}]`;
    const item = record(raw, label);
    const completedAt = timestamp(item.completedAt, `${label}.completedAt`, now)!;
    const startedAt = timestamp(item.startedAt, `${label}.startedAt`, now, { optional: true });
    if (startedAt && Date.parse(startedAt) > Date.parse(completedAt) + FUTURE_TOLERANCE_MS) throw new Error(`${label}.startedAt is after completion.`);
    if (!Array.isArray(item.exercises) || item.exercises.length > 200) throw new Error(`${label}.exercises must be an array.`);
    return {
      workoutId: stringValue(item.workoutId, `${label}.workoutId`, true),
      session: enumValue(item.session, sessions, `${label}.session`)! ,
      completedAt,
      startedAt,
      gymId: stringValue(item.gymId, `${label}.gymId`, true),
      mode: enumValue(item.mode, modes, `${label}.mode`, true) as TrainingMode | undefined,
      programId: stringValue(item.programId, `${label}.programId`, true),
      programVersion: finite(item.programVersion, `${label}.programVersion`, { min: 1, max: 1_000_000, integer: true, optional: true }),
      exercises: item.exercises.map((exercise, exerciseIndex) => validateExercise(exercise, `${label}.exercises[${exerciseIndex}]`, now, startedAt)),
      status: enumValue(item.status, ['completed', 'ended-early', 'abandoned'] as const, `${label}.status`, true),
    } satisfies HistoryEntry;
  });
}

export function validateActivity(value: unknown, now = new Date()): ActivityDose[] {
  if (!Array.isArray(value)) throw new Error('Training activity must be an array.');
  if (value.length > 200_000) throw new Error('Training activity is too large to import safely.');
  return value.map((raw, index) => {
    const label = `activity[${index}]`;
    const item = record(raw, label);
    const minutes = finite(item.minutes, `${label}.minutes`, { min: 0, max: 100_000, optional: true });
    const sets = finite(item.sets, `${label}.sets`, { min: 0, max: 100_000, integer: true, optional: true });
    if (minutes === undefined && sets === undefined) throw new Error(`${label} must include minutes or sets.`);
    return {
      domain: enumValue(item.domain, domains, `${label}.domain`)! as CapabilityDomain,
      minutes,
      sets,
      effort: enumValue(item.effort, ['easy', 'moderate', 'hard'] as const, `${label}.effort`, true),
      sessionId: stringValue(item.sessionId, `${label}.sessionId`, true),
      workoutId: stringValue(item.workoutId, `${label}.workoutId`, true),
      completedAt: timestamp(item.completedAt, `${label}.completedAt`, now)!,
      kind: enumValue(item.kind, ['planned', 'incidental'] as const, `${label}.kind`, true),
      modality: enumValue(item.modality, cardioModalities, `${label}.modality`, true),
      source: enumValue(item.source, ['manual', 'workout', 'device'] as const, `${label}.source`, true),
      quality: finite(item.quality, `${label}.quality`, { min: 0, max: 1, optional: true }),
    } satisfies ActivityDose;
  });
}

function validateReadinessInput(value: unknown, label: string): ReadinessInput {
  const item = record(value, label);
  return {
    sleep: enumValue(item.sleep, ['poor', 'okay', 'good'] as const, `${label}.sleep`, true),
    sleepHours: finite(item.sleepHours, `${label}.sleepHours`, { min: 0, max: 24, optional: true }),
    fatigue: enumValue(item.fatigue, ['low', 'moderate', 'high'] as const, `${label}.fatigue`, true),
    soreness: enumValue(item.soreness, ['low', 'moderate', 'high'] as const, `${label}.soreness`, true),
    stress: enumValue(item.stress, ['low', 'moderate', 'high'] as const, `${label}.stress`, true),
    subjective: finite(item.subjective, `${label}.subjective`, { min: 1, max: 5, integer: true, optional: true }) as ReadinessInput['subjective'],
    illness: optionalBoolean(item.illness, `${label}.illness`),
    pain: optionalBoolean(item.pain, `${label}.pain`),
  };
}

export function validateReadiness(value: unknown, now = new Date()): ReadinessRecord[] {
  if (!Array.isArray(value)) throw new Error('Training readiness must be an array.');
  return value.map((raw, index) => {
    const label = `readiness[${index}]`;
    const item = record(raw, label);
    if (item.source !== undefined && item.source !== 'manual') throw new Error(`${label}.source must be manual in a training archive.`);
    return {
      recordedAt: timestamp(item.recordedAt, `${label}.recordedAt`, now)!,
      input: validateReadinessInput(item.input, `${label}.input`),
      source: item.source as 'manual' | undefined,
      sourceName: stringValue(item.sourceName, `${label}.sourceName`, true),
    } satisfies ReadinessRecord;
  });
}

export function validateAssessments(value: unknown, now = new Date()): Assessment[] {
  if (!Array.isArray(value)) throw new Error('Capability assessments must be an array.');
  return value.map((raw, index) => {
    const label = `assessments[${index}]`;
    const item = record(raw, label);
    return {
      metricId: stringValue(item.metricId, `${label}.metricId`)!,
      value: finite(item.value, `${label}.value`, { min: -1_000_000, max: 1_000_000 })!,
      recordedAt: timestamp(item.recordedAt, `${label}.recordedAt`, now)!,
      note: stringValue(item.note, `${label}.note`, true),
    };
  });
}

export function validateSkillAssessments(value: unknown, now = new Date()): SkillAssessment[] {
  if (!Array.isArray(value)) throw new Error('Skill assessments must be an array.');
  return value.map((raw, index) => {
    const label = `skillAssessments[${index}]`;
    const item = record(raw, label);
    for (const key of ['passed', 'clean', 'pain'] as const) if (typeof item[key] !== 'boolean') throw new Error(`${label}.${key} must be boolean.`);
    return {
      treeId: stringValue(item.treeId, `${label}.treeId`)!,
      stepId: stringValue(item.stepId, `${label}.stepId`)!,
      passed: item.passed as boolean,
      clean: item.clean as boolean,
      pain: item.pain as boolean,
      recordedAt: timestamp(item.recordedAt, `${label}.recordedAt`, now)!,
      metric: enumValue(item.metric, skillMetrics, `${label}.metric`, true) as SkillMetric | undefined,
      value: finite(item.value, `${label}.value`, { min: 0, max: 1_000_000, optional: true }),
      assistanceKg: finite(item.assistanceKg, `${label}.assistanceKg`, { min: 0, max: 100_000, optional: true }),
      externalLoadKg: finite(item.externalLoadKg, `${label}.externalLoadKg`, { min: 0, max: 100_000, optional: true }),
      variation: stringValue(item.variation, `${label}.variation`, true),
      note: stringValue(item.note, `${label}.note`, true),
    };
  });
}

export function validateStringRecord(value: unknown, label: string): Record<string, string> {
  const item = record(value, label);
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(item)) {
    if (!key.trim() || key.length > 500) throw new Error(`${label} contains an invalid key.`);
    result[key] = stringValue(raw, `${label}.${key}`)!;
  }
  return result;
}

export function validateScheduleEvents(value: unknown, now = new Date()): ScheduleEvent[] {
  if (!Array.isArray(value)) throw new Error('Schedule events must be an array.');
  return value.map((raw, index) => {
    const label = `scheduleEvents[${index}]`;
    const item = record(raw, label);
    return {
      type: enumValue(item.type, ['override', 'skip'] as const, `${label}.type`)!,
      from: enumValue(item.from, sessions, `${label}.from`)! ,
      to: enumValue(item.to, sessions, `${label}.to`)! ,
      recordedAt: timestamp(item.recordedAt, `${label}.recordedAt`, now)!,
      reason: stringValue(item.reason, `${label}.reason`)!,
    };
  });
}

export function validatePreferences(value: unknown): UserPreferences {
  const item = record(value, 'preferences');
  if (item.lifeMode !== undefined) enumValue(item.lifeMode, modes, 'preferences.lifeMode');
  if (item.selectedGymId !== undefined) stringValue(item.selectedGymId, 'preferences.selectedGymId');
  if (item.cardioTargetMinutes !== undefined) finite(item.cardioTargetMinutes, 'preferences.cardioTargetMinutes', { min: 0, max: 600 });
  for (const key of ['highImpactAllowed', 'notificationEnabled', 'vibrationEnabled'] as const) if (item[key] !== undefined && typeof item[key] !== 'boolean') throw new Error(`preferences.${key} must be boolean.`);
  if (item.defaultRestSeconds !== undefined) finite(item.defaultRestSeconds, 'preferences.defaultRestSeconds', { min: 15, max: 600 });
  if (item.unitSystem !== undefined) enumValue(item.unitSystem, ['metric', 'imperial'] as const, 'preferences.unitSystem');
  if (item.nextSessionOverride !== undefined && item.nextSessionOverride !== null) enumValue(item.nextSessionOverride, sessions, 'preferences.nextSessionOverride');
  if (item.domainPriorities !== undefined) {
    const values = record(item.domainPriorities, 'preferences.domainPriorities');
    for (const [key, priority] of Object.entries(values)) {
      if (!domains.includes(key as CapabilityDomain)) throw new Error(`preferences.domainPriorities contains unknown domain ${key}.`);
      enumValue(priority, priorities, `preferences.domainPriorities.${key}`);
    }
  }
  if (item.swapPreferences !== undefined) validateStringRecord(item.swapPreferences, 'preferences.swapPreferences');
  if (item.plateBarKg !== undefined) finite(item.plateBarKg, 'preferences.plateBarKg', { min: 0, max: 50 });
  if (item.availablePlatesKg !== undefined) {
    if (!Array.isArray(item.availablePlatesKg)) throw new Error('preferences.availablePlatesKg must be an array.');
    item.availablePlatesKg.forEach((plate, index) => finite(plate, `preferences.availablePlatesKg[${index}]`, { min: 0.01, max: 100 }));
  }
  if (item.lastUnavailableEquipment !== undefined) validateEquipmentArray(item.lastUnavailableEquipment, 'preferences.lastUnavailableEquipment');
  return normalizePreferences(item as Partial<UserPreferences> || defaultPreferences);
}

export function validateRestTimer(value: unknown, now = new Date()): RestTimerState | null {
  if (value === null) return null;
  const item = record(value, 'restTimer');
  const durationMs = finite(item.durationMs, 'restTimer.durationMs', { min: 1, max: 86_400_000 })!;
  if (item.status === 'paused') {
    const remainingMs = finite(item.remainingMs, 'restTimer.remainingMs', { min: 1, max: durationMs })!;
    return { status: 'paused', remainingMs, durationMs };
  }
  if (item.status === 'running') {
    const endsAt = finite(item.endsAt, 'restTimer.endsAt', { min: 1 })!;
    return endsAt > now.getTime() ? { status: 'running', endsAt, durationMs } : null;
  }
  throw new Error('restTimer.status is unsupported.');
}

export function validateExportedAt(value: unknown, now = new Date()) {
  return timestamp(value, 'exportedAt', now, { allowFuture: false })!;
}
