import type { PreventiveRecord, PreventiveRecordCategory, PreventiveReminder, ReminderState } from './types';

const categories: PreventiveRecordCategory[] = ['checkup', 'screening', 'vaccination', 'dental', 'vision', 'lab', 'other'];

function validIso(value: string) {
  return Number.isFinite(Date.parse(value));
}

function validYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function reminderState(reminder: PreventiveReminder, now = new Date(), dueSoonDays = 30): ReminderState {
  if (!reminder.enabled) return 'disabled';
  if (!validYmd(reminder.dueOn)) return 'invalid';
  const due = Date.parse(`${reminder.dueOn}T23:59:59`);
  const days = (due - now.getTime()) / 86_400_000;
  if (days < 0) return 'overdue';
  if (days <= dueSoonDays) return 'due-soon';
  return 'scheduled';
}

export function normalizePreventiveRecord(value: PreventiveRecord): PreventiveRecord {
  if (!value.id || !value.title.trim()) throw new Error('Preventive record requires an id and title.');
  if (!categories.includes(value.category)) throw new Error('Preventive record category is unsupported.');
  if (!validIso(value.occurredAt) || !validIso(value.createdAt)) throw new Error('Preventive record dates are invalid.');
  if (!['manual', 'clinician-provided'].includes(value.source)) throw new Error('Preventive record source is invalid.');
  return { ...value, title: value.title.trim(), provider: value.provider?.trim() || undefined, note: value.note?.trim() || undefined };
}

export function normalizePreventiveReminder(value: PreventiveReminder): PreventiveReminder {
  if (!value.id || !value.title.trim()) throw new Error('Preventive reminder requires an id and title.');
  if (!categories.includes(value.category)) throw new Error('Preventive reminder category is unsupported.');
  if (!validYmd(value.dueOn)) throw new Error('Preventive reminder due date is invalid.');
  if (!validIso(value.createdAt)) throw new Error('Preventive reminder created date is invalid.');
  if (!['manual', 'clinician-provided'].includes(value.source)) throw new Error('Preventive reminder source is invalid.');
  if (value.repeatMonths !== undefined && (!Number.isFinite(value.repeatMonths) || value.repeatMonths <= 0)) throw new Error('Preventive reminder repeat interval is invalid.');
  const repeatMonths = value.repeatMonths === undefined ? undefined : Math.max(1, Math.min(120, Math.floor(value.repeatMonths)));
  return { ...value, title: value.title.trim(), note: value.note?.trim() || undefined, repeatMonths };
}

export function completeReminder(reminder: PreventiveReminder, occurredAt = new Date()): { record: PreventiveRecord; nextReminder: PreventiveReminder | null } {
  const normalized = normalizePreventiveReminder(reminder);
  const record: PreventiveRecord = normalizePreventiveRecord({
    id: crypto.randomUUID(),
    category: normalized.category,
    title: normalized.title,
    occurredAt: occurredAt.toISOString(),
    note: normalized.note,
    source: normalized.source,
    createdAt: new Date().toISOString(),
  });
  if (!normalized.repeatMonths) return { record, nextReminder: null };
  const next = new Date(occurredAt);
  next.setMonth(next.getMonth() + normalized.repeatMonths);
  return {
    record,
    nextReminder: { ...normalized, id: crypto.randomUUID(), dueOn: next.toISOString().slice(0, 10), createdAt: new Date().toISOString() },
  };
}

export const preventiveSafetyNote = 'Human Health does not invent screening, vaccination, laboratory, or follow-up intervals. Preventive reminders must be entered by the user or reflect guidance they received from a qualified clinician or public-health source.';
