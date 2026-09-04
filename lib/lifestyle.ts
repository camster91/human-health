export type LifestyleSource = 'manual' | 'device' | 'import';
export type TrackingDomain = 'sleep' | 'movement' | 'nutrition' | 'wellbeing' | 'health-context' | 'glucose-context';

export type BaseLifestyleRecord = {
  id: string;
  date: string;
  recordedAt: string;
  source: LifestyleSource;
  schemaVersion: 1;
};

export type SleepLog = BaseLifestyleRecord & {
  durationMinutes?: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  bedtime?: string;
  wakeTime?: string;
  interruptions?: number;
};

export type MovementLog = BaseLifestyleRecord & {
  steps?: number;
  activeMinutes?: number;
  sedentaryMinutes?: number;
  movementBreaks?: number;
};

export type NutritionLog = BaseLifestyleRecord & {
  hydrationMl?: number;
  proteinTargetMet?: boolean;
  fibreTargetMet?: boolean;
  produceServings?: number;
  mealsRegular?: boolean;
  appetiteAdequate?: boolean;
  detailedCalories?: number;
  detailedProteinGrams?: number;
  detailedFibreGrams?: number;
};

export type WellbeingLog = BaseLifestyleRecord & {
  energy?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  stress?: 1 | 2 | 3 | 4 | 5;
  illness?: boolean;
  pain?: boolean;
  concerningSymptoms?: boolean;
  note?: string;
};

export type GlucoseTiming = 'before' | 'during' | 'after' | 'later';
export type PersonalRangeRelation = 'below' | 'within' | 'above' | 'unknown';
export type GlucoseTrend = 'rapidly-falling' | 'falling' | 'stable' | 'rising' | 'rapidly-rising' | 'unknown';
export type GlucoseExerciseContext = BaseLifestyleRecord & {
  timing: GlucoseTiming;
  workoutId?: string;
  valueMmolL?: number;
  relationToPersonalRange: PersonalRangeRelation;
  trend: GlucoseTrend;
  symptoms?: boolean;
  note?: string;
};

export type HealthContext = {
  schemaVersion: 1;
  updatedAt: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  clinicianRestrictions: string[];
  emergencyNote?: string;
};

export type LifestyleConsent = Record<TrackingDomain, boolean>;
export type LifestylePreferences = {
  schemaVersion: 1;
  consent: LifestyleConsent;
  hydrationTargetMl?: number;
  produceTargetServings?: number;
  detailedNutritionEnabled: boolean;
  glucoseContextEnabled: boolean;
  retainDays: number | null;
};

export type LifestyleDataset = {
  sleep: SleepLog[];
  movement: MovementLog[];
  nutrition: NutritionLog[];
  wellbeing: WellbeingLog[];
  glucose: GlucoseExerciseContext[];
  healthContext: HealthContext;
  preferences: LifestylePreferences;
};

export const defaultLifestyleConsent: LifestyleConsent = {
  sleep: true,
  movement: true,
  nutrition: true,
  wellbeing: true,
  'health-context': false,
  'glucose-context': false,
};

export const defaultLifestylePreferences: LifestylePreferences = {
  schemaVersion: 1,
  consent: { ...defaultLifestyleConsent },
  hydrationTargetMl: undefined,
  produceTargetServings: undefined,
  detailedNutritionEnabled: false,
  glucoseContextEnabled: false,
  retainDays: null,
};

export const emptyHealthContext: HealthContext = {
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
  conditions: [],
  medications: [],
  allergies: [],
  clinicianRestrictions: [],
};

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createLifestyleRecord<T extends object>(date: string, values: T, id?: string): T & BaseLifestyleRecord {
  return {
    ...values,
    id: id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${date}-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    date,
    recordedAt: new Date().toISOString(),
    source: 'manual',
    schemaVersion: 1,
  } as T & BaseLifestyleRecord;
}

function finite(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : undefined;
}

function optionalTextList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))].slice(0, 50);
}

export function normalizeLifestylePreferences(value?: Partial<LifestylePreferences> | null): LifestylePreferences {
  const consent = { ...defaultLifestyleConsent };
  if (value?.consent && typeof value.consent === 'object') {
    for (const domain of Object.keys(consent) as TrackingDomain[]) {
      const candidate = value.consent[domain];
      if (typeof candidate === 'boolean') consent[domain] = candidate;
    }
  }
  const retain = value?.retainDays === null ? null : finite(value?.retainDays, 7, 3650);
  return {
    schemaVersion: 1,
    consent,
    hydrationTargetMl: finite(value?.hydrationTargetMl, 250, 10000),
    produceTargetServings: finite(value?.produceTargetServings, 1, 20),
    detailedNutritionEnabled: typeof value?.detailedNutritionEnabled === 'boolean' ? value.detailedNutritionEnabled : false,
    glucoseContextEnabled: typeof value?.glucoseContextEnabled === 'boolean' ? value.glucoseContextEnabled : false,
    retainDays: retain === undefined ? null : retain,
  };
}

export function normalizeHealthContext(value?: Partial<HealthContext> | null): HealthContext {
  return {
    schemaVersion: 1,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    conditions: optionalTextList(value?.conditions),
    medications: optionalTextList(value?.medications),
    allergies: optionalTextList(value?.allergies),
    clinicianRestrictions: optionalTextList(value?.clinicianRestrictions),
    emergencyNote: typeof value?.emergencyNote === 'string' ? value.emergencyNote.slice(0, 1000) : undefined,
  };
}

export function pruneByRetention<T extends { recordedAt: string }>(items: T[], retainDays: number | null, now = new Date()) {
  if (retainDays === null) return items;
  const cutoff = now.getTime() - retainDays * 86_400_000;
  return items.filter(item => new Date(item.recordedAt).getTime() >= cutoff);
}
