import { CONNECTED_SLEEP_CONTEXT_KEY, loadConnectedSleepContext } from './connected-health/connected-readiness';
import { HistoryEntry, Workout } from './domain';
import { SkillAssessment } from './performance';
import { defaultPreferences, normalizePreferences, UserPreferences } from './preferences';
import { RestTimerState, startRestTimer } from './rest-timer';
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
const TRAINING_STORAGE_KEYS = [
  ACTIVE, HISTORY, ACTIVITY, READINESS, SKILLS, ASSESSMENTS, PROGRESSIONS,
  SKILL_ASSESSMENTS, REST_TIMER, LEGACY_REST_UNTIL, PREFERENCES,
  SCHEDULE_EVENTS, CONNECTED_SLEEP_CONTEXT_KEY, FINALIZATION_JOURNAL,
];

let mutationFailure: string | null = null;
const integrityFailures = new Map<string, string>();

function integrityError() {
  return integrityFailures.values().next().value as string | undefined;
}

function setIntegrityFailure(key: string, message: string) {
  integrityFailures.set(key, message);
  mutationFailure = message;
  return message;
}

function markIntegrityFailure(key: string, label: string, error?: unknown) {
  const detail = error instanceof Error ? ` ${error.message}` : '';
  return setIntegrityFailure(key, `${label} is corrupt or unsupported and was not trusted.${detail}`);
}

function clearIntegrityFailure(key: string) {
  integrityFailures.delete(key);
}

function readRaw<T>(key: string, fallback: T): { value: T | unknown; validJson: boolean } {
  if (typeof window === 'undefined') return { value: fallback, validJson: true };
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    setIntegrityFailure(key, `Saved ${key.replace(PREFIX, '')} data could not be read from browser storage.${detail}`);
    return { value: fallback, validJson: false };
  }
  if (raw === null) {
    clearIntegrityFailure(key);
    return { value: fallback, validJson: true };
  }
  try {
    return { value: JSON.parse(raw) as unknown, validJson: true };
  } catch (error) {
    markIntegrityFailure(key, `Saved ${key.replace(PREFIX, '')} data`, error);
    return { value: fallback, validJson: false };
  }
}

function readValidated<T>(key: string, fallback: T, label: string, validator: (value: unknown) => T): T {
  const raw = readRaw(key, fallback);
  if (!raw.validJson) return fallback;
  try {
    const value = validator(raw.value);
    clearIntegrityFailure(key);
    return value;
  } catch (error) {
    markIntegrityFailure(key, label, error);
    return fallback;
  }
}

function normalMutationBlocked() {
  const integrity = integrityError();
  if (!integrity) return false;
  mutationFailure = `Persisted training data has an unresolved integrity error. Normal writes are blocked until a validated replace import or Delete all explicitly repairs/removes the affected data. ${integrity}`;
  return true;
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined' || normalMutationBlocked()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    clearIntegrityFailure(key);
    mutationFailure = null;
    return true;
  } catch {
    mutationFailure = 'Browser storage rejected the latest save. Keep this page open and export data before continuing.';
    return false;
  }
}

function remove(key: string) {
  if (typeof window === 'undefined' || normalMutationBlocked()) return false;
  try {
    localStorage.removeItem(key);
    clearIntegrityFailure(key);
    mutationFailure = null;
    return true;
  } catch {
    mutationFailure = 'Browser storage rejected a local deletion.';
    return false;
  }
}

function forceRemove(key: string) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    clearIntegrityFailure(key);
    mutationFailure = null;
    return true;
  } catch {
    mutationFailure = 'Browser storage rejected a local deletion.';
    return false;
  }
}

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

type FinalizationJournal = {
  version: 1;
  workoutId: string;
  history: HistoryEntry[];
  activity: ActivityDose[] | null;
};

function finalizationJournal(value: unknown, now = new Date()): FinalizationJournal | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FinalizationJournal>;
  if (candidate.version !== 1 || typeof candidate.workoutId !== 'string' || !candidate.workoutId || !Array.isArray(candidate.history)) return null;
  if (candidate.activity !== null && !Array.isArray(candidate.activity)) return null;
  try {
    return {
      version: 1,
      workoutId: candidate.workoutId,
      history: deduplicateHistory(validateHistory(candidate.history, now)),
      activity: candidate.activity === null ? null : deduplicateWorkoutActivity(validateActivity(candidate.activity, now)),
    };
  } catch {
    return null;
  }
}

function loadFinalizationJournal() {
  const raw = readRaw<null>(FINALIZATION_JOURNAL, null);
  if (!raw.validJson || raw.value === null) return null;
  const journal = finalizationJournal(raw.value);
  if (!journal) markIntegrityFailure(FINALIZATION_JOURNAL, 'Pending workout finalization data');
  else clearIntegrityFailure(FINALIZATION_JOURNAL);
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

function storedReadiness(): ReadinessRecord[] {
  return readValidated(READINESS, [], 'Saved readiness data', value => {
    if (!Array.isArray(value)) throw new Error('Readiness must be an array.');
    const manual = value.filter(record => !(record && typeof record === 'object' && (record as { source?: unknown }).source === 'connected-sleep'));
    return validateReadiness(manual, new Date());
  });
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
};

export type TrainingRecoverySnapshot = {
  values: [string, string | null][];
  integrity: [string, string][];
  mutationFailure: string | null;
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
  values.set(FINALIZATION_JOURNAL, null);
  if (mode === 'replace') values.set(CONNECTED_SLEEP_CONTEXT_KEY, null);
  return values;
}

export const store = {
  canPersist,
  getMutationError() { return mutationFailure || integrityError() || null; },
  getIntegrityErrors() { return [...integrityFailures.values()]; },
  clearMutationError() { mutationFailure = null; },

  captureRecoverySnapshot(): TrainingRecoverySnapshot {
    return {
      values: [...captureRawStorage(TRAINING_STORAGE_KEYS)],
      integrity: [...integrityFailures],
      mutationFailure,
    };
  },

  restoreRecoverySnapshot(snapshot: TrainingRecoverySnapshot) {
    if (!restoreRawStorage(new Map(snapshot.values))) return false;
    integrityFailures.clear();
    snapshot.integrity.forEach(([key, value]) => integrityFailures.set(key, value));
    mutationFailure = snapshot.mutationFailure;
    return true;
  },

  loadActive(): Workout | null {
    const now = new Date();
    const active = readValidated<Workout | null>(ACTIVE, null, 'Saved active workout', value => validateActiveWorkout(value, now));
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

    const history = readValidated(HISTORY, [], 'Saved workout history', value => deduplicateHistory(validateHistory(value, now)));
    if (activeWorkoutWasFinalized(active, history)) {
      runMutations([() => remove(ACTIVE), () => remove(REST_TIMER), () => remove(LEGACY_REST_UNTIL)], 'Finalized workout state could not be fully cleaned up.');
      return null;
    }
    return active;
  },
  saveActive(value: Workout | null) { return value ? write(ACTIVE, value) : remove(ACTIVE); },

  loadRestTimer(): RestTimerState | null {
    const now = new Date();
    const current = readValidated<RestTimerState | null>(REST_TIMER, null, 'Saved rest timer', value => validateRestTimer(value, now));
    if (current) return current;
    if (integrityFailures.has(REST_TIMER)) return null;
    const legacyEndsAt = readValidated<number | null>(LEGACY_REST_UNTIL, null, 'Saved legacy rest timer', value => {
      if (value === null) return null;
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Legacy timer end must be finite.');
      return value;
    });
    if (legacyEndsAt && legacyEndsAt > Date.now()) {
      const migrated = startRestTimer((legacyEndsAt - Date.now()) / 1000);
      write(REST_TIMER, migrated);
      remove(LEGACY_REST_UNTIL);
      return migrated;
    }
    if (integrityFailures.has(LEGACY_REST_UNTIL)) return null;
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
    return readValidated(HISTORY, [], 'Saved workout history', value => deduplicateHistory(validateHistory(value, new Date())));
  },
  saveHistory(value: HistoryEntry[]) {
    const next = deduplicateHistory(value);
    const active = readValidated<Workout | null>(ACTIVE, null, 'Saved active workout', current => validateActiveWorkout(current, new Date()));
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
    return readValidated(ACTIVITY, [], 'Saved activity data', value => deduplicateWorkoutActivity(validateActivity(value, new Date())));
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
  loadSkills(): Record<string, string> { return readValidated(SKILLS, {}, 'Saved skill state', value => validateStringRecord(value, 'skills')); },
  saveSkills(value: Record<string, string>) { return write(SKILLS, value); },
  loadAssessments(): Assessment[] { return readValidated(ASSESSMENTS, [], 'Saved capability assessments', value => validateAssessments(value, new Date())); },
  saveAssessments(value: Assessment[]) { return write(ASSESSMENTS, value); },
  loadProgressions(): Record<string, string> { return readValidated(PROGRESSIONS, {}, 'Saved progression state', value => validateStringRecord(value, 'progressions')); },
  saveProgressions(value: Record<string, string>) { return write(PROGRESSIONS, value); },
  loadSkillAssessments(): SkillAssessment[] { return readValidated(SKILL_ASSESSMENTS, [], 'Saved skill assessments', value => validateSkillAssessments(value, new Date())); },
  saveSkillAssessments(value: SkillAssessment[]) { return write(SKILL_ASSESSMENTS, value); },
  loadPreferences(): UserPreferences { return readValidated(PREFERENCES, defaultPreferences, 'Saved training preferences', validatePreferences); },
  savePreferences(value: UserPreferences) { return write(PREFERENCES, normalizePreferences(value)); },
  loadScheduleEvents(): ScheduleEvent[] { return readValidated(SCHEDULE_EVENTS, [], 'Saved schedule events', value => validateScheduleEvents(value, new Date())); },
  saveScheduleEvents(value: ScheduleEvent[]) { return write(SCHEDULE_EVENTS, value.slice(-100)); },

  exportData(): HumanHealthExport {
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      activeWorkout: store.loadActive(),
      restTimer: store.loadRestTimer(),
      history: store.loadHistory(),
      activity: store.loadActivity(),
      readiness: storedReadiness(),
      skills: store.loadSkills(),
      assessments: store.loadAssessments(),
      progressions: store.loadProgressions(),
      skillAssessments: store.loadSkillAssessments(),
      preferences: store.loadPreferences(),
      scheduleEvents: store.loadScheduleEvents(),
    };
  },

  exportCompleteData(): HumanHealthExport {
    const snapshot = store.exportData();
    const integrity = store.getIntegrityErrors();
    if (integrity.length) throw new Error(`Complete training export refused because persisted training data is corrupt or unreadable: ${integrity.join(' | ')}`);
    const pendingFinalization = loadFinalizationJournal();
    if (pendingFinalization) throw new Error('Complete training export refused while workout finalization is still pending. Resolve or recover the active workout first.');
    return snapshot;
  },

  importData(value: unknown, mode: 'merge' | 'replace' = 'merge') {
    const now = new Date();
    const incoming = validateTrainingExport(value, now);
    const pendingFinalization = loadFinalizationJournal();
    if (pendingFinalization && mode === 'merge') throw new Error('A workout finalization is still pending. Resolve or recover it before merging an archive.');
    const current = mode === 'merge' ? store.exportCompleteData() : null;
    const next: HumanHealthExport = mode === 'replace' ? incoming : {
      ...current!,
      activeWorkout: current!.activeWorkout || incoming.activeWorkout,
      restTimer: current!.activeWorkout ? current!.restTimer : incoming.restTimer,
      history: deduplicateHistory(mergeUnique(current!.history, incoming.history, item => `${item.completedAt}|${item.session}|${item.status || 'completed'}`)),
      activity: deduplicateWorkoutActivity(mergeUnique(current!.activity, incoming.activity, item => `${item.completedAt}|${item.domain}|${item.sessionId || ''}|${item.minutes || ''}|${item.sets || ''}|${item.source || ''}`)),
      readiness: mergeUnique(current!.readiness, incoming.readiness, item => `${item.recordedAt}|${item.source || 'manual'}`),
      skills: { ...incoming.skills, ...current!.skills },
      assessments: mergeUnique(current!.assessments, incoming.assessments, item => `${item.metricId}|${item.recordedAt}`),
      progressions: { ...incoming.progressions, ...current!.progressions },
      skillAssessments: mergeUnique(current!.skillAssessments, incoming.skillAssessments, item => `${item.treeId}|${item.stepId}|${item.recordedAt}`),
      preferences: current!.preferences,
      scheduleEvents: mergeUnique(current!.scheduleEvents, incoming.scheduleEvents, item => `${item.recordedAt}|${item.type}|${item.from}|${item.to}`),
      exportedAt: now.toISOString(),
    };

    const mutations = serializedTrainingSnapshot(next, mode);
    const snapshot = captureRawStorage([...mutations.keys()]);
    if (applyRawStorage(mutations)) {
      for (const key of mutations.keys()) clearIntegrityFailure(key);
      return next;
    }

    const originalFailure = mutationFailure || 'The browser could not persist the complete training archive.';
    if (!restoreRawStorage(snapshot)) {
      const rollbackFailure = mutationFailure || 'Automatic rollback failed.';
      throw new Error(`${originalFailure} Automatic rollback also failed: ${rollbackFailure}`);
    }
    mutationFailure = originalFailure;
    throw new Error(`${originalFailure} The pre-import local state was restored.`);
  },

  clearAll() {
    return runMutations(TRAINING_STORAGE_KEYS.map(key => () => forceRemove(key)), 'Local Human Health data could not be fully deleted.');
  },
};
