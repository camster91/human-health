import { describe, expect, it } from 'vitest';
import { store } from '../storage';
import { clearConnectedSleepContext, loadConnectedSleepContext, mergeTrustedConnectedSleepReadiness, saveConnectedSleepContext } from './connected-readiness';
import { summarizeConnectedHealth } from './summary';
import { defaultConnectedHealthPreferences } from './types';
import { makeObservation, makeSource } from './test-helpers';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('connected sleep readiness bridge', () => {
  it('uses only fresh connected sleep after a live trusted save and lets fresh manual sleep override it', () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
    try {
      const now = new Date();
      const sleepAt = new Date(now.getTime() - 60 * 60_000);
      const observation = makeObservation('sleep-duration', 480, { sourceId: 'sleep', startTime: new Date(sleepAt.getTime() - 8 * 3_600_000).toISOString(), endTime: sleepAt.toISOString(), recordedAt: sleepAt.toISOString() });
      const source = makeSource('sleep', { displayName: 'Watch sleep', supportedMetrics: ['sleep-duration'], grantedMetrics: ['sleep-duration'], lastSuccessAt: sleepAt.toISOString() });
      const summary = summarizeConnectedHealth([observation], [source], defaultConnectedHealthPreferences, now);
      saveConnectedSleepContext(summary, true);
      expect(loadConnectedSleepContext(now)?.input.sleepHours).toBe(8);

      const manualAt = now.toISOString();
      store.saveReadiness([{ recordedAt: manualAt, input: { stress: 'high' }, source: 'manual' }]);
      const effective = store.loadReadiness().at(-1)!;
      expect(effective.source).toBe('connected-sleep');
      expect(effective.input).toMatchObject({ sleep: 'good', sleepHours: 8, stress: 'high' });
      expect(store.exportData().readiness.every(record => record.source !== 'connected-sleep')).toBe(true);

      store.saveReadiness([{ recordedAt: manualAt, input: { sleep: 'poor', sleepHours: 5, fatigue: 'high' }, source: 'manual' }]);
      const overridden = store.loadReadiness().at(-1)!;
      expect(overridden.source).toBe('manual');
      expect(overridden.input.sleep).toBe('poor');

      clearConnectedSleepContext();
      expect(loadConnectedSleepContext(now)).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
      Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
    }
  });

  it('does not trust a syntactically fresh cache that merely survived storage without a live integrity pass', () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
    try {
      const now = new Date('2026-09-03T12:00:00Z');
      clearConnectedSleepContext();
      memory.setItem('human-health:connected-sleep-context', JSON.stringify({ observedAt: '2026-09-03T11:00:00Z', sourceId: 'watch', sourceName: 'Watch', input: { sleepHours: 8, sleep: 'good' } }));
      expect(loadConnectedSleepContext(now)).toBeNull();
    } finally {
      clearConnectedSleepContext();
      Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
      Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
    }
  });

  it('can combine a live trusted summary directly without depending on persisted cache trust', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    const sleepAt = new Date('2026-09-03T06:00:00Z');
    const observation = makeObservation('sleep-duration', 480, { sourceId: 'sleep', startTime: '2026-09-02T22:00:00Z', endTime: sleepAt.toISOString(), recordedAt: sleepAt.toISOString() });
    const source = makeSource('sleep', { displayName: 'Watch sleep', supportedMetrics: ['sleep-duration'], grantedMetrics: ['sleep-duration'], lastSuccessAt: sleepAt.toISOString() });
    const summary = summarizeConnectedHealth([observation], [source], defaultConnectedHealthPreferences, now);
    const manual = [{ recordedAt: '2026-09-03T11:30:00Z', input: { stress: 'high' as const }, source: 'manual' as const }];

    const merged = mergeTrustedConnectedSleepReadiness(manual, summary, true, now);
    expect(merged.at(-1)?.source).toBe('connected-sleep');
    expect(merged.at(-1)?.input).toMatchObject({ sleepHours: 8, sleep: 'good', stress: 'high' });

    const manualSleep = [{ recordedAt: '2026-09-03T11:30:00Z', input: { sleepHours: 5, sleep: 'poor' as const }, source: 'manual' as const }];
    expect(mergeTrustedConnectedSleepReadiness(manualSleep, summary, true, now)).toEqual(manualSleep);
  });

  it('drops stale connected sleep context', () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
    try {
      clearConnectedSleepContext();
      memory.setItem('human-health:connected-sleep-context', JSON.stringify({ observedAt: '2020-01-01T00:00:00Z', sourceId: 'old', sourceName: 'Old watch', input: { sleepHours: 8, sleep: 'good' } }));
      expect(loadConnectedSleepContext(new Date('2026-09-03T12:00:00Z'))).toBeNull();
    } finally {
      clearConnectedSleepContext();
      Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
      Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
    }
  });
});
