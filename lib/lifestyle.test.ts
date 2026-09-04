import { describe, expect, it } from 'vitest';
import {
  createLifestyleRecord,
  normalizeHealthContext,
  normalizeLifestylePreferences,
  pruneByRetention,
} from './lifestyle';

describe('lifestyle model', () => {
  it('normalizes consent, targets, retention, and detailed tracking safely', () => {
    const value = normalizeLifestylePreferences({
      consent: { sleep: false, movement: true } as never,
      hydrationTargetMl: 99_999,
      produceTargetServings: -1,
      retainDays: 2,
      detailedNutritionEnabled: true,
      glucoseContextEnabled: true,
    });
    expect(value.consent.sleep).toBe(false);
    expect(value.consent.movement).toBe(true);
    expect(value.consent.nutrition).toBe(true);
    expect(value.hydrationTargetMl).toBe(10_000);
    expect(value.produceTargetServings).toBe(1);
    expect(value.retainDays).toBe(7);
    expect(value.detailedNutritionEnabled).toBe(true);
  });

  it('deduplicates and trims optional health context', () => {
    const context = normalizeHealthContext({
      conditions: [' Type 1 diabetes ', 'Type 1 diabetes', ''],
      medications: ['Insulin'],
      clinicianRestrictions: ['Avoid high impact', 'Avoid high impact'],
      emergencyNote: 'x'.repeat(2_000),
    });
    expect(context.conditions).toEqual(['Type 1 diabetes']);
    expect(context.clinicianRestrictions).toEqual(['Avoid high impact']);
    expect(context.emergencyNote).toHaveLength(1_000);
  });

  it('creates versioned records without adding inferred health facts', () => {
    const record = createLifestyleRecord('2026-09-03', { durationMinutes: 420 }, 'daily-sleep-2026-09-03');
    expect(record.id).toBe('daily-sleep-2026-09-03');
    expect(record.schemaVersion).toBe(1);
    expect(record.source).toBe('manual');
    expect('quality' in record).toBe(false);
  });

  it('applies user-selected retention without altering retained records', () => {
    const items = [
      { recordedAt: '2026-06-01T12:00:00Z', value: 1 },
      { recordedAt: '2026-09-01T12:00:00Z', value: 2 },
    ];
    expect(pruneByRetention(items, 30, new Date('2026-09-03T12:00:00Z'))).toEqual([items[1]]);
    expect(pruneByRetention(items, null)).toEqual(items);
  });
});
