import { describe, expect, it } from 'vitest';
import { createLifestyleRecord, defaultLifestylePreferences } from './lifestyle';
import { lifestyleStore } from './lifestyle-storage';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

function withStorage(run: (storage: MemoryStorage) => void) {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  try { run(storage); }
  finally {
    Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
  }
}

describe('lifestyle storage', () => {
  it('persists daily records and replaces the same manual day without duplication', () => withStorage(() => {
    lifestyleStore.savePreferences(defaultLifestylePreferences);
    lifestyleStore.upsertSleep(createLifestyleRecord('2026-09-03', { durationMinutes: 420 }, 'daily-sleep-2026-09-03'));
    lifestyleStore.upsertSleep(createLifestyleRecord('2026-09-03', { durationMinutes: 450 }, 'daily-sleep-2026-09-03'));
    expect(lifestyleStore.loadSleep()).toHaveLength(1);
    expect(lifestyleStore.loadSleep()[0].durationMinutes).toBe(450);
  }));

  it('requires explicit consent before saving sensitive health or glucose context', () => withStorage(() => {
    lifestyleStore.savePreferences(defaultLifestylePreferences);
    expect(lifestyleStore.saveHealthContext({ schemaVersion: 1, updatedAt: new Date().toISOString(), conditions: ['Type 1 diabetes'], medications: [], allergies: [], clinicianRestrictions: [] })).toBe(false);
    expect(lifestyleStore.addGlucose(createLifestyleRecord('2026-09-03', { timing: 'before' as const, relationToPersonalRange: 'within' as const, trend: 'stable' as const }))).toBe(false);

    const enabled = { ...defaultLifestylePreferences, glucoseContextEnabled: true, consent: { ...defaultLifestylePreferences.consent, 'health-context': true, 'glucose-context': true } };
    lifestyleStore.savePreferences(enabled);
    expect(lifestyleStore.saveHealthContext({ schemaVersion: 1, updatedAt: new Date().toISOString(), conditions: ['Type 1 diabetes'], medications: [], allergies: [], clinicianRestrictions: [] })).toBe(true);
    expect(lifestyleStore.addGlucose(createLifestyleRecord('2026-09-03', { timing: 'before' as const, relationToPersonalRange: 'within' as const, trend: 'stable' as const }))).toBe(true);
  }));

  it('exports a versioned snapshot and deletes one domain without deleting others', () => withStorage(() => {
    lifestyleStore.savePreferences(defaultLifestylePreferences);
    lifestyleStore.upsertSleep(createLifestyleRecord('2026-09-03', { durationMinutes: 420 }, 'daily-sleep-2026-09-03'));
    lifestyleStore.upsertMovement(createLifestyleRecord('2026-09-03', { steps: 8000 }, 'daily-movement-2026-09-03'));
    expect(lifestyleStore.exportData().exportVersion).toBe(1);
    lifestyleStore.clearDomain('sleep');
    expect(lifestyleStore.loadSleep()).toEqual([]);
    expect(lifestyleStore.loadMovement()).toHaveLength(1);
  }));

  it('clears all Phase 3 records and preferences', () => withStorage(() => {
    lifestyleStore.savePreferences(defaultLifestylePreferences);
    lifestyleStore.upsertNutrition(createLifestyleRecord('2026-09-03', { hydrationMl: 2000 }, 'daily-nutrition-2026-09-03'));
    lifestyleStore.clearAll();
    expect(lifestyleStore.loadNutrition()).toEqual([]);
    expect(lifestyleStore.loadPreferences()).toEqual(defaultLifestylePreferences);
  }));
});
