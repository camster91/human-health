import { describe, expect, it } from 'vitest';
import { store } from './storage';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

class FaultyStorage extends MemoryStorage {
  constructor(private readonly failSetKey?: string, private readonly failRemoveKey?: string) { super(); }
  setItem(key: string, value: string) {
    if (key === this.failSetKey) throw new Error(`set failed for ${key}`);
    super.setItem(key, value);
  }
  removeItem(key: string) {
    if (key === this.failRemoveKey) throw new Error(`remove failed for ${key}`);
    super.removeItem(key);
  }
}

function installStorage(memory: MemoryStorage) {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
  return () => {
    Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
    store.clearMutationError();
  };
}

describe('local-first storage', () => {
  it('detects storage, normalizes preferences, rejects invalid active data and exports a versioned snapshot', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      expect(store.canPersist()).toBe(true);
      memory.setItem('human-health:preferences', JSON.stringify({ lifeMode: 'bad', cardioTargetMinutes: 9999 }));
      expect(store.loadPreferences().lifeMode).toBe('normal');
      expect(store.loadPreferences().cardioTargetMinutes).toBe(600);
      memory.setItem('human-health:active', JSON.stringify({ id: 'broken' }));
      expect(store.loadActive()).toBeNull();
      expect(store.exportData().schemaVersion).toBe(2);
      expect(store.clearAll()).toBe(true);
      expect(memory.getItem('human-health:preferences')).toBeNull();
    } finally { restore(); }
  });

  it('preserves the first deletion failure even when later removals succeed', () => {
    const memory = new FaultyStorage(undefined, 'human-health:history');
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:preferences', JSON.stringify({ lifeMode: 'travel' }));
      expect(store.clearAll()).toBe(false);
      expect(store.getMutationError()).toContain('rejected a local deletion');
      expect(memory.getItem('human-health:preferences')).toBeNull();
    } finally { restore(); }
  });

  it('preserves a specific archive write failure even when subsequent writes succeed', () => {
    const memory = new FaultyStorage('human-health:history');
    const restore = installStorage(memory);
    try {
      const archive = store.exportData();
      expect(() => store.importData(archive, 'merge')).toThrow('Browser storage rejected the archive');
      expect(store.getMutationError()).toContain('Browser storage rejected the archive');
    } finally { restore(); }
  });
});

describe('training state integrity fail-closed validation', () => {
  it('throws on corrupt workout history and preserves export/delete recovery', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:history', JSON.stringify([{ broken: 'missing required fields' }]));
      expect(() => store.loadHistory()).toThrow('Saved workout history is corrupt');
      expect(() => store.loadHistory()).toThrow('Export your data if possible');
      expect(() => store.exportData()).not.toThrow();
      expect(store.clearAll()).toBe(true);
    } finally { restore(); }
  });

  it('throws on corrupt activity data', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:activity', JSON.stringify([{ domain: 'strength' }]));
      expect(() => store.loadActivity()).toThrow('Saved activity data is corrupt');
    } finally { restore(); }
  });

  it('throws on corrupt readiness data', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:readiness', JSON.stringify([{ recordedAt: '2024-01-01T00:00:00Z' }]));
      expect(() => store.loadReadiness()).toThrow('Saved readiness data is corrupt');
    } finally { restore(); }
  });

  it('throws on corrupt capability assessments', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:assessments', JSON.stringify([{ metricId: 'pushup', recordedAt: '2024-01-01T00:00:00Z' }]));
      expect(() => store.loadAssessments()).toThrow('Saved capability assessments are corrupt');
    } finally { restore(); }
  });

  it('throws on corrupt skill assessments', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:skill-assessments', JSON.stringify([{ treeId: 'tree', stepId: 'step' }]));
      expect(() => store.loadSkillAssessments()).toThrow('Saved skill assessments are corrupt');
    } finally { restore(); }
  });

  it('throws on corrupt schedule events', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:schedule-events', JSON.stringify([{ type: 'skip', from: 'upper-a' }]));
      expect(() => store.loadScheduleEvents()).toThrow('Saved schedule events are corrupt');
    } finally { restore(); }
  });

  it('throws on non-array fuel checks, habit completions, mind checks, and reflections', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:fuel-checks', JSON.stringify({ broken: true }));
      expect(() => store.loadFuelChecks()).toThrow('Saved fuel checks are corrupt');

      memory.setItem('human-health:soft-habit-completions', JSON.stringify({ broken: true }));
      expect(() => store.loadSoftHabitCompletions()).toThrow('Saved habit completions are corrupt');

      memory.setItem('human-health:mind-checks', JSON.stringify({ broken: true }));
      expect(() => store.loadMindChecks()).toThrow('Saved mind checks are corrupt');

      memory.setItem('human-health:weekly-reflections', JSON.stringify({ broken: true }));
      expect(() => store.loadWeeklyReflections()).toThrow('Saved weekly reflections are corrupt');
    } finally { restore(); }
  });

  it('accepts valid workout history with all required fields', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      const validHistory = [{
        session: 'upper-a',
        completedAt: '2024-01-01T10:00:00Z',
        exercises: [{
          id: 'ex1',
          name: 'Bench Press',
          movement: 'horizontal-push',
          equipment: ['barbell'],
          priority: 'primary',
          repRange: [5, 8],
          sets: 3,
          logs: []
        }]
      }];
      memory.setItem('human-health:history', JSON.stringify(validHistory));
      expect(() => store.loadHistory()).not.toThrow();
      expect(store.loadHistory()).toHaveLength(1);
    } finally { restore(); }
  });

  it('accepts valid activity data with required domain and completedAt', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      const validActivity = [{
        domain: 'cardio',
        completedAt: '2024-01-01T10:00:00Z',
        minutes: 30
      }];
      memory.setItem('human-health:activity', JSON.stringify(validActivity));
      expect(() => store.loadActivity()).not.toThrow();
      expect(store.loadActivity()).toHaveLength(1);
    } finally { restore(); }
  });

  it('accepts empty arrays as valid state', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:history', JSON.stringify([]));
      memory.setItem('human-health:activity', JSON.stringify([]));
      memory.setItem('human-health:readiness', JSON.stringify([]));
      memory.setItem('human-health:assessments', JSON.stringify([]));
      expect(() => store.loadHistory()).not.toThrow();
      expect(() => store.loadActivity()).not.toThrow();
      expect(() => store.loadReadiness()).not.toThrow();
      expect(() => store.loadAssessments()).not.toThrow();
    } finally { restore(); }
  });

  it('preserves clearAll recovery path when corrupt state exists', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:history', JSON.stringify([{ broken: true }]));
      memory.setItem('human-health:activity', JSON.stringify([{ broken: true }]));
      expect(() => store.loadHistory()).toThrow();
      expect(() => store.loadActivity()).toThrow();
      expect(store.clearAll()).toBe(true);
      expect(() => store.loadHistory()).not.toThrow();
      expect(() => store.loadActivity()).not.toThrow();
    } finally { restore(); }
  });
});
