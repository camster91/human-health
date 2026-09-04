import { describe, expect, it } from 'vitest';
import { completeReminder, normalizePreventiveReminder, reminderState } from './preventive';

const reminder = { id: 'r1', title: 'Follow up', dueOn: '2026-10-01', category: 'checkup' as const, source: 'clinician-provided' as const, enabled: true, createdAt: '2026-09-01T12:00:00Z' };

describe('preventive reminders', () => {
  it('uses entered dates rather than inventing clinical intervals', () => {
    expect(reminderState(reminder, new Date('2026-09-20T12:00:00Z'))).toBe('due-soon');
    expect(reminderState(reminder, new Date('2026-10-02T12:00:00Z'))).toBe('overdue');
  });

  it('only repeats when an explicit repeat interval exists', () => {
    expect(completeReminder(reminder, new Date('2026-10-01T12:00:00Z')).nextReminder).toBeNull();
    const repeated = completeReminder({ ...reminder, repeatMonths: 6 }, new Date('2026-10-01T12:00:00Z'));
    expect(repeated.nextReminder?.dueOn).toBe('2027-04-01');
  });

  it('rejects invalid reminder dates', () => {
    expect(() => normalizePreventiveReminder({ ...reminder, dueOn: 'not-a-date' })).toThrow();
  });
});
