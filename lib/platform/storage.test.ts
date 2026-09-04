import { describe, expect, it } from 'vitest';
import { platformStore } from './storage';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('Phase 5 local platform storage', () => {
  it('persists and deletes preventive records/reminders locally', () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
    try {
      platformStore.clear();
      const recordData = platformStore.addRecord({ id: 'r1', title: 'Dental cleaning', category: 'dental', occurredAt: '2026-09-01T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z' });
      expect(recordData.records).toHaveLength(1);
      const reminderData = platformStore.addReminder({ id: 'm1', title: 'Follow-up', category: 'checkup', dueOn: '2026-10-01', source: 'clinician-provided', enabled: true, createdAt: '2026-09-01T12:00:00Z' });
      expect(reminderData.reminders).toHaveLength(1);
      expect(platformStore.removeRecord('r1').records).toHaveLength(0);
      expect(platformStore.removeReminder('m1').reminders).toHaveLength(0);
    } finally {
      Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
      Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
    }
  });
});
