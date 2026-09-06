import { describe, expect, test } from 'vitest';
import {
  createFuelCheck,
  recentFuelChecks,
  hasFuelCheckToday,
  latestFuelCheck,
  fuelCheckSummary,
  FuelCheck,
} from './fuel';

describe('fuel tracking', () => {
  test('creates valid fuel check', () => {
    const check = createFuelCheck('ate-well', 'Had a good breakfast', new Date('2026-09-06T08:00:00Z'));
    expect(check.type).toBe('ate-well');
    expect(check.note).toBe('Had a good breakfast');
    expect(check.recordedAt).toBe('2026-09-06T08:00:00.000Z');
  });

  test('rejects invalid fuel check type', () => {
    expect(() => createFuelCheck('invalid' as any)).toThrow('Invalid fuel check type');
  });

  test('rejects oversized notes', () => {
    const longNote = 'x'.repeat(501);
    expect(() => createFuelCheck('ate-well', longNote)).toThrow('Fuel note must be 500 characters or fewer');
  });

  test('allows missing note', () => {
    const check = createFuelCheck('under');
    expect(check.note).toBeUndefined();
  });

  test('trims whitespace from notes', () => {
    const check = createFuelCheck('ate-well', '  some note  ');
    expect(check.note).toBe('some note');
  });

  test('filters recent fuel checks by day range', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-01T08:00:00Z')),
      createFuelCheck('ate-well', undefined, new Date('2026-09-03T08:00:00Z')),
      createFuelCheck('ate-well', undefined, new Date('2026-09-05T08:00:00Z')),
      createFuelCheck('ate-well', undefined, new Date('2026-09-06T08:00:00Z')),
    ];

    const recent = recentFuelChecks(checks, { now, days: 3 });
    expect(recent.checks).toHaveLength(2); // Sept 5 and 6
    expect(recent.daysWithChecks).toBe(2);
  });

  test('counts unique days with checks', () => {
    const now = new Date('2026-09-06T23:59:00Z');
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-06T08:00:00Z')),
      createFuelCheck('over', undefined, new Date('2026-09-06T20:00:00Z')), // same day
      createFuelCheck('ate-well', undefined, new Date('2026-09-05T08:00:00Z')),
    ];

    const recent = recentFuelChecks(checks, { now, days: 7 });
    expect(recent.daysWithChecks).toBe(2); // 2 unique days, not 3 checks
  });

  test('detects fuel check for today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-05T08:00:00Z')),
      createFuelCheck('ate-well', undefined, new Date('2026-09-06T08:00:00Z')),
    ];

    expect(hasFuelCheckToday(checks, now)).toBe(true);
  });

  test('returns false when no check for today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-05T08:00:00Z')),
    ];

    expect(hasFuelCheckToday(checks, now)).toBe(false);
  });

  test('gets latest fuel check', () => {
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-05T08:00:00Z')),
      createFuelCheck('over', undefined, new Date('2026-09-06T20:00:00Z')),
      createFuelCheck('under', undefined, new Date('2026-09-06T08:00:00Z')),
    ];

    const latest = latestFuelCheck(checks);
    expect(latest?.type).toBe('over');
    expect(latest?.recordedAt).toBe('2026-09-06T20:00:00.000Z');
  });

  test('returns null when no checks exist', () => {
    expect(latestFuelCheck([])).toBeNull();
  });

  test('generates summary with no checks', () => {
    const summary = fuelCheckSummary([], 7);
    expect(summary).toContain('No fuel checks');
    expect(summary).toContain('Skip is always allowed');
  });

  test('generates summary with some checks', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-04T08:00:00Z')),
      createFuelCheck('ate-well', undefined, new Date('2026-09-06T08:00:00Z')),
    ];

    const summary = fuelCheckSummary(checks, 7, now);
    expect(summary).toContain('2/7 days');
    expect(summary).toContain('gentle noticing');
  });

  test('respects day boundaries for device-local time', () => {
    const now = new Date('2026-09-06T23:59:00Z');
    const checks: FuelCheck[] = [
      createFuelCheck('ate-well', undefined, new Date('2026-09-06T00:01:00Z')),
      createFuelCheck('ate-well', undefined, new Date('2026-09-06T23:58:00Z')),
    ];

    const recent = recentFuelChecks(checks, { now, days: 1 });
    expect(recent.daysWithChecks).toBe(1); // same device-local day
  });
});
