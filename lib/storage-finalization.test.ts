import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSession } from './program';
import { store } from './storage';
import { workoutActivityDoses } from './whole-person';
import type { HistoryEntry, Workout } from './domain';

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
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('journaled workout finalization', () => {
  let local: MemoryStorage;

  beforeEach(() => {
    local = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
    store.clearMutationError();
  });

  afterEach(() => {
    store.clearAll();
    Reflect.deleteProperty(globalThis, 'localStorage');
    Reflect.deleteProperty(globalThis, 'window');
  });

  function fixture() {
    const startedAt = '2026-09-04T12:00:00.000Z';
    const exercises = buildSession('upper-a');
    exercises[0].logs.push({ weight: 60, reps: 6, completedAt: '2026-09-04T12:05:00.000Z' });
    const active: Workout = {
      id: 'workout-1',
      session: 'upper-a',
      startedAt,
      status: 'active',
      gymId: 'work',
      mode: 'normal',
      exercises,
    };
    const entry: HistoryEntry = {
      session: active.session,
      startedAt,
      completedAt: '2026-09-04T12:30:00.000Z',
      status: 'ended-early',
      gymId: active.gymId,
      mode: active.mode,
      exercises,
    };
    return { active, entry, doses: workoutActivityDoses(entry) };
  }

  it('does not expose finalized history until matching activity is ready', () => {
    const { active, entry } = fixture();
    expect(store.saveActive(active)).toBe(true);
    expect(store.saveHistory([entry])).toBe(true);
    expect(store.loadHistory()).toEqual([]);
    expect(store.loadActive()?.id).toBe(active.id);
  });

  it('commits history and derived activity exactly once', () => {
    const { active, entry, doses } = fixture();
    expect(store.saveActive(active)).toBe(true);
    expect(store.saveHistory([entry])).toBe(true);
    expect(store.saveActivity(doses)).toBe(true);
    expect(store.loadActive()).toBeNull();
    expect(store.loadHistory()).toHaveLength(1);
    expect(store.loadActivity()).toHaveLength(doses.length);

    // Replaying the same finalized snapshots remains duplicate-safe.
    expect(store.saveHistory([entry])).toBe(true);
    expect(store.saveActivity(doses)).toBe(true);
    expect(store.loadHistory()).toHaveLength(1);
    expect(store.loadActivity()).toHaveLength(doses.length);
  });

  it('replays a partial commit after an injected activity write failure', () => {
    const { active, entry, doses } = fixture();
    expect(store.saveActive(active)).toBe(true);
    expect(store.saveHistory([entry])).toBe(true);

    local.failKey = 'human-health:activity';
    local.failCount = 1;
    expect(store.saveActivity(doses)).toBe(false);
    expect(store.getMutationError()).toContain('storage');

    local.failKey = null;
    expect(store.loadActive()).toBeNull();
    expect(store.loadHistory()).toHaveLength(1);
    expect(store.loadActivity()).toHaveLength(doses.length);
  });
});
