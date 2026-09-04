import { HistoryEntry, Workout } from './domain';
import { SkillAssessment } from './performance';
import { defaultPreferences, normalizePreferences, UserPreferences } from './preferences';
import { RestTimerState, sanitizeRestTimer, startRestTimer } from './rest-timer';
import { ScheduleEvent } from './schedule';
import { ActivityDose, Assessment, ReadinessInput } from './whole-person';

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

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* storage can be unavailable */ }
}

function canPersist() {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_PROBE, '1');
    localStorage.removeItem(STORAGE_PROBE);
    return true;
  } catch {
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

export type HumanHealthExport = {
  schemaVersion: 2;
  exportedAt: string;
  activeWorkout: Workout | null;
  restTimer: RestTimerState | null;
  history: HistoryEntry[];
  activity: ActivityDose[];
  readiness: { recordedAt: string; input: ReadinessInput }[];
  skills: Record<string, string>;
  assessments: Assessment[];
  progressions: Record<string, string>;
  skillAssessments: SkillAssessment[];
  preferences: UserPreferences;
  scheduleEvents: ScheduleEvent[];
};

export const store = {
  canPersist,
  loadActive(): Workout | null { return activeWorkout(read<unknown>(ACTIVE, null)); },
  saveActive(value: Workout | null) { if (value) return write(ACTIVE, value); remove(ACTIVE); return true; },

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
    remove(REST_TIMER);
    remove(LEGACY_REST_UNTIL);
    return null;
  },
  saveRestTimer(value: RestTimerState | null) { if (value) return write(REST_TIMER, value); remove(REST_TIMER); remove(LEGACY_REST_UNTIL); return true; },
  loadRestUntil(): number | null { const timer = store.loadRestTimer(); return timer?.status === 'running' ? timer.endsAt : null; },
  saveRestUntil(value: number | null) { return store.saveRestTimer(value ? { status: 'running', endsAt: value, durationMs: Math.max(1, value - Date.now()) } : null); },

  loadHistory(): HistoryEntry[] { const value = read<unknown>(HISTORY, []); return Array.isArray(value) ? value as HistoryEntry[] : []; },
  saveHistory(value: HistoryEntry[]) { return write(HISTORY, value); },
  loadActivity(): ActivityDose[] { const value = read<unknown>(ACTIVITY, []); return Array.isArray(value) ? value as ActivityDose[] : []; },
  saveActivity(value: ActivityDose[]) { return write(ACTIVITY, value); },
  loadReadiness(): { recordedAt: string; input: ReadinessInput }[] { const value = read<unknown>(READINESS, []); return Array.isArray(value) ? value as { recordedAt: string; input: ReadinessInput }[] : []; },
  saveReadiness(value: { recordedAt: string; input: ReadinessInput }[]) { return write(READINESS, value.slice(-90)); },
  loadSkills(): Record<string, string> { return read<Record<string, string>>(SKILLS, {}); },
  saveSkills(value: Record<string, string>) { return write(SKILLS, value); },
  loadAssessments(): Assessment[] { const value = read<unknown>(ASSESSMENTS, []); return Array.isArray(value) ? value as Assessment[] : []; },
  saveAssessments(value: Assessment[]) { return write(ASSESSMENTS, value); },
  loadProgressions(): Record<string, string> { return read<Record<string, string>>(PROGRESSIONS, {}); },
  saveProgressions(value: Record<string, string>) { return write(PROGRESSIONS, value); },
  loadSkillAssessments(): SkillAssessment[] { const value = read<unknown>(SKILL_ASSESSMENTS, []); return Array.isArray(value) ? value as SkillAssessment[] : []; },
  saveSkillAssessments(value: SkillAssessment[]) { return write(SKILL_ASSESSMENTS, value); },
  loadPreferences(): UserPreferences { return normalizePreferences(read<Partial<UserPreferences>>(PREFERENCES, defaultPreferences)); },
  savePreferences(value: UserPreferences) { return write(PREFERENCES, normalizePreferences(value)); },
  loadScheduleEvents(): ScheduleEvent[] { const value = read<unknown>(SCHEDULE_EVENTS, []); return Array.isArray(value) ? value as ScheduleEvent[] : []; },
  saveScheduleEvents(value: ScheduleEvent[]) { return write(SCHEDULE_EVENTS, value.slice(-100)); },

  exportData(): HumanHealthExport {
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      activeWorkout: store.loadActive(),
      restTimer: store.loadRestTimer(),
      history: store.loadHistory(),
      activity: store.loadActivity(),
      readiness: store.loadReadiness(),
      skills: store.loadSkills(),
      assessments: store.loadAssessments(),
      progressions: store.loadProgressions(),
      skillAssessments: store.loadSkillAssessments(),
      preferences: store.loadPreferences(),
      scheduleEvents: store.loadScheduleEvents(),
    };
  },

  clearAll() {
    [ACTIVE, HISTORY, ACTIVITY, READINESS, SKILLS, ASSESSMENTS, PROGRESSIONS, SKILL_ASSESSMENTS, REST_TIMER, LEGACY_REST_UNTIL, PREFERENCES, SCHEDULE_EVENTS].forEach(remove);
  },
};
