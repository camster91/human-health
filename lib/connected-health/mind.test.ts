import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  applyMindCheckRetention,
  createMindCheck,
  hasMindCheckToday,
  mindCheckSummary,
  recentMindChecks,
  validateMindCheck,
  type MindCheck,
} from './mind';

describe('createMindCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('creates basic check without note', () => {
    const now = new Date('2026-09-07T10:00:00Z');
    const check = createMindCheck('calm', undefined, now);
    
    expect(check.level).toBe('calm');
    expect(check.note).toBeUndefined();
    expect(check.recordedAt).toBe('2026-09-07T10:00:00.000Z');
  });
  
  test('creates check with note', () => {
    const now = new Date('2026-09-07T10:00:00Z');
    const check = createMindCheck('stressed', 'Deadline pressure', now);
    
    expect(check.level).toBe('stressed');
    expect(check.note).toBe('Deadline pressure');
  });
  
  test('trims whitespace from note', () => {
    const check = createMindCheck('okay', '  spaced out  ');
    expect(check.note).toBe('spaced out');
  });
  
  test('removes empty note', () => {
    const check = createMindCheck('overwhelmed', '   ');
    expect(check.note).toBeUndefined();
  });
  
  test('truncates long note', () => {
    const longNote = 'a'.repeat(400);
    const check = createMindCheck('calm', longNote);
    expect(check.note).toBeUndefined(); // Over 300 chars
  });
  
  test('accepts note at max length', () => {
    const maxNote = 'a'.repeat(300);
    const check = createMindCheck('calm', maxNote);
    expect(check.note).toBe(maxNote);
  });
});

describe('recentMindChecks', () => {
  const now = new Date('2026-09-07T12:00:00Z');
  const checks: MindCheck[] = [
    createMindCheck('calm', undefined, new Date('2026-09-07T10:00:00Z')),
    createMindCheck('okay', undefined, new Date('2026-09-06T10:00:00Z')),
    createMindCheck('stressed', undefined, new Date('2026-09-05T10:00:00Z')),
    createMindCheck('overwhelmed', undefined, new Date('2026-08-30T10:00:00Z')), // 8 days ago
  ];
  
  test('returns checks within 7-day window', () => {
    const recent = recentMindChecks(checks, { days: 7, now });
    expect(recent).toHaveLength(3);
    expect(recent.map(c => c.level)).toEqual(['calm', 'okay', 'stressed']);
  });
  
  test('returns all checks with larger window', () => {
    const recent = recentMindChecks(checks, { days: 10, now });
    expect(recent).toHaveLength(4);
  });
  
  test('returns empty array when no checks in window', () => {
    const recent = recentMindChecks(checks, { days: 1, now });
    expect(recent).toHaveLength(1); // Only today
  });
  
  test('excludes future checks beyond tolerance', () => {
    const futureChecks = [
      ...checks,
      createMindCheck('calm', undefined, new Date('2026-09-08T00:00:00Z')), // Tomorrow
    ];
    const recent = recentMindChecks(futureChecks, { days: 7, now });
    expect(recent).toHaveLength(3); // Future check excluded
  });
});

describe('hasMindCheckToday', () => {
  const now = new Date('2026-09-07T14:30:00Z');
  
  test('returns true when check exists today', () => {
    const checks = [
      createMindCheck('calm', undefined, new Date('2026-09-07T10:00:00Z')),
    ];
    expect(hasMindCheckToday(checks, now)).toBe(true);
  });
  
  test('returns false when no check today', () => {
    const checks = [
      createMindCheck('calm', undefined, new Date('2026-09-06T10:00:00Z')),
    ];
    expect(hasMindCheckToday(checks, now)).toBe(false);
  });
  
  test('returns false for empty array', () => {
    expect(hasMindCheckToday([], now)).toBe(false);
  });
  
  test('handles multiple checks on same day', () => {
    const checks = [
      createMindCheck('stressed', undefined, new Date('2026-09-07T09:00:00Z')),
      createMindCheck('calm', undefined, new Date('2026-09-07T18:00:00Z')),
    ];
    expect(hasMindCheckToday(checks, now)).toBe(true);
  });
});

describe('mindCheckSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns no-data message for empty array', () => {
    const summary = mindCheckSummary([]);
    expect(summary).toBe('No check-ins yet.');
  });
  
  test('returns calm-focused message for mostly calm days', () => {
    const checks = [
      createMindCheck('calm', undefined, new Date('2026-09-07T10:00:00Z')),
      createMindCheck('calm', undefined, new Date('2026-09-06T10:00:00Z')),
      createMindCheck('okay', undefined, new Date('2026-09-05T10:00:00Z')),
      createMindCheck('calm', undefined, new Date('2026-09-04T10:00:00Z')),
    ];
    const summary = mindCheckSummary(checks, 7);
    expect(summary).toContain('4 check-ins');
    expect(summary).toContain('mostly calm');
  });
  
  test('returns overwhelmed-support message for difficult week', () => {
    const checks = [
      createMindCheck('overwhelmed', undefined, new Date('2026-09-07T10:00:00Z')),
      createMindCheck('overwhelmed', undefined, new Date('2026-09-06T10:00:00Z')),
      createMindCheck('stressed', undefined, new Date('2026-09-05T10:00:00Z')),
      createMindCheck('overwhelmed', undefined, new Date('2026-09-04T10:00:00Z')),
    ];
    const summary = mindCheckSummary(checks, 7);
    expect(summary).toContain('4 check-ins');
    expect(summary).toContain('more overwhelmed days than calm');
    expect(summary).toContain('rest counts');
  });
  
  test('returns neutral message for mixed week', () => {
    const checks = [
      createMindCheck('okay', undefined, new Date('2026-09-07T10:00:00Z')),
      createMindCheck('stressed', undefined, new Date('2026-09-06T10:00:00Z')),
      createMindCheck('calm', undefined, new Date('2026-09-05T10:00:00Z')),
    ];
    const summary = mindCheckSummary(checks, 7);
    expect(summary).toBe('3 check-ins this week.');
  });
});

describe('applyMindCheckRetention', () => {
  const now = new Date('2026-09-07T12:00:00Z');
  
  test('retains checks within retention window', () => {
    const checks = [
      createMindCheck('calm', undefined, new Date('2026-09-07T10:00:00Z')),
      createMindCheck('okay', undefined, new Date('2026-07-01T10:00:00Z')), // 68 days ago
      createMindCheck('stressed', undefined, new Date('2026-03-01T10:00:00Z')), // ~190 days ago
    ];
    const retained = applyMindCheckRetention(checks, 180, now);
    expect(retained).toHaveLength(2);
    expect(retained.map(c => c.level)).toEqual(['calm', 'okay']);
  });
  
  test('retains all checks when all are recent', () => {
    const checks = [
      createMindCheck('calm', undefined, new Date('2026-09-07T10:00:00Z')),
      createMindCheck('okay', undefined, new Date('2026-09-06T10:00:00Z')),
    ];
    const retained = applyMindCheckRetention(checks, 180, now);
    expect(retained).toHaveLength(2);
  });
  
  test('removes all checks when all are old', () => {
    const checks = [
      createMindCheck('calm', undefined, new Date('2026-01-01T10:00:00Z')),
    ];
    const retained = applyMindCheckRetention(checks, 180, now);
    expect(retained).toHaveLength(0);
  });
});

describe('validateMindCheck', () => {
  test('validates correct mind check', () => {
    const check: MindCheck = {
      level: 'calm',
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateMindCheck(check)).toBe(true);
  });
  
  test('validates check with note', () => {
    const check: MindCheck = {
      level: 'stressed',
      note: 'Big deadline',
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateMindCheck(check)).toBe(true);
  });
  
  test('rejects non-object', () => {
    expect(validateMindCheck('not an object')).toBe(false);
    expect(validateMindCheck(null)).toBe(false);
  });
  
  test('rejects invalid level', () => {
    const check = {
      level: 'invalid',
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateMindCheck(check)).toBe(false);
  });
  
  test('rejects missing recordedAt', () => {
    const check = {
      level: 'calm',
    };
    expect(validateMindCheck(check)).toBe(false);
  });
  
  test('rejects invalid timestamp', () => {
    const check = {
      level: 'calm',
      recordedAt: 'not a date',
    };
    expect(validateMindCheck(check)).toBe(false);
  });
  
  test('rejects invalid note type', () => {
    const check = {
      level: 'calm',
      note: 123,
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateMindCheck(check)).toBe(false);
  });
});
