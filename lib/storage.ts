import { CONNECTED_SLEEP_CONTEXT_KEY, loadConnectedSleepContext } from './connected-health/connected-readiness';
import { HistoryEntry, Workout } from './domain';
import { SkillAssessment } from './performance';
import { defaultPreferences, normalizePreferences, UserPreferences } from './preferences';
import { RestTimerState, sanitizeRestTimer, startRestTimer } from './rest-timer';
import { ScheduleEvent } from './schedule';
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
const STORAGE_PROBE = `${PREFIX}storage-probe`;

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

function storedReadiness(): ReadinessRecord[] {
  const value = read<unknown>(READINESS, []);
  if (!Array.isArray(value)) {
    mutationFailure = 'Saved readiness data was invalid and was ignored.';
    return [];
  }
  return (value as ReadinessRecord[]).filter(record => record && record.source !== 'connected-sleep' && typeof record.recordedAt === 'string' && record.input && typeof record.input === 'object');
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

export function validateTrainingExport(value: unknown): HumanHealthExport {
  if (!value || typeof value !== 'object') throw new Error('Training archive is not an object.');
  const candidate = value as Partial<HumanHealthExport>;
  if (candidate.schemaVersion !== 2) throw new Error('Unsupported training archive version.');
  const arrays: (keyof HumanHealthExport)[] = ['history', 'activity', 'readiness', 'assessments', 'skillAssessments', 'scheduleEvents'];
  for (const key of arrays) if (!Array.isArray(candidate[key])) throw new Error(`Training archive field ${String(key)} is invalid.`);
  if (!candidate.skills || typeof candidate.skills !== 'object' || Array.isArray(candidate.skills)) throw new Error('Training skills are invalid.');
  if (!candidate.progressions || typeof candidate.progressions !== 'object' || Array.isArray(candidate.progressions)) throw new Error('Training progressions are invalid.');
  const active = candidate.activeWorkout === null ? null : activeWorkout(candidate.activeWorkout);
  if (candidate.activeWorkout && !active) throw new Error('Imported active workout is invalid.');
  return {
    schemaVersion: 2,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
    activeWorkout: active,
    restTimer: sanitizeRestTimer(candidate.restTimer) || null,
    history: deduplicateHistory(candidate.history as HistoryEntry[]),
    activity: deduplicateWorkoutActivity(candidate.activity as ActivityDose[]),
    readiness: (candidate.readiness as ReadinessRecord[]).filter(record => record?.source !== 'connected-sleep'),
    skills: candidate.skills as Record<string, string>,
    assessments: candidate.assessments as Assessment[],
    progressions: candidate.progressions as Record<string, string>,
    skillAssessments: candidate.skillAssessments as SkillAssessment[],
    preferences: normalizePreferences(candidate.preferences || defaultPreferences),
    scheduleEvents: candidate.scheduleEvents as ScheduleEvent[],
  };
}

function mergeUnique<T>(current: T[], incoming: T[], key: (value: T) => string) {
  const values = new Map<string, T>();
  incoming.forEach(value => values.set(key(value), value));
  current.forEach(value => values.set(key(value), value));
  return [...values.values()];
}

export const store = {
  canPersist,
  getMutationError() { return mutationFailure; },
  clearMutationError() { mutationFailure = null; },

  loadActive(): Workout | null {
    const active = activeWorkout(read<unknown>(ACTIVE, null));
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
    if (!Array.isArray(value)) { mutationFailure = 'Saved workout history was invalid and was ignored.'; return []; }
    return deduplicateHistory(value as HistoryEntry[]);
  },
  saveHistory(value: HistoryEntry[]) { return write(HISTORY, deduplicateHistory(value)); },
  loadActivity(): ActivityDose[] {
    const value = read<unknown>(ACTIVITY, []);
    if (!Array.isArray(value)) { mutationFailure = 'Saved activity data was invalid and was ignored.'; return []; }
    return deduplicateWorkoutActivity(value as ActivityDose[]);
  },
  saveActivity(value: ActivityDose[]) { return write(ACTIVITY, deduplicateWorkoutActivity(value)); },
  loadReadiness(): ReadinessRecord[] { return effectiveReadiness(); },
  saveReadiness(value: ReadinessRecord[]) { return write(READINESS, value.filter(record => record.source !== 'connected-sleep').slice(-90)); },
  loadSkills(): Record<string, string> { return read<Record<string, string>>(SKILLS, {}); },
  saveSkills(value: Record<string, string>) { return write(SKILLS, value); },
  loadAssessments(): Assessment[] { const value = read<unknown>(ASSESSMENTS, []); if (!Array.isArray(value)) { mutationFailure = 'Saved capability assessments were invalid and were ignored.'; return []; } return value as Assessment[]; },
  saveAssessments(value: Assessment[]) { return write(ASSESSMENTS, value); },
  loadProgressions(): Record<string, string> { return read<Record<string, string>>(PROGRESSIONS, {}); },
  saveProgressions(value: Record<string, string>) { return write(PROGRESSIONS, value); },
  loadSkillAssessments(): SkillAssessment[] { const value = read<unknown>(SKILL_ASSESSMENTS, []); if (!Array.isArray(value)) { mutationFailure = 'Saved skill assessments were invalid and were ignored.'; return []; } return value as SkillAssessment[]; },
  saveSkillAssessments(value: SkillAssessment[]) { return write(SKILL_ASSESSMENTS, value); },
  loadPreferences(): UserPreferences { return normalizePreferences(read<Partial<UserPreferences>>(PREFERENCES, defaultPreferences)); },
  savePreferences(value: UserPreferences) { return write(PREFERENCES, normalizePreferences(value)); },
  loadScheduleEvents(): ScheduleEvent[] { const value = read<unknown>(SCHEDULE_EVENTS, []); if (!Array.isArray(value)) { mutationFailure = 'Saved schedule events were invalid and were ignored.'; return []; } return value as ScheduleEvent[]; },
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

  importData(value: unknown, mode: 'merge' | 'replace' = 'merge') {
    const incoming = validateTrainingExport(value);
    const current = store.exportData();
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
    };

    if (mode === 'replace' && !store.clearAll()) throw new Error(store.getMutationError() || 'Existing local data could not be cleared safely.');
    const saved = runMutations([
      () => store.saveActive(next.activeWorkout),
      () => store.saveRestTimer(next.activeWorkout ? next.restTimer : null),
      () => store.saveHistory(next.history),
      () => store.saveActivity(next.activity),
      () => store.saveReadiness(next.readiness),
      () => store.saveSkills(next.skills),
      () => store.saveAssessments(next.assessments),
      () => store.saveProgressions(next.progressions),
      () => store.saveSkillAssessments(next.skillAssessments),
      () => store.savePreferences(next.preferences),
      () => store.saveScheduleEvents(next.scheduleEvents),
    ], 'The browser could not persist the complete training archive.');
    if (!saved) throw new Error(store.getMutationError() || 'The browser could not persist the complete training archive.');
    return next;
  },

  clearAll() {
    const keys = [ACTIVE, HISTORY, ACTIVITY, READINESS, SKILLS, ASSESSMENTS, PROGRESSIONS, SKILL_ASSESSMENTS, REST_TIMER, LEGACY_REST_UNTIL, PREFERENCES, SCHEDULE_EVENTS, CONNECTED_SLEEP_CONTEXT_KEY];
    return runMutations(keys.map(key => () => remove(key)), 'Local Human Health data could not be fully deleted.');
  },
};
