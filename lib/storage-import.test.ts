import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSession } from './program';
import { defaultPreferences } from './preferences';
import { store, validateTrainingExport } from './storage';
import type { HistoryEntry } from './domain';

class MemoryStorage {
  private values = new Map<string, string>();
  failKey: string | null = null;
  failCount = 0;

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failKey === key && this.failCount > 0) {
      this.failCount--;
      throw new Error('injected storage failure');
    }
    this.values.set(key, value);
  }
  removeItem(key: string) {
    if (this.failKey === key && this.failCount > 0) {
      this.failCount--;
      throw new Error('injected storage failure');
    }
    this.values.delete(key);
  }
  clear() { this.values.clear(); }
}

describe('training archive validation and rollback', () => {
  let local: MemoryStorage;

  beforeEach(() => {
    local = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
    store.clearMutationError();
  });

  afterEach(() => {
    local.failKey = null;
    store.clearAll();
    Reflect.deleteProperty(globalThis, 'localStorage');
    Reflect.deleteProperty(globalThis, 'window');
  });

  function historyFixture(): HistoryEntry {
    const exercises = buildSession('upper-a');
    exercises[0].logs.push({ weight: 60, reps: 6, completedAt: new Date(Date.now() - 20 * 60_000).toISOString(), formQuality: 'good' });
    return {
      workoutId: 'archive-workout-1',
      session: 'upper-a',
      startedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      completedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      status: 'ended-early',
      gymId: 'work',
      mode: 'normal',
      exercises,
    };
  }

  it('deep-validates nested workout, readiness, activity and preference fields', () => {
    const archive = store.exportData();
    archive.history = [historyFixture()];
    expect(validateTrainingExport(archive).history).toHaveLength(1);

    const badMovement = structuredClone(archive) as any;
    badMovement.history[0].exercises[0].movement = 'teleport';
    expect(() => validateTrainingExport(badMovement)).toThrow(/movement/i);

    const badReadiness = structuredClone(archive) as any;
    badReadiness.readiness = [{ recordedAt: new Date().toISOString(), input: { fatigue: 'catastrophic' } }];
    expect(() => validateTrainingExport(badReadiness)).toThrow(/fatigue/i);

    const badPreference = structuredClone(archive) as any;
    badPreference.preferences.domainPriorities = { ...badPreference.preferences.domainPriorities, diagnosis: 'focus' };
    expect(() => validateTrainingExport(badPreference)).toThrow(/unknown domain/i);
  });

  it('normalizes empty legacy optional strings instead of rejecting an otherwise valid archive', () => {
    const archive = store.exportData() as any;
    archive.history = [historyFixture()];
    archive.history[0].gymId = '  work  ';
    archive.history[0].exercises[0].logs[0].note = '   ';
    archive.readiness = [{ recordedAt: new Date().toISOString(), input: {}, sourceName: '' }];
    archive.assessments = [{ metricId: 'single-leg-balance', value: 20, recordedAt: new Date().toISOString(), note: '' }];
    archive.skillAssessments = [{
      treeId: 'pull-up', stepId: 'assisted', passed: false, clean: true, pain: false,
      recordedAt: new Date().toISOString(), metric: 'reps', value: 3, variation: '', note: '',
    }];

    const validated = validateTrainingExport(archive);
    expect(validated.history[0].gymId).toBe('work');
    expect(validated.history[0].exercises[0].logs[0].note).toBeUndefined();
    expect(validated.readiness[0].sourceName).toBeUndefined();
    expect(validated.assessments[0].note).toBeUndefined();
    expect(validated.skillAssessments[0].variation).toBeUndefined();
    expect(validated.skillAssessments[0].note).toBeUndefined();
  });

  it('rejects materially future-dated imported evidence before any mutation', () => {
    const archive = store.exportData() as any;
    archive.activity = [{ domain: 'cardio', minutes: 30, effort: 'moderate', kind: 'planned', completedAt: new Date(Date.now() + 60 * 60_000).toISOString() }];
    const before = JSON.stringify(store.exportData().preferences);
    expect(() => store.importData(archive, 'replace')).toThrow(/future/i);
    expect(JSON.stringify(store.loadPreferences())).toBe(before);
  });

  it('restores the exact pre-import training state when a later storage mutation fails', () => {
    const priorHistory = historyFixture();
    expect(store.saveHistory([priorHistory])).toBe(true);
    expect(store.saveActivity([{ domain: 'cardio', minutes: 12, effort: 'easy', kind: 'planned', source: 'manual', completedAt: new Date(Date.now() - 5 * 60_000).toISOString() }])).toBe(true);
    expect(store.savePreferences({ ...defaultPreferences, selectedGymId: 'home', cardioTargetMinutes: 120 })).toBe(true);

    const before = store.exportData();
    const replacement = structuredClone(before);
    replacement.history = [];
    replacement.activity = [{ domain: 'cardio', minutes: 40, effort: 'moderate', kind: 'planned', source: 'manual', completedAt: new Date().toISOString() }];
    replacement.preferences = { ...replacement.preferences, selectedGymId: 'hotel', cardioTargetMinutes: 200 };
    replacement.exportedAt = new Date().toISOString();

    local.failKey = 'human-health:activity';
    local.failCount = 1;
    expect(() => store.importData(replacement, 'replace')).toThrow(/restored/i);
    local.failKey = null;

    expect(store.loadHistory()).toEqual(before.history);
    expect(store.loadActivity()).toEqual(before.activity);
    expect(store.loadPreferences()).toEqual(before.preferences);
  });

  it('applies a validated replace archive without clearing first', () => {
    expect(store.saveHistory([historyFixture()])).toBe(true);
    const replacement = store.exportData();
    replacement.history = [];
    replacement.activity = [{ domain: 'mobility', minutes: 8, effort: 'easy', kind: 'planned', source: 'manual', completedAt: new Date().toISOString() }];
    replacement.preferences = { ...replacement.preferences, selectedGymId: 'hotel' };
    replacement.exportedAt = new Date().toISOString();

    expect(store.importData(replacement, 'replace').activity).toHaveLength(1);
    expect(store.loadHistory()).toEqual([]);
    expect(store.loadActivity()[0].domain).toBe('mobility');
    expect(store.loadPreferences().selectedGymId).toBe('hotel');
  });
});
