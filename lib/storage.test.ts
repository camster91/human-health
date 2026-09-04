import { describe, expect, it } from 'vitest';
import { store } from './storage';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('local-first storage', () => {
  it('detects storage, normalizes preferences, rejects invalid active data and exports a versioned snapshot', () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
    try {
      expect(store.canPersist()).toBe(true);
      memory.setItem('human-health:preferences', JSON.stringify({ lifeMode: 'bad', cardioTargetMinutes: 9999 }));
      expect(store.loadPreferences().lifeMode).toBe('normal');
      expect(store.loadPreferences().cardioTargetMinutes).toBe(600);
      memory.setItem('human-health:active', JSON.stringify({ id: 'broken' }));
      expect(store.loadActive()).toBeNull();
      expect(store.exportData().schemaVersion).toBe(2);
      store.clearAll();
      expect(memory.getItem('human-health:preferences')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
      Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
    }
  });
});
