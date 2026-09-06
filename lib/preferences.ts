import { Equipment, SessionId, TrainingMode } from './domain';
import { CapabilityDomain } from './whole-person-types';
import { SoftHabitId } from './connected-health/soft-habits';

export type DomainPriority = 'focus' | 'maintain' | 'deprioritize' | 'off';
export type UnitSystem = 'metric' | 'imperial';

export type UserPreferences = {
  lifeMode: TrainingMode;
  selectedGymId: string;
  cardioTargetMinutes: number;
  highImpactAllowed: boolean;
  notificationEnabled: boolean;
  vibrationEnabled: boolean;
  defaultRestSeconds: number;
  unitSystem: UnitSystem;
  nextSessionOverride: SessionId | null;
  domainPriorities: Record<CapabilityDomain, DomainPriority>;
  swapPreferences: Record<string, string>;
  plateBarKg: number;
  availablePlatesKg: number[];
  lastUnavailableEquipment: Equipment[];
  enableFuelTracking: boolean;
  enabledSoftHabits: SoftHabitId[];
};

const capabilityDomains: CapabilityDomain[] = ['strength', 'cardio', 'mobility', 'core', 'bodyweight', 'balance', 'power', 'movement', 'recovery', 'consistency'];
const equipmentValues: Equipment[] = ['barbell', 'rack', 'bench', 'cable', 'bodyweight', 'dumbbell', 'machine', 'pullup-bar', 'dip-station', 'cardio'];
const lifeModes: TrainingMode[] = ['normal', 'travel', 'return', 'maintenance'];
const sessions: SessionId[] = ['upper-a', 'lower-a', 'upper-b', 'lower-b'];
const priorities: DomainPriority[] = ['focus', 'maintain', 'deprioritize', 'off'];

const defaultDomainPriorities: Record<CapabilityDomain, DomainPriority> = {
  strength: 'focus',
  cardio: 'focus',
  mobility: 'maintain',
  core: 'maintain',
  bodyweight: 'maintain',
  balance: 'maintain',
  power: 'maintain',
  movement: 'maintain',
  recovery: 'maintain',
  consistency: 'maintain',
};

export const defaultPreferences: UserPreferences = {
  lifeMode: 'normal',
  selectedGymId: 'work',
  cardioTargetMinutes: 150,
  highImpactAllowed: true,
  notificationEnabled: false,
  vibrationEnabled: false,
  defaultRestSeconds: 90,
  unitSystem: 'metric',
  nextSessionOverride: null,
  domainPriorities: { ...defaultDomainPriorities },
  swapPreferences: {},
  plateBarKg: 20,
  availablePlatesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lastUnavailableEquipment: [],
  enableFuelTracking: false,
  enabledSoftHabits: [],
};

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
function validBoolean(value: unknown, fallback: boolean) { return typeof value === 'boolean' ? value : fallback; }
function validRecord(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export function normalizePreferences(value?: Partial<UserPreferences> | null): UserPreferences {
  const record = validRecord(value);
  const plates = Array.isArray(value?.availablePlatesKg)
    ? [...new Set(value.availablePlatesKg.map(Number).filter(item => Number.isFinite(item) && item > 0))].sort((a, b) => b - a)
    : defaultPreferences.availablePlatesKg;
  const rawPriorities = validRecord(record.domainPriorities);
  const domainPriorities = { ...defaultDomainPriorities };
  for (const domain of capabilityDomains) {
    const candidate = rawPriorities[domain];
    if (priorities.includes(candidate as DomainPriority)) domainPriorities[domain] = candidate as DomainPriority;
  }
  const rawSwaps = validRecord(record.swapPreferences);
  const swapPreferences = Object.fromEntries(Object.entries(rawSwaps).filter(([key, candidate]) => key.length > 0 && typeof candidate === 'string' && candidate.length > 0)) as Record<string, string>;
  return {
    lifeMode: lifeModes.includes(record.lifeMode as TrainingMode) ? record.lifeMode as TrainingMode : defaultPreferences.lifeMode,
    selectedGymId: typeof record.selectedGymId === 'string' && record.selectedGymId.trim() ? record.selectedGymId : defaultPreferences.selectedGymId,
    cardioTargetMinutes: finiteNumber(record.cardioTargetMinutes, defaultPreferences.cardioTargetMinutes, 0, 600),
    highImpactAllowed: validBoolean(record.highImpactAllowed, defaultPreferences.highImpactAllowed),
    notificationEnabled: validBoolean(record.notificationEnabled, defaultPreferences.notificationEnabled),
    vibrationEnabled: validBoolean(record.vibrationEnabled, defaultPreferences.vibrationEnabled),
    defaultRestSeconds: finiteNumber(record.defaultRestSeconds, defaultPreferences.defaultRestSeconds, 15, 600),
    unitSystem: record.unitSystem === 'imperial' || record.unitSystem === 'metric' ? record.unitSystem : defaultPreferences.unitSystem,
    nextSessionOverride: sessions.includes(record.nextSessionOverride as SessionId) ? record.nextSessionOverride as SessionId : null,
    domainPriorities,
    swapPreferences,
    plateBarKg: finiteNumber(record.plateBarKg, defaultPreferences.plateBarKg, 0, 50),
    availablePlatesKg: plates.length ? plates : defaultPreferences.availablePlatesKg,
    lastUnavailableEquipment: Array.isArray(value?.lastUnavailableEquipment) ? [...new Set(value.lastUnavailableEquipment.filter(item => equipmentValues.includes(item)))] : [],
    enableFuelTracking: validBoolean(record.enableFuelTracking, defaultPreferences.enableFuelTracking),
    enabledSoftHabits: Array.isArray(value?.enabledSoftHabits) ? value.enabledSoftHabits.filter((h): h is SoftHabitId => typeof h === 'string' && ['morning-movement', 'evening-wind-down', 'hydration-check', 'gratitude-moment', 'breath-pause'].includes(h)) : defaultPreferences.enabledSoftHabits,
  };
}

export function swapPreferenceKey(gymId: string, exerciseId: string) {
  return `${gymId}:${exerciseId}`;
}
