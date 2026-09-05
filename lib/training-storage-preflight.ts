import { defaultPreferences } from './preferences';
import {
  validateActiveWorkout,
  validateActivity,
  validateAssessments,
  validateHistory,
  validatePreferences,
  validateReadiness,
  validateRestTimer,
  validateScheduleEvents,
  validateSkillAssessments,
  validateStringRecord,
} from './training-archive-validation';

const PREFIX = 'human-health:';
const ACTIVE = `${PREFIX}active`;
const HISTORY = `${PREFIX}history`;
const ACTIVITY = `${PREFIX}activity`;
const READINESS = `${PREFIX}readiness`;
const SKILLS = `${PREFIX}skills`;
const ASSESSMENTS = `${PREFIX}assessments`;
const PROGRESSIONS = `${PREFIX}progressions`;
const SKILL_ASSESSMENTS = `${PREFIX}skill-assessments`;
const REST_TIMER = `${PREFIX}rest-timer`;
const LEGACY_REST_UNTIL = `${PREFIX}rest-until`;
const PREFERENCES = `${PREFIX}preferences`;
const SCHEDULE_EVENTS = `${PREFIX}schedule-events`;
const FINALIZATION_JOURNAL = `${PREFIX}finalization-journal`;

type PendingFinalization = { workoutId: string; activityComplete: boolean };

export type TrainingStoragePreflight = {
  errors: string[];
  pendingFinalization: PendingFinalization | null;
};

function readJson(key: string, fallback: unknown, errors: string[]) {
  let raw: string | null;
  try { raw = localStorage.getItem(key); }
  catch (error) {
    errors.push(`${key} could not be read from browser storage${error instanceof Error ? `: ${error.message}` : ''}.`);
    return fallback;
  }
  if (raw === null) return fallback;
  try { return JSON.parse(raw) as unknown; }
  catch (error) {
    errors.push(`${key} contains malformed JSON${error instanceof Error ? `: ${error.message}` : ''}.`);
    return fallback;
  }
}

function validate(label: string, errors: string[], fn: () => unknown) {
  try { fn(); }
  catch (error) { errors.push(`${label} is corrupt or unsupported${error instanceof Error ? `: ${error.message}` : ''}.`); }
}

/**
 * Validate every authoritative training localStorage domain without performing
 * migrations, finalization replay, timer cleanup, or any other storage write.
 * This preflight exists so discovering corruption in a later key cannot happen
 * after an earlier runtime loader has already mutated otherwise valid state.
 */
export function preflightTrainingStorage(options: { now?: Date; blockPendingFinalization?: boolean } = {}): TrainingStoragePreflight {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return { errors: [], pendingFinalization: null };
  const now = options.now || new Date();
  const errors: string[] = [];

  const activeRaw = readJson(ACTIVE, null, errors);
  let active: ReturnType<typeof validateActiveWorkout> = null;
  validate('Saved active workout', errors, () => { active = validateActiveWorkout(activeRaw, now); });

  const historyRaw = readJson(HISTORY, [], errors);
  validate('Saved workout history', errors, () => validateHistory(historyRaw, now));

  validate('Saved activity data', errors, () => validateActivity(readJson(ACTIVITY, [], errors), now));

  const readinessRaw = readJson(READINESS, [], errors);
  validate('Saved readiness data', errors, () => {
    if (!Array.isArray(readinessRaw)) throw new Error('Readiness must be an array.');
    const manual = readinessRaw.filter(record => !(record && typeof record === 'object' && (record as { source?: unknown }).source === 'connected-sleep'));
    validateReadiness(manual, now);
  });

  validate('Saved skill state', errors, () => validateStringRecord(readJson(SKILLS, {}, errors), 'skills'));
  validate('Saved capability assessments', errors, () => validateAssessments(readJson(ASSESSMENTS, [], errors), now));
  validate('Saved progression state', errors, () => validateStringRecord(readJson(PROGRESSIONS, {}, errors), 'progressions'));
  validate('Saved skill assessments', errors, () => validateSkillAssessments(readJson(SKILL_ASSESSMENTS, [], errors), now));
  validate('Saved rest timer', errors, () => validateRestTimer(readJson(REST_TIMER, null, errors), now));
  validate('Saved training preferences', errors, () => validatePreferences(readJson(PREFERENCES, defaultPreferences, errors)));
  validate('Saved schedule events', errors, () => validateScheduleEvents(readJson(SCHEDULE_EVENTS, [], errors), now));

  const legacyTimer = readJson(LEGACY_REST_UNTIL, null, errors);
  validate('Saved legacy rest timer', errors, () => {
    if (legacyTimer !== null && (typeof legacyTimer !== 'number' || !Number.isFinite(legacyTimer))) throw new Error('Legacy timer end must be finite.');
  });

  const journalRaw = readJson(FINALIZATION_JOURNAL, null, errors);
  let pendingFinalization: PendingFinalization | null = null;
  if (journalRaw !== null) {
    validate('Pending workout finalization data', errors, () => {
      if (!journalRaw || typeof journalRaw !== 'object' || Array.isArray(journalRaw)) throw new Error('Finalization journal must be an object.');
      const candidate = journalRaw as { version?: unknown; workoutId?: unknown; history?: unknown; activity?: unknown };
      if (candidate.version !== 1 || typeof candidate.workoutId !== 'string' || !candidate.workoutId.trim() || !Array.isArray(candidate.history)) throw new Error('Finalization journal header is invalid.');
      if (candidate.activity !== null && !Array.isArray(candidate.activity)) throw new Error('Finalization journal activity is invalid.');
      validateHistory(candidate.history, now);
      if (candidate.activity !== null) validateActivity(candidate.activity, now);
      if (active && active.id !== candidate.workoutId) throw new Error('Finalization journal belongs to a different active workout.');
      pendingFinalization = { workoutId: candidate.workoutId, activityComplete: candidate.activity !== null };
    });
  }

  if (options.blockPendingFinalization && pendingFinalization) {
    errors.push('A workout finalization is still pending. Resolve or recover the active workout before creating a complete export.');
  }

  return { errors: [...new Set(errors)], pendingFinalization };
}
