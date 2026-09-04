import { describe, expect, it } from 'vitest';
import { completeReminder, normalizePreventiveRecord, normalizePreventiveReminder, reminderState } from './preventive';

const reminder = { id: 'r1', title: 'Follow up', dueOn: '2026-10-01', category: 'checkup' as const, provider: 'Clinic A', source: 'clinician-provided' as const, enabled: true, createdAt: '2026-09-01T12:00:00Z' };

describe('preventive reminders', () => {
  it('uses entered dates rather than inventing clinical intervals', () => {
    expect(reminderState(reminder, new Date('2026-09-20T12:00:00Z'))).toBe('due-soon');
    expect(reminderState(reminder, new Date('2026-10-02T12:00:00Z'))).toBe('overdue');
  });

  it('only repeats when an explicit repeat interval exists and preserves provenance', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(completeReminder(reminder, now, now).nextReminder).toBeNull();
    const repeated = completeReminder({ ...reminder, repeatMonths: 6 }, now, now);
    expect(repeated.record.provider).toBe('Clinic A');
    expect(repeated.record.source).toBe('clinician-provided');
    expect(repeated.nextReminder?.dueOn).toBe('2027-04-01');
  });

  it('clamps month-end recurrences instead of rolling into the following month', () => {
    const now = new Date('2027-01-31T12:00:00Z');
    const repeated = completeReminder({ ...reminder, repeatMonths: 1 }, now, now);
    expect(repeated.nextReminder?.dueOn).toBe('2027-02-28');
  });

  it('rejects invalid reminder dates, repeat intervals, enabled state, and impossible record dates', () => {
    const now = new Date('2026-09-04T12:00:00Z');
    expect(() => normalizePreventiveReminder({ ...reminder, dueOn: 'not-a-date' }, now)).toThrow();
    expect(() => normalizePreventiveReminder({ ...reminder, dueOn: '2026-02-31' }, now)).toThrow();
    expect(() => normalizePreventiveReminder({ ...reminder, repeatMonths: Number.NaN }, now)).toThrow();
    expect(() => normalizePreventiveReminder({ ...reminder, repeatMonths: 1.5 }, now)).toThrow('repeat interval');
    expect(() => normalizePreventiveReminder({ ...reminder, enabled: 'false' as unknown as boolean }, now)).toThrow('enabled state');
    expect(() => normalizePreventiveRecord({ id: 'bad', title: 'Bad record', category: 'other', occurredAt: '2026-02-31T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z' }, now)).toThrow('dates are invalid');
  });

  it('rejects materially future preventive evidence but allows a future due date', () => {
    const now = new Date('2026-09-04T12:00:00Z');
    expect(() => normalizePreventiveRecord({ id: 'future', title: 'Future record', category: 'other', occurredAt: '2026-10-01T12:00:00Z', source: 'manual', createdAt: '2026-09-04T12:00:00Z' }, now)).toThrow(/future/i);
    expect(() => normalizePreventiveReminder({ ...reminder, createdAt: '2026-10-01T12:00:00Z' }, now)).toThrow(/future/i);
    expect(normalizePreventiveReminder(reminder, now).dueOn).toBe('2026-10-01');
    expect(() => completeReminder(reminder, new Date('2026-10-01T12:00:00Z'), now)).toThrow(/future/i);
  });

  it('fails closed on malformed optional text instead of coercing archive values', () => {
    const now = new Date('2026-09-04T12:00:00Z');
    expect(() => normalizePreventiveRecord({ id: 'bad', title: 'Bad record', category: 'other', occurredAt: '2026-09-01T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z', provider: 42 as unknown as string }, now)).toThrow('provider');
    expect(normalizePreventiveReminder({ ...reminder, note: '' }, now).note).toBeUndefined();
  });
});
