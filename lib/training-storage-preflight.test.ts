import { describe, expect, it } from 'vitest';
import { defaultPreferences } from './preferences';
import { preflightTrainingStorage } from './training-storage-preflight';

class MemoryStorage {
  private values = new Map<string, string>();
  writes = 0;
  removals = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes++; this.values.set(key, String(value)); }
  removeItem(key: string) { this.removals++; this.values.delete(key); }
  resetMutationCounts() { this.writes = 0; this.removals = 0; }
}

function withStorage(memory: MemoryStorage, run: () => void) {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
  try { run(); }
  finally {
    Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
  }
}

describe('read-only training storage preflight', () => {
  it('finds corruption without migrating or deleting otherwise valid stored state', () => {
    const memory = new MemoryStorage();
    const futureTimer = Date.now() + 60_000;
    memory.setItem('human-health:rest-until', JSON.stringify(futureTimer));
    memory.setItem('human-health:preferences', JSON.stringify({ ...defaultPreferences, lifeMode: 'invalid-mode' }));
    memory.resetMutationCounts();

    withStorage(memory, () => {
      const result = preflightTrainingStorage();
      expect(result.errors.some(error => error.includes('training preferences'))).toBe(true);
      expect(memory.getItem('human-health:rest-until')).toBe(JSON.stringify(futureTimer));
      expect(memory.writes).toBe(0);
      expect(memory.removals).toBe(0);
    });
  });

  it('distinguishes malformed JSON and remains read only', () => {
    const memory = new MemoryStorage();
    memory.setItem('human-health:history', '{bad json');
    memory.resetMutationCounts();
    withStorage(memory, () => {
      expect(preflightTrainingStorage().errors.some(error => error.includes('malformed JSON'))).toBe(true);
      expect(memory.getItem('human-health:history')).toBe('{bad json');
      expect(memory.writes).toBe(0);
      expect(memory.removals).toBe(0);
    });
  });

  it('can allow a valid pending finalization for runtime recovery but block complete export', () => {
    const memory = new MemoryStorage();
    memory.setItem('human-health:finalization-journal', JSON.stringify({ version: 1, workoutId: 'workout-1', history: [], activity: null }));
    memory.resetMutationCounts();
    withStorage(memory, () => {
      const runtime = preflightTrainingStorage();
      expect(runtime.errors).toEqual([]);
      expect(runtime.pendingFinalization).toEqual({ workoutId: 'workout-1', activityComplete: false });

      const completeExport = preflightTrainingStorage({ blockPendingFinalization: true });
      expect(completeExport.errors.some(error => error.includes('finalization is still pending'))).toBe(true);
      expect(memory.writes).toBe(0);
      expect(memory.removals).toBe(0);
    });
  });
});
