import { describe, expect, it } from 'vitest';
import { completeReminder, normalizePreventiveRecord, normalizePreventiveReminder, reminderState } from './preventive';

const reminder = { id: 'r1', title: 'Follow up', dueOn: '2026-10-01', category: 'checkup' as const, provider: 'Clinic A', source: 'clinician-provided' as const, enabled: true, createdAt: '2026-09-01T12:00:00Z' };

describe('preventive reminders', () => {
  it('uses entered dates rather than inventing clinical intervals', () => {
    expect(reminderState(reminder, new Date('2026-09-20T12:00:00Z'))).toBe('due-soon');
    expect(reminderState(reminder, new Date('2026-10-02T12:00:00Z'))).toBe('overdue');
  });

  it('only repeats when an explicit repeat interval exists and preserves provenance', () => {
    expect(completeReminder(reminder, new Date('2026-10-01T12:00:00Z')).nextReminder).toBeNull();
    const repeated = completeReminder({ ...reminder, repeatMonths: 6 }, new Date('2026-10-01T12:00:00Z'));
    expect(repeated.record.provider).toBe('Clinic A');
    expect(repeated.record.source).toBe('clinician-provided');
    expect(repeated.nextReminder?.dueOn).toBe('2027-04-01');
  });

  it('clamps month-end recurrences instead of rolling into the following month', () => {
    const repeated = completeReminder({ ...reminder, repeatMonths: 1 }, new Date('2027-01-31T12:00:00Z'));
    expect(repeated.nextReminder?.dueOn).toBe('2027-02-28');
  });

  it('rejects invalid reminder dates, repeat intervals, enabled state, and impossible record dates', () => {
    expect(() => normalizePreventiveReminder({ ...reminder, dueOn: 'not-a-date' })).toThrow();
    expect(() => normalizePreventiveReminder({ ...reminder, dueOn: '2026-02-31' })).toThrow();
    expect(() => normalizePreventiveReminder({ ...reminder, repeatMonths: Number.NaN })).toThrow();
    expect(() => normalizePreventiveReminder({ ...reminder, repeatMonths: 1.5 })).toThrow('repeat interval');
    expect(() => normalizePreventiveReminder({ ...reminder, enabled: 'false' as unknown as boolean })).toThrow('enabled state');
    expect(() => normalizePreventiveRecord({ id: 'bad', title: 'Bad record', category: 'other', occurredAt: '2026-02-31T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z' })).toThrow('dates are invalid');
  });

  it('fails closed on malformed optional text instead of coercing archive values', () => {
    expect(() => normalizePreventiveRecord({ id: 'bad', title: 'Bad record', category: 'other', occurredAt: '2026-09-01T12:00:00Z', source: 'manual', createdAt: '2026-09-01T12:00:00Z', provider: 42 as unknown as string })).toThrow('provider');
    expect(normalizePreventiveReminder({ ...reminder, note: '' }).note).toBeUndefined();
  });
});
