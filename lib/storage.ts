import { CONNECTED_SLEEP_CONTEXT_KEY, loadConnectedSleepContext } from './connected-health/connected-readiness';
import { FuelCheck } from './connected-health/fuel';
import { MindCheck } from './connected-health/mind';
import { SoftHabitCompletion } from './connected-health/soft-habits';
import { WeeklyReflection } from './connected-health/weekly-reflection';
import { HistoryEntry, Workout } from './domain';
import { SkillAssessment } from './performance';
import { defaultPreferences, normalizePreferences, UserPreferences } from './preferences';
import { RestTimerState, sanitizeRestTimer, startRestTimer } from './rest-timer';
import { ScheduleEvent } from './schedule';
import {
  validateActiveWorkout,
  validateActivity,
  validateAssessments,
  validateExportedAt,
  validateHistory,
  validatePreferences,
  validateReadiness,
  validateRestTimer,
  validateScheduleEvents,
  validateSkillAssessments,
  validateStringRecord,
} from './training-archive-validation';
import { ActivityDose, Assessment, ReadinessRecord } from './whole-person';
import { activeWorkoutWasFinalized, deduplicateHistory, deduplicateWorkoutActivity } from './workout-finalization';

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
const STORAGE_PROBE = `${PREFIX}storage-probe`;
const FUEL_CHECKS = `${PREFIX}fuel-checks`;
const SOFT_HABIT_COMPLETIONS = `${PREFIX}soft-habit-completions`;
const MIND_CHECKS = `${PREFIX}mind-checks`;
const WEEKLY_REFLECTIONS = `${PREFIX}weekly-reflections`;

let mutationFailure: string | null = null;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    mutationFailure = 'Saved local data could not be read. The affected value was ignored.';
    return fallback;
  }
}

function validateStoredValue<T>(
  raw: unknown,
  validator: (value: unknown) => T | null,
  label: string,
  errorMessage: string
): T {
  const validated = validator(raw);
  if (validated === null) {
    throw new Error(`${errorMessage} Export your data if possible, then delete corrupt local training state before continuing.`);
  }
  return validated;
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    mutationFailure = null;
    return true;
  } catch {
    mutationFailure = 'Browser storage rejected the latest save. Keep this page open and export data before continuing.';
    return false;
  }
}

function remove(key: string) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    mutationFailure = null;
    return true;
  } catch {
    mutationFailure = 'Browser storage rejected a local deletion.';
    return false;
  }
}

/**
 * Execute a related group of localStorage mutations while preserving the first
 * failure message. Individual successful writes/removals clear mutationFailure,
 * so batch operations must not let a later success hide an earlier failure.
 */
function runMutations(operations: (() => boolean)[], fallback: string) {
  let firstFailure: string | null = null;
  let succeeded = true;
  mutationFailure = null;
  for (const operation of operations) {
    if (operation()) continue;
    succeeded = false;
    firstFailure ||= mutationFailure || fallback;
  }
  if (!succeeded) mutationFailure = firstFailure || fallback;
  return succeeded;
}

function canPersist() {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_PROBE, '1');
    localStorage.removeItem(STORAGE_PROBE);
    return true;
  } catch {
    mutationFailure = 'Browser storage is unavailable or full.';
    return false;
  }
}

function activeWorkout(value: unknown): Workout | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Workout>;
  if (!candidate.id || !candidate.session || !candidate.startedAt || !candidate.gymId || !Array.isArray(candidate.exercises)) return null;
  if (!['active', 'paused', 'interrupted'].includes(candidate.status || '')) return null;
  return candidate as Workout;
}

function validateStoredHistory(raw: unknown): HistoryEntry[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    const validated: HistoryEntry[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Partial<HistoryEntry>;
      if (!entry.session || !entry.completedAt || !Array.isArray(entry.exercises)) return null;
      validated.push(entry as HistoryEntry);
    }
    return deduplicateHistory(validated);
  } catch {
    return null;
  }
}

function validateStoredActivity(raw: unknown): ActivityDose[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const dose = item as Partial<ActivityDose>;
      if (!dose.domain || !dose.completedAt) return null;
      if (dose.minutes === undefined && dose.sets === undefined) return null;
    }
    return deduplicateWorkoutActivity(raw as ActivityDose[]);
  } catch {
    return null;
  }
}

function validateStoredAssessments(raw: unknown): Assessment[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const assessment = item as Partial<Assessment>;
      if (!assessment.metricId || !assessment.recordedAt || typeof assessment.value !== 'number') return null;
    }
    return raw as Assessment[];
  } catch {
    return null;
  }
}

function validateStoredSkillAssessments(raw: unknown): SkillAssessment[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const skill = item as Partial<SkillAssessment>;
      if (!skill.treeId || !skill.stepId || !skill.recordedAt) return null;
      if (typeof skill.passed !== 'boolean' || typeof skill.clean !== 'boolean' || typeof skill.pain !== 'boolean') return null;
    }
    return raw as SkillAssessment[];
  } catch {
    return null;
  }
}

function validateStoredScheduleEvents(raw: unknown): ScheduleEvent[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const event = item as Partial<ScheduleEvent>;
      if (!event.type || !event.from || !event.to || !event.recordedAt || !event.reason) return null;
    }
    return raw as ScheduleEvent[];
  } catch {
    return null;
  }
}

type FinalizationJournal = {
  version: 1;
  workoutId: string;
  history: HistoryEntry[];
  activity: ActivityDose[] | null;
};

function finalizationJournal(value: unknown): FinalizationJournal | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FinalizationJournal>;
  if (candidate.version !== 1 || typeof candidate.workoutId !== 'string' || !candidate.workoutId || !Array.isArray(candidate.history)) return null;
  if (candidate.activity !== null && !Array.isArray(candidate.activity)) return null;
  return {
    version: 1,
    workoutId: candidate.workoutId,
    history: deduplicateHistory(candidate.history as HistoryEntry[]),
    activity: candidate.activity === null ? null : deduplicateWorkoutActivity(candidate.activity as ActivityDose[]),
  };
}

function loadFinalizationJournal() {
  const raw = read<unknown>(FINALIZATION_JOURNAL, null);
  if (raw === null) return null;
  const journal = finalizationJournal(raw);
  if (!journal) mutationFailure = 'A pending workout finalization record is invalid. The active workout was preserved instead of guessing.';
  return journal;
}

function commitFinalizationJournal(journal: FinalizationJournal) {
  if (!journal.activity) {
    mutationFailure = 'Workout finalization is pending its derived activity data. The active workout remains available for retry.';
    return false;
  }
  if (!write(HISTORY, journal.history)) return false;
  if (!write(ACTIVITY, journal.activity)) return false;
  if (!remove(FINALIZATION_JOURNAL)) return false;
  return true;
}

function validateStoredReadiness(raw: unknown): ReadinessRecord[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const record = item as Partial<ReadinessRecord>;
      if (!record.recordedAt || !record.input || typeof record.input !== 'object') return null;
    }
    return (raw as ReadinessRecord[]).filter(record => record.source !== 'connected-sleep');
  } catch {
    return null;
  }
}

function storedReadiness(): ReadinessRecord[] {
  const value = read<unknown>(READINESS, []);
  return validateStoredValue(
    value,
    validateStoredReadiness,
    'readiness data',
    'Saved readiness data is corrupt.'
  );
}

function effectiveReadiness(): ReadinessRecord[] {
  const manual = storedReadiness();
  const connected = loadConnectedSleepContext();
  if (!connected) return manual;
  const latest = manual.at(-1);
  const manualTime = latest ? Date.parse(latest.recordedAt) : Number.NaN;
  const manualFresh = Number.isFinite(manualTime) && Date.now() - manualTime >= -5 * 60_000 && Date.now() - manualTime <= 24 * 3_600_000;
  const manualHasSleep = manualFresh && (latest?.input.sleep !== undefined || typeof latest?.input.sleepHours === 'number');
  if (manualHasSleep) return manual;
  const manualInput = manualFresh ? latest?.input || {} : {};
  const recordedAt = manualFresh && manualTime > Date.parse(connected.observedAt) ? latest!.recordedAt : connected.observedAt;
  return [...manual, { recordedAt, input: { ...connected.input, ...manualInput }, source: 'connected-sleep', sourceName: connected.sourceName }];
}

export type HumanHealthExport = {
  schemaVersion: 2;
  exportedAt: string;
  activeWorkout: Workout | null;
  restTimer: RestTimerState | null;
  history: HistoryEntry[];
  activity: ActivityDose[];
  readiness: ReadinessRecord[];
  skills: Record<string, string>;
  assessments: Assessment[];
  progressions: Record<string, string>;
  skillAssessments: SkillAssessment[];
  preferences: UserPreferences;
  scheduleEvents: ScheduleEvent[];
  fuelChecks?: FuelCheck[];
  softHabitCompletions?: SoftHabitCompletion[];
  mindChecks?: MindCheck[];
  weeklyReflections?: WeeklyReflection[];
};

export function validateTrainingExport(value: unknown, now = new Date()): HumanHealthExport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Training archive is not an object.');
  const candidate = value as Partial<HumanHealthExport>;
  if (candidate.schemaVersion !== 2) throw new Error('Unsupported training archive version.');
  return {
    schemaVersion: 2,
    exportedAt: validateExportedAt(candidate.exportedAt, now),
    activeWorkout: validateActiveWorkout(candidate.activeWorkout, now),
    restTimer: validateRestTimer(candidate.restTimer, now),
    history: deduplicateHistory(validateHistory(candidate.history, now)),
    activity: deduplicateWorkoutActivity(validateActivity(candidate.activity, now)),
    readiness: validateReadiness(candidate.readiness, now),
    skills: validateStringRecord(candidate.skills, 'skills'),
    assessments: validateAssessments(candidate.assessments, now),
    progressions: validateStringRecord(candidate.progressions, 'progressions'),
    skillAssessments: validateSkillAssessments(candidate.skillAssessments, now),
    preferences: validatePreferences(candidate.preferences),
    scheduleEvents: validateScheduleEvents(candidate.scheduleEvents, now),
    fuelChecks: Array.isArray(candidate.fuelChecks) ? candidate.fuelChecks : undefined,
    softHabitCompletions: Array.isArray(candidate.softHabitCompletions) ? candidate.softHabitCompletions : undefined,
  };
}

function mergeUnique<T>(current: T[], incoming: T[], key: (value: T) => string) {
  const values = new Map<string, T>();
  incoming.forEach(value => values.set(key(value), value));
  current.forEach(value => values.set(key(value), value));
  return [...values.values()];
}

type RawStorageSnapshot = Map<string, string | null>;

function captureRawStorage(keys: string[]): RawStorageSnapshot {
  if (typeof window === 'undefined') throw new Error('Browser storage is unavailable.');
  const snapshot = new Map<string, string | null>();
  try {
    for (const key of keys) snapshot.set(key, localStorage.getItem(key));
  } catch {
    mutationFailure = 'The browser would not allow a safe pre-import storage snapshot.';
    throw new Error(mutationFailure);
  }
  return snapshot;
}

function applyRawStorage(values: Map<string, string | null>) {
  for (const [key, value] of values) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      mutationFailure = `Browser storage rejected the archive mutation for ${key}.`;
      return false;
    }
  }
  mutationFailure = null;
  return true;
}

function restoreRawStorage(snapshot: RawStorageSnapshot) {
  let firstFailure: string | null = null;
  for (const [key, value] of snapshot) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      firstFailure ||= `Rollback could not restore ${key}.`;
    }
  }
  if (firstFailure) {
    mutationFailure = firstFailure;
    return false;
  }
  mutationFailure = null;
  return true;
}

function serializedTrainingSnapshot(next: HumanHealthExport, mode: 'merge' | 'replace') {
  const values = new Map<string, string | null>();
  const serialized = (value: unknown) => JSON.stringify(value);
  values.set(ACTIVE, next.activeWorkout ? serialized(next.activeWorkout) : null);
  values.set(HISTORY, serialized(deduplicateHistory(next.history)));
  values.set(ACTIVITY, serialized(deduplicateWorkoutActivity(next.activity)));
  values.set(READINESS, serialized(next.readiness.filter(record => record.source !== 'connected-sleep').slice(-90)));
  values.set(SKILLS, serialized(next.skills));
  values.set(ASSESSMENTS, serialized(next.assessments));
  values.set(PROGRESSIONS, serialized(next.progressions));
  values.set(SKILL_ASSESSMENTS, serialized(next.skillAssessments));
  values.set(REST_TIMER, next.activeWorkout && next.restTimer ? serialized(next.restTimer) : null);
  values.set(LEGACY_REST_UNTIL, null);
  values.set(PREFERENCES, serialized(normalizePreferences(next.preferences || defaultPreferences)));
  values.set(SCHEDULE_EVENTS, serialized(next.scheduleEvents.slice(-100)));
  values.set(FUEL_CHECKS, serialized((next.fuelChecks || []).slice(-90)));
  values.set(SOFT_HABIT_COMPLETIONS, serialized((next.softHabitCompletions || []).slice(-180)));
  values.set(FINALIZATION_JOURNAL, null);
  if (mode === 'replace') values.set(CONNECTED_SLEEP_CONTEXT_KEY, null);
  return values;
}

export const store = {
  canPersist,
  getMutationError() { return mutationFailure; },
  clearMutationError() { mutationFailure = null; },

  loadActive(): Workout | null {
    const active = activeWorkout(read<unknown>(ACTIVE, null));
    const journal = loadFinalizationJournal();
    if (journal) {
      if (active && journal.workoutId !== active.id) {
        mutationFailure = 'A pending workout finalization belongs to a different workout. The current active workout was preserved for manual recovery.';
        return active;
      }
      if (!journal.activity) return active;
      if (!commitFinalizationJournal(journal)) return active;
      runMutations([() => remove(ACTIVE), () => remove(REST_TIMER), () => remove(LEGACY_REST_UNTIL)], 'Finalized workout state could not be fully cleaned up.');
      return null;
    }

    const historyValue = read<unknown>(HISTORY, []);
    const history = Array.isArray(historyValue) ? deduplicateHistory(historyValue as HistoryEntry[]) : [];
    if (activeWorkoutWasFinalized(active, history)) {
      runMutations([() => remove(ACTIVE), () => remove(REST_TIMER), () => remove(LEGACY_REST_UNTIL)], 'Finalized workout state could not be fully cleaned up.');
      return null;
    }
    return active;
  },
  saveActive(value: Workout | null) { return value ? write(ACTIVE, value) : remove(ACTIVE); },

  loadRestTimer(): RestTimerState | null {
    const current = sanitizeRestTimer(read<unknown>(REST_TIMER, null));
    if (current) return current;
    const legacyEndsAt = read<number | null>(LEGACY_REST_UNTIL, null);
    if (legacyEndsAt && legacyEndsAt > Date.now()) {
      const migrated = startRestTimer((legacyEndsAt - Date.now()) / 1000);
      write(REST_TIMER, migrated);
      remove(LEGACY_REST_UNTIL);
      return migrated;
    }
    runMutations([() => remove(REST_TIMER), () => remove(LEGACY_REST_UNTIL)], 'Expired rest timer data could not be fully cleaned up.');
    return null;
  },
  saveRestTimer(value: RestTimerState | null) {
    if (value) return write(REST_TIMER, value);
    return runMutations([() => remove(REST_TIMER), () => remove(LEGACY_REST_UNTIL)], 'Rest timer data could not be fully deleted.');
  },
  loadRestUntil(): number | null { const timer = store.loadRestTimer(); return timer?.status === 'running' ? timer.endsAt : null; },
  saveRestUntil(value: number | null) { return store.saveRestTimer(value ? { status: 'running', endsAt: value, durationMs: Math.max(1, value - Date.now()) } : null); },

  loadHistory(): HistoryEntry[] {
    const value = read<unknown>(HISTORY, []);
    return validateStoredValue(
      value,
      validateStoredHistory,
      'workout history',
      'Saved workout history is corrupt.'
    );
  },
  saveHistory(value: HistoryEntry[]) {
    const next = deduplicateHistory(value);
    const active = activeWorkout(read<unknown>(ACTIVE, null));
    if (active && activeWorkoutWasFinalized(active, next)) {
      const currentJournal = loadFinalizationJournal();
      const journal: FinalizationJournal = {
        version: 1,
        workoutId: active.id,
        history: next,
        activity: currentJournal?.workoutId === active.id ? currentJournal.activity : null,
      };
      return write(FINALIZATION_JOURNAL, journal);
    }
    return write(HISTORY, next);
  },
  loadActivity(): ActivityDose[] {
    const value = read<unknown>(ACTIVITY, []);
    return validateStoredValue(
      value,
      validateStoredActivity,
      'activity data',
      'Saved activity data is corrupt.'
    );
  },
  saveActivity(value: ActivityDose[]) {
    const next = deduplicateWorkoutActivity(value);
    const journal = loadFinalizationJournal();
    if (!journal) return write(ACTIVITY, next);
    const complete: FinalizationJournal = { ...journal, activity: next };
    if (!write(FINALIZATION_JOURNAL, complete)) return false;
    return commitFinalizationJournal(complete);
  },
  loadReadiness(): ReadinessRecord[] { return effectiveReadiness(); },
  saveReadiness(value: ReadinessRecord[]) { return write(READINESS, value.filter(record => record.source !== 'connected-sleep').slice(-90)); },
  loadSkills(): Record<string, string> { return read<Record<string, string>>(SKILLS, {}); },
  saveSkills(value: Record<string, string>) { return write(SKILLS, value); },
  loadAssessments(): Assessment[] {
    const value = read<unknown>(ASSESSMENTS, []);
    return validateStoredValue(
      value,
      validateStoredAssessments,
      'capability assessments',
      'Saved capability assessments are corrupt.'
    );
  },
  saveAssessments(value: Assessment[]) { return write(ASSESSMENTS, value); },
  loadProgressions(): Record<string, string> { return read<Record<string, string>>(PROGRESSIONS, {}); },
  saveProgressions(value: Record<string, string>) { return write(PROGRESSIONS, value); },
  loadSkillAssessments(): SkillAssessment[] {
    const value = read<unknown>(SKILL_ASSESSMENTS, []);
    return validateStoredValue(
      value,
      validateStoredSkillAssessments,
      'skill assessments',
      'Saved skill assessments are corrupt.'
    );
  },
  saveSkillAssessments(value: SkillAssessment[]) { return write(SKILL_ASSESSMENTS, value); },
  loadPreferences(): UserPreferences { return normalizePreferences(read<Partial<UserPreferences>>(PREFERENCES, defaultPreferences)); },
  savePreferences(value: UserPreferences) { return write(PREFERENCES, normalizePreferences(value)); },
  loadScheduleEvents(): ScheduleEvent[] {
    const value = read<unknown>(SCHEDULE_EVENTS, []);
    return validateStoredValue(
      value,
      validateStoredScheduleEvents,
      'schedule events',
      'Saved schedule events are corrupt.'
    );
  },
  saveScheduleEvents(value: ScheduleEvent[]) { return write(SCHEDULE_EVENTS, value.slice(-100)); },
  
  loadFuelChecks(): FuelCheck[] {
    const value = read<unknown>(FUEL_CHECKS, []);
    if (!Array.isArray(value)) {
      throw new Error('Saved fuel checks are corrupt. Export your data if possible, then delete corrupt local training state before continuing.');
    }
    return value as FuelCheck[];
  },
  saveFuelChecks(value: FuelCheck[]) { return write(FUEL_CHECKS, value.slice(-90)); },
  
  loadSoftHabitCompletions(): SoftHabitCompletion[] {
    const value = read<unknown>(SOFT_HABIT_COMPLETIONS, []);
    if (!Array.isArray(value)) {
      throw new Error('Saved habit completions are corrupt. Export your data if possible, then delete corrupt local training state before continuing.');
    }
    return value as SoftHabitCompletion[];
  },
  saveSoftHabitCompletions(value: SoftHabitCompletion[]) { return write(SOFT_HABIT_COMPLETIONS, value.slice(-180)); },

  loadMindChecks(): MindCheck[] {
    const value = read<unknown>(MIND_CHECKS, []);
    if (!Array.isArray(value)) {
      throw new Error('Saved mind checks are corrupt. Export your data if possible, then delete corrupt local training state before continuing.');
    }
    return value as MindCheck[];
  },
  saveMindChecks(value: MindCheck[]) { return write(MIND_CHECKS, value.slice(-180)); },

  loadWeeklyReflections(): WeeklyReflection[] {
    const value = read<unknown>(WEEKLY_REFLECTIONS, []);
    if (!Array.isArray(value)) {
      throw new Error('Saved weekly reflections are corrupt. Export your data if possible, then delete corrupt local training state before continuing.');
    }
    return value as WeeklyReflection[];
  },
  saveWeeklyReflections(value: WeeklyReflection[]) { return write(WEEKLY_REFLECTIONS, value.slice(-52)); },

  exportData(): HumanHealthExport {
    const rawHistory = read<unknown>(HISTORY, []);
    const rawActivity = read<unknown>(ACTIVITY, []);
    const rawReadiness = read<unknown>(READINESS, []);
    const rawAssessments = read<unknown>(ASSESSMENTS, []);
    const rawSkillAssessments = read<unknown>(SKILL_ASSESSMENTS, []);
    const rawScheduleEvents = read<unknown>(SCHEDULE_EVENTS, []);
    const rawFuelChecks = read<unknown>(FUEL_CHECKS, []);
    const rawSoftHabits = read<unknown>(SOFT_HABIT_COMPLETIONS, []);
    const rawMindChecks = read<unknown>(MIND_CHECKS, []);
    const rawReflections = read<unknown>(WEEKLY_REFLECTIONS, []);

    const safeReadiness = Array.isArray(rawReadiness)
      ? (rawReadiness as ReadinessRecord[]).filter(record => record && record.source !== 'connected-sleep' && typeof record.recordedAt === 'string' && record.input && typeof record.input === 'object')
      : [];

    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      activeWorkout: store.loadActive(),
      restTimer: store.loadRestTimer(),
      history: Array.isArray(rawHistory) ? deduplicateHistory(rawHistory as HistoryEntry[]) : [],
      activity: Array.isArray(rawActivity) ? deduplicateWorkoutActivity(rawActivity as ActivityDose[]) : [],
      readiness: safeReadiness,
      skills: store.loadSkills(),
      assessments: Array.isArray(rawAssessments) ? rawAssessments as Assessment[] : [],
      progressions: store.loadProgressions(),
      skillAssessments: Array.isArray(rawSkillAssessments) ? rawSkillAssessments as SkillAssessment[] : [],
      preferences: store.loadPreferences(),
      scheduleEvents: Array.isArray(rawScheduleEvents) ? rawScheduleEvents as ScheduleEvent[] : [],
      fuelChecks: Array.isArray(rawFuelChecks) ? rawFuelChecks as FuelCheck[] : [],
      softHabitCompletions: Array.isArray(rawSoftHabits) ? rawSoftHabits as SoftHabitCompletion[] : [],
      mindChecks: Array.isArray(rawMindChecks) ? rawMindChecks as MindCheck[] : [],
      weeklyReflections: Array.isArray(rawReflections) ? rawReflections as WeeklyReflection[] : [],
    };
  },

  importData(value: unknown, mode: 'merge' | 'replace' = 'merge') {
    const now = new Date();
    const incoming = validateTrainingExport(value, now);
    const current = store.exportData();
    const pendingFinalization = loadFinalizationJournal();
    if (pendingFinalization) throw new Error('A workout finalization is still pending. Resolve or recover it before importing an archive.');
    const next: HumanHealthExport = mode === 'replace' ? incoming : {
      ...current,
      activeWorkout: current.activeWorkout || incoming.activeWorkout,
      restTimer: current.activeWorkout ? current.restTimer : incoming.restTimer,
      history: deduplicateHistory(mergeUnique(current.history, incoming.history, item => `${item.completedAt}|${item.session}|${item.status || 'completed'}`)),
      activity: deduplicateWorkoutActivity(mergeUnique(current.activity, incoming.activity, item => `${item.completedAt}|${item.domain}|${item.sessionId || ''}|${item.minutes || ''}|${item.sets || ''}|${item.source || ''}`)),
      readiness: mergeUnique(current.readiness, incoming.readiness, item => `${item.recordedAt}|${item.source || 'manual'}`),
      skills: { ...incoming.skills, ...current.skills },
      assessments: mergeUnique(current.assessments, incoming.assessments, item => `${item.metricId}|${item.recordedAt}`),
      progressions: { ...incoming.progressions, ...current.progressions },
      skillAssessments: mergeUnique(current.skillAssessments, incoming.skillAssessments, item => `${item.treeId}|${item.stepId}|${item.recordedAt}`),
      preferences: current.preferences,
      scheduleEvents: mergeUnique(current.scheduleEvents, incoming.scheduleEvents, item => `${item.recordedAt}|${item.type}|${item.from}|${item.to}`),
      fuelChecks: mergeUnique(current.fuelChecks || [], incoming.fuelChecks || [], item => `${item.recordedAt}|${item.type}`),
      softHabitCompletions: mergeUnique(current.softHabitCompletions || [], incoming.softHabitCompletions || [], item => `${item.habitId}|${item.completedAt}`),
      mindChecks: mergeUnique(current.mindChecks || [], incoming.mindChecks || [], item => `${item.recordedAt}|${item.level}`),
      weeklyReflections: mergeUnique(current.weeklyReflections || [], incoming.weeklyReflections || [], item => `${item.recordedAt}|${item.prompt}`),
      exportedAt: now.toISOString(),
    };

    const mutations = serializedTrainingSnapshot(next, mode);
    const snapshot = captureRawStorage([...mutations.keys()]);
    if (applyRawStorage(mutations)) return next;

    const originalFailure = mutationFailure || 'The browser could not persist the complete training archive.';
    if (!restoreRawStorage(snapshot)) {
      const rollbackFailure = mutationFailure || 'Automatic rollback failed.';
      throw new Error(`${originalFailure} Automatic rollback also failed: ${rollbackFailure}`);
    }
    mutationFailure = originalFailure;
    throw new Error(`${originalFailure} The pre-import local state was restored.`);
  },

  clearAll() {
    const keys = [ACTIVE, HISTORY, ACTIVITY, READINESS, SKILLS, ASSESSMENTS, PROGRESSIONS, SKILL_ASSESSMENTS, REST_TIMER, LEGACY_REST_UNTIL, PREFERENCES, SCHEDULE_EVENTS, CONNECTED_SLEEP_CONTEXT_KEY, FINALIZATION_JOURNAL, FUEL_CHECKS, SOFT_HABIT_COMPLETIONS];
    return runMutations(keys.map(key => () => remove(key)), 'Local Human Health data could not be fully deleted.');
  },
};