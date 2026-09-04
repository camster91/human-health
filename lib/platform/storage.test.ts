import { describe, expect, it } from 'vitest';
import { platformStore, validatePlatformData } from './storage';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

function withStorage(storage: unknown, run: () => void) {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  try { run(); }
  finally {
    Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
  }
}

function withMemoryStorage(run: (memory: MemoryStorage) => void) {
  const memory = new MemoryStorage();
  withStorage(memory, () => run(memory));
}

describe('Phase 5 local platform storage', () => {
  it('persists and deletes preventive records/reminders locally', () => withMemoryStorage(() => {
    platformStore.clear();
    const recordData = platformStore.addRecord({ id: 'r1', title: 'Dental cleaning', category: 'dental', occurredAt: '2026-09-01T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z' });
    expect(recordData.records).toHaveLength(1);
    const reminderData = platformStore.addReminder({ id: 'm1', title: 'Follow-up', category: 'checkup', dueOn: '2026-10-01', provider: 'Clinic', source: 'clinician-provided', enabled: true, createdAt: '2026-09-01T12:00:00Z' });
    expect(reminderData.reminders).toHaveLength(1);
    expect(platformStore.removeRecord('r1').records).toHaveLength(0);
    expect(platformStore.removeReminder('m1').reminders).toHaveLength(0);
  }));

  it('completes a reminder atomically and preserves clinician provenance', () => withMemoryStorage(() => {
    platformStore.clear();
    platformStore.addReminder({ id: 'm1', title: 'Follow-up', category: 'checkup', dueOn: '2026-10-01', repeatMonths: 6, provider: 'Clinic A', source: 'clinician-provided', enabled: true, createdAt: '2026-09-01T12:00:00Z' });
    const next = platformStore.completeReminder('m1', new Date('2026-10-01T12:00:00Z'));
    expect(next.records).toHaveLength(1);
    expect(next.records[0].provider).toBe('Clinic A');
    expect(next.records[0].source).toBe('clinician-provided');
    expect(next.reminders).toHaveLength(1);
    expect(next.reminders[0].dueOn).toBe('2027-04-01');
  }));

  it('supports strict replace/merge archive import and current local values win id conflicts', () => withMemoryStorage(() => {
    platformStore.clear();
    platformStore.addRecord({ id: 'same', title: 'Current title', category: 'other', occurredAt: '2026-09-01T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z' });
    const incoming = { schemaVersion: 1 as const, records: [{ id: 'same', title: 'Imported title', category: 'other' as const, occurredAt: '2026-08-01T12:00:00Z', source: 'manual' as const, createdAt: '2026-08-01T12:00:00Z' }], reminders: [] };
    expect(platformStore.importData(incoming, 'merge').records[0].title).toBe('Current title');
    expect(platformStore.importData(incoming, 'replace').records[0].title).toBe('Imported title');
  }));

  it('returns a safe empty snapshot and exposes an error when storage access is blocked', () => {
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    withStorage(blocked, () => {
      expect(platformStore.load()).toEqual({ schemaVersion: 1, records: [], reminders: [] });
      expect(platformStore.getMutationError()).toContain('storage is unavailable');
    });
  });

  it('rejects malformed archives instead of coercing them', () => {
    expect(() => validatePlatformData({ schemaVersion: 2, records: [], reminders: [] })).toThrow('Unsupported platform archive version');
    expect(() => validatePlatformData({ schemaVersion: 1, records: [{ id: 'bad' }], reminders: [] })).toThrow();
  });
});
