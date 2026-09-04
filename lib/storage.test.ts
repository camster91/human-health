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
      expect(() => store.importData(archive, 'merge')).toThrow('Browser storage rejected the latest save');
      expect(store.getMutationError()).toContain('Browser storage rejected the latest save');
    } finally { restore(); }
  });
});
