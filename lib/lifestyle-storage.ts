import {
  GlucoseExerciseContext,
  HealthContext,
  LifestyleDataset,
  LifestylePreferences,
  MovementLog,
  NutritionLog,
  SleepLog,
  TrackingDomain,
  WellbeingLog,
  defaultLifestylePreferences,
  emptyHealthContext,
  normalizeHealthContext,
  normalizeLifestylePreferences,
  pruneByRetention,
} from './lifestyle';

const PREFIX = 'human-health:lifestyle:';
const SLEEP = `${PREFIX}sleep`;
const MOVEMENT = `${PREFIX}movement`;
const NUTRITION = `${PREFIX}nutrition`;
const WELLBEING = `${PREFIX}wellbeing`;
const GLUCOSE = `${PREFIX}glucose`;
const HEALTH_CONTEXT = `${PREFIX}health-context`;
const PREFERENCES = `${PREFIX}preferences`;

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
  try { localStorage.removeItem(key); } catch { /* browser storage may be unavailable */ }
}

function list<T>(key: string): T[] {
  const value = read<unknown>(key, []);
  return Array.isArray(value) ? value as T[] : [];
}

function saveWithRetention<T extends { recordedAt: string }>(key: string, items: T[], preferences: LifestylePreferences) {
  return write(key, pruneByRetention(items, preferences.retainDays));
}

function upsertByDate<T extends { id: string; date: string; recordedAt: string }>(items: T[], value: T) {
  const withoutSameDayManual = items.filter(item => item.id !== value.id && !(item.date === value.date && item.id.startsWith('daily-')));
  return [...withoutSameDayManual, value].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

export type LifestyleExport = {
  exportVersion: 1;
  exportedAt: string;
  data: LifestyleDataset;
};

export const lifestyleStore = {
  loadPreferences() { return normalizeLifestylePreferences(read<Partial<LifestylePreferences>>(PREFERENCES, defaultLifestylePreferences)); },
  savePreferences(value: LifestylePreferences) { return write(PREFERENCES, normalizeLifestylePreferences(value)); },

  loadHealthContext() { return normalizeHealthContext(read<Partial<HealthContext>>(HEALTH_CONTEXT, emptyHealthContext)); },
  saveHealthContext(value: HealthContext) {
    const preferences = lifestyleStore.loadPreferences();
    if (!preferences.consent['health-context']) return false;
    return write(HEALTH_CONTEXT, normalizeHealthContext({ ...value, updatedAt: new Date().toISOString() }));
  },

  loadSleep() { return list<SleepLog>(SLEEP); },
  saveSleep(items: SleepLog[]) { return saveWithRetention(SLEEP, items, lifestyleStore.loadPreferences()); },
  upsertSleep(value: SleepLog) { return lifestyleStore.saveSleep(upsertByDate(lifestyleStore.loadSleep(), value)); },

  loadMovement() { return list<MovementLog>(MOVEMENT); },
  saveMovement(items: MovementLog[]) { return saveWithRetention(MOVEMENT, items, lifestyleStore.loadPreferences()); },
  upsertMovement(value: MovementLog) { return lifestyleStore.saveMovement(upsertByDate(lifestyleStore.loadMovement(), value)); },

  loadNutrition() { return list<NutritionLog>(NUTRITION); },
  saveNutrition(items: NutritionLog[]) { return saveWithRetention(NUTRITION, items, lifestyleStore.loadPreferences()); },
  upsertNutrition(value: NutritionLog) { return lifestyleStore.saveNutrition(upsertByDate(lifestyleStore.loadNutrition(), value)); },

  loadWellbeing() { return list<WellbeingLog>(WELLBEING); },
  saveWellbeing(items: WellbeingLog[]) { return saveWithRetention(WELLBEING, items, lifestyleStore.loadPreferences()); },
  upsertWellbeing(value: WellbeingLog) { return lifestyleStore.saveWellbeing(upsertByDate(lifestyleStore.loadWellbeing(), value)); },

  loadGlucose() { return list<GlucoseExerciseContext>(GLUCOSE); },
  saveGlucose(items: GlucoseExerciseContext[]) {
    const preferences = lifestyleStore.loadPreferences();
    if (!preferences.consent['glucose-context'] || !preferences.glucoseContextEnabled) return false;
    return saveWithRetention(GLUCOSE, items, preferences);
  },
  addGlucose(value: GlucoseExerciseContext) { return lifestyleStore.saveGlucose([...lifestyleStore.loadGlucose(), value]); },

  snapshot(): LifestyleDataset {
    const preferences = lifestyleStore.loadPreferences();
    return {
      sleep: preferences.consent.sleep ? lifestyleStore.loadSleep() : [],
      movement: preferences.consent.movement ? lifestyleStore.loadMovement() : [],
      nutrition: preferences.consent.nutrition ? lifestyleStore.loadNutrition() : [],
      wellbeing: preferences.consent.wellbeing ? lifestyleStore.loadWellbeing() : [],
      glucose: preferences.consent['glucose-context'] && preferences.glucoseContextEnabled ? lifestyleStore.loadGlucose() : [],
      healthContext: preferences.consent['health-context'] ? lifestyleStore.loadHealthContext() : emptyHealthContext,
      preferences,
    };
  },

  exportData(): LifestyleExport {
    return { exportVersion: 1, exportedAt: new Date().toISOString(), data: lifestyleStore.snapshot() };
  },

  clearDomain(domain: TrackingDomain) {
    if (domain === 'sleep') remove(SLEEP);
    if (domain === 'movement') remove(MOVEMENT);
    if (domain === 'nutrition') remove(NUTRITION);
    if (domain === 'wellbeing') remove(WELLBEING);
    if (domain === 'health-context') remove(HEALTH_CONTEXT);
    if (domain === 'glucose-context') remove(GLUCOSE);
  },

  clearAll() {
    [SLEEP, MOVEMENT, NUTRITION, WELLBEING, GLUCOSE, HEALTH_CONTEXT, PREFERENCES].forEach(remove);
  },
};
