import type { PreventiveRecord, PreventiveRecordCategory, PreventiveReminder, ReminderState } from './types';

const categories: PreventiveRecordCategory[] = ['checkup', 'screening', 'vaccination', 'dental', 'vision', 'lab', 'other'];
const sources = ['manual', 'clinician-provided'] as const;
const FUTURE_TOLERANCE_MS = 5 * 60_000;

function validYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validIso(value: string) {
  return typeof value === 'string' && value.length >= 10 && validYmd(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}

function objectValue(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} is invalid.`);
  return value.trim();
}

function optionalString(value: unknown, label: string, max = 10_000) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} is invalid.`);
  return value.trim() || undefined;
}

function materiallyFuture(value: string, now: Date) {
  return Date.parse(value) > now.getTime() + FUTURE_TOLERANCE_MS;
}

function addUtcMonthsClamped(date: Date, months: number) {
  const originalDay = date.getUTCDate();
  const firstOfTarget = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12));
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0, 12)).getUTCDate();
  return new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(originalDay, lastDay), 12));
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

export function normalizePreventiveRecord(value: PreventiveRecord, now = new Date()): PreventiveRecord {
  const item = objectValue(value, 'Preventive record');
  const id = requiredString(item.id, 'Preventive record id', 500);
  const title = requiredString(item.title, 'Preventive record title', 1000);
  if (!categories.includes(item.category as PreventiveRecordCategory)) throw new Error('Preventive record category is unsupported.');
  if (typeof item.occurredAt !== 'string' || typeof item.createdAt !== 'string' || !validIso(item.occurredAt) || !validIso(item.createdAt)) throw new Error('Preventive record dates are invalid.');
  if (materiallyFuture(item.occurredAt, now) || materiallyFuture(item.createdAt, now)) throw new Error('Preventive record dates cannot be materially in the future.');
  if (!sources.includes(item.source as typeof sources[number])) throw new Error('Preventive record source is invalid.');
  return {
    id,
    category: item.category as PreventiveRecordCategory,
    title,
    occurredAt: item.occurredAt,
    provider: optionalString(item.provider, 'Preventive record provider'),
    note: optionalString(item.note, 'Preventive record note'),
    source: item.source as PreventiveRecord['source'],
    createdAt: item.createdAt,
  };
}

export function normalizePreventiveReminder(value: PreventiveReminder, now = new Date()): PreventiveReminder {
  const item = objectValue(value, 'Preventive reminder');
  const id = requiredString(item.id, 'Preventive reminder id', 500);
  const title = requiredString(item.title, 'Preventive reminder title', 1000);
  if (!categories.includes(item.category as PreventiveRecordCategory)) throw new Error('Preventive reminder category is unsupported.');
  if (typeof item.dueOn !== 'string' || !validYmd(item.dueOn)) throw new Error('Preventive reminder due date is invalid.');
  if (typeof item.createdAt !== 'string' || !validIso(item.createdAt)) throw new Error('Preventive reminder created date is invalid.');
  if (materiallyFuture(item.createdAt, now)) throw new Error('Preventive reminder created date cannot be materially in the future.');
  if (!sources.includes(item.source as typeof sources[number])) throw new Error('Preventive reminder source is invalid.');
  if (typeof item.enabled !== 'boolean') throw new Error('Preventive reminder enabled state is invalid.');
  if (item.repeatMonths !== undefined && (typeof item.repeatMonths !== 'number' || !Number.isFinite(item.repeatMonths) || !Number.isInteger(item.repeatMonths) || item.repeatMonths <= 0 || item.repeatMonths > 120)) throw new Error('Preventive reminder repeat interval is invalid.');
  return {
    id,
    title,
    dueOn: item.dueOn,
    category: item.category as PreventiveRecordCategory,
    repeatMonths: item.repeatMonths as number | undefined,
    provider: optionalString(item.provider, 'Preventive reminder provider'),
    note: optionalString(item.note, 'Preventive reminder note'),
    source: item.source as PreventiveReminder['source'],
    enabled: item.enabled,
    createdAt: item.createdAt,
  };
}

export function completeReminder(reminder: PreventiveReminder, occurredAt = new Date(), now = new Date()): { record: PreventiveRecord; nextReminder: PreventiveReminder | null } {
  if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw new Error('Preventive completion date is invalid or materially in the future.');
  const normalized = normalizePreventiveReminder(reminder, now);
  const createdAt = now.toISOString();
  const record: PreventiveRecord = normalizePreventiveRecord({
    id: crypto.randomUUID(), category: normalized.category, title: normalized.title,
    occurredAt: occurredAt.toISOString(), provider: normalized.provider, note: normalized.note,
    source: normalized.source, createdAt,
  }, now);
  if (!normalized.repeatMonths) return { record, nextReminder: null };
  const next = addUtcMonthsClamped(occurredAt, normalized.repeatMonths);
  return {
    record,
    nextReminder: { ...normalized, id: crypto.randomUUID(), dueOn: next.toISOString().slice(0, 10), createdAt },
  };
}

export const preventiveSafetyNote = 'Human Health does not invent screening, vaccination, laboratory, or follow-up intervals. Preventive reminders must be entered by the user or reflect guidance they received from a qualified clinician or public-health source.';
