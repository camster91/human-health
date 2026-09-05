import { describe, expect, it } from 'vitest';
import { defaultPreferences } from './preferences';
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
    memory.clear();
    store.clearAll();
    store.clearMutationError();
    Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
  };
}

function emptyArchive() {
  return {
    schemaVersion: 2 as const,
    exportedAt: new Date().toISOString(),
    activeWorkout: null,
    restTimer: null,
    history: [],
    activity: [],
    readiness: [],
    skills: {},
    assessments: [],
    progressions: {},
    skillAssessments: [],
    preferences: defaultPreferences,
    scheduleEvents: [],
  };
}

describe('local-first storage', () => {
  it('detects storage and exports a valid versioned snapshot', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      expect(store.canPersist()).toBe(true);
      expect(store.exportData().schemaVersion).toBe(2);
      expect(store.clearAll()).toBe(true);
      expect(memory.getItem('human-health:preferences')).toBeNull();
    } finally { restore(); }
  });

  it('fails closed on invalid persisted preferences and active workout data', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:preferences', JSON.stringify({ lifeMode: 'bad', cardioTargetMinutes: 9999 }));
      memory.setItem('human-health:active', JSON.stringify({ id: 'broken' }));

      expect(store.loadPreferences()).toEqual(defaultPreferences);
      expect(store.loadActive()).toBeNull();
      expect(store.getIntegrityErrors().length).toBeGreaterThanOrEqual(2);
      expect(() => store.exportData()).toThrow('Complete training export refused');

      expect(store.savePreferences(defaultPreferences)).toBe(true);
      expect(store.saveActive(null)).toBe(true);
      expect(store.exportData().schemaVersion).toBe(2);
    } finally { restore(); }
  });

  it('distinguishes malformed JSON from an absent key and refuses complete export', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      expect(store.loadHistory()).toEqual([]);
      expect(store.getIntegrityErrors()).toEqual([]);

      memory.setItem('human-health:history', '{bad json');
      expect(store.loadHistory()).toEqual([]);
      expect(store.getMutationError()).toContain('corrupt or unsupported');
      expect(() => store.exportData()).toThrow('Complete training export refused');

      memory.removeItem('human-health:history');
      expect(store.loadHistory()).toEqual([]);
      expect(store.exportData().history).toEqual([]);
    } finally { restore(); }
  });

  it('rejects nested corrupt history/activity evidence at runtime rather than casting it', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:history', JSON.stringify([{ session: 'upper-a', completedAt: new Date().toISOString(), exercises: [{ id: 'x', name: 'Bad', movement: 'teleport', equipment: [], priority: 'primary', repRange: [5, 8], sets: 3, logs: [] }] }]));
      memory.setItem('human-health:activity', JSON.stringify([{ domain: 'cardio', minutes: Number.NaN, completedAt: new Date().toISOString() }]));
      expect(store.loadHistory()).toEqual([]);
      expect(store.loadActivity()).toEqual([]);
      expect(store.getIntegrityErrors().some(message => message.includes('workout history'))).toBe(true);
      expect(store.getIntegrityErrors().some(message => message.includes('activity'))).toBe(true);
      expect(() => store.exportData()).toThrow('Complete training export refused');
    } finally { restore(); }
  });

  it('allows a validated replace import to repair corrupt current training state', () => {
    const memory = new MemoryStorage();
    const restore = installStorage(memory);
    try {
      memory.setItem('human-health:assessments', JSON.stringify([{ metricId: '', value: 'not-a-number', recordedAt: 'bad' }]));
      expect(store.loadAssessments()).toEqual([]);
      expect(() => store.importData(emptyArchive(), 'merge')).toThrow('Complete training export refused');

      expect(store.importData(emptyArchive(), 'replace').schemaVersion).toBe(2);
      expect(store.getIntegrityErrors()).toEqual([]);
      expect(store.exportData().schemaVersion).toBe(2);
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
      expect(() => store.importData(archive, 'merge')).toThrow('Browser storage rejected the latest save');
      expect(store.getMutationError()).toContain('Browser storage rejected the latest save');
    } finally { restore(); }
  });
});