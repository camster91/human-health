import { completeReminder as createReminderCompletion, normalizePreventiveRecord, normalizePreventiveReminder } from './preventive';
import type { PreventiveRecord, PreventiveReminder } from './types';

const KEY = 'human-health:platform:v1';
export type PlatformLocalData = { schemaVersion: 1; records: PreventiveRecord[]; reminders: PreventiveReminder[] };

let mutationFailure: string | null = null;

export function createEmptyPlatformData(): PlatformLocalData { return { schemaVersion: 1, records: [], reminders: [] }; }
function dedupeById<T extends { id: string }>(items: T[]) { const values = new Map<string, T>(); items.forEach(item => values.set(item.id, item)); return [...values.values()]; }

export function validatePlatformData(value: unknown): PlatformLocalData {
  if (!value || typeof value !== 'object') throw new Error('Platform archive is not an object.');
  const candidate = value as Partial<PlatformLocalData>;
  if (candidate.schemaVersion !== 1) throw new Error('Unsupported platform archive version.');
  if (!Array.isArray(candidate.records) || !Array.isArray(candidate.reminders)) throw new Error('Platform archive records/reminders are invalid.');
  return { schemaVersion: 1, records: dedupeById(candidate.records.map(normalizePreventiveRecord)), reminders: dedupeById(candidate.reminders.map(normalizePreventiveReminder)) };
}

function read(): PlatformLocalData {
  if (typeof window === 'undefined') return createEmptyPlatformData();
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); }
  catch { mutationFailure = 'Browser storage is unavailable, so Phase 5 preventive/platform data could not be read.'; return createEmptyPlatformData(); }
  if (!raw) { mutationFailure = null; return createEmptyPlatformData(); }
  try {
    const parsed = JSON.parse(raw) as Partial<PlatformLocalData>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.records) || !Array.isArray(parsed.reminders)) throw new Error('Unsupported or malformed platform storage.');
    const records: PreventiveRecord[] = []; const reminders: PreventiveReminder[] = []; let skipped = 0;
    for (const record of parsed.records) { try { records.push(normalizePreventiveRecord(record)); } catch { skipped++; } }
    for (const reminder of parsed.reminders) { try { reminders.push(normalizePreventiveReminder(reminder)); } catch { skipped++; } }
    mutationFailure = skipped ? `${skipped} invalid preventive entr${skipped === 1 ? 'y was' : 'ies were'} detected. Mutations are blocked until the Phase 5 data is replaced or deleted so unreadable records are not silently lost.` : null;
    return { schemaVersion: 1, records: dedupeById(records), reminders: dedupeById(reminders) };
  } catch {
    mutationFailure = 'Saved Phase 5 platform data was invalid. Mutations are blocked until it is replaced or deleted.';
    return createEmptyPlatformData();
  }
}

function readForMutation() {
  const current = read();
  if (mutationFailure) throw new Error(mutationFailure);
  return current;
}

function write(value: PlatformLocalData) {
  if (typeof window === 'undefined') return false;
  try { localStorage.setItem(KEY, JSON.stringify(validatePlatformData(value))); mutationFailure = null; return true; }
  catch (error) { mutationFailure = error instanceof Error ? error.message : 'Phase 5 platform data could not be saved locally.'; return false; }
}

function merged(current: PlatformLocalData, incoming: PlatformLocalData): PlatformLocalData {
  const records = new Map(incoming.records.map(item => [item.id, item])); const reminders = new Map(incoming.reminders.map(item => [item.id, item]));
  current.records.forEach(item => records.set(item.id, item)); current.reminders.forEach(item => reminders.set(item.id, item));
  return { schemaVersion: 1, records: [...records.values()], reminders: [...reminders.values()] };
}

export const platformStore = {
  load: read,
  getMutationError() { return mutationFailure; },
  clearMutationError() { mutationFailure = null; },
  save(value: PlatformLocalData) { return write(value); },

  addRecord(record: PreventiveRecord) {
    const current = readForMutation(); const normalized = normalizePreventiveRecord(record); const next = { ...current, records: dedupeById([...current.records, normalized]) };
    if (!write(next)) throw new Error(mutationFailure || 'Preventive record could not be saved locally.'); return next;
  },
  addReminder(reminder: PreventiveReminder) {
    const current = readForMutation(); const normalized = normalizePreventiveReminder(reminder); const next = { ...current, reminders: dedupeById([...current.reminders, normalized]) };
    if (!write(next)) throw new Error(mutationFailure || 'Preventive reminder could not be saved locally.'); return next;
  },
  completeReminder(id: string, occurredAt = new Date()) {
    const current = readForMutation(); const reminder = current.reminders.find(item => item.id === id); if (!reminder) throw new Error('Preventive reminder no longer exists.');
    const completion = createReminderCompletion(reminder, occurredAt);
    const next: PlatformLocalData = { schemaVersion: 1, records: dedupeById([...current.records, completion.record]), reminders: dedupeById([...current.reminders.filter(item => item.id !== id), ...(completion.nextReminder ? [completion.nextReminder] : [])]) };
    if (!write(next)) throw new Error(mutationFailure || 'Preventive reminder completion could not be saved locally.'); return next;
  },
  setReminderEnabled(id: string, enabled: boolean) {
    const current = readForMutation();
    if (!current.reminders.some(item => item.id === id)) throw new Error('Preventive reminder no longer exists.');
    const next = { ...current, reminders: current.reminders.map(item => item.id === id ? { ...item, enabled } : item) };
    if (!write(next)) throw new Error(mutationFailure || 'Preventive reminder state could not be saved locally.'); return next;
  },
  removeRecord(id: string) {
    const current = readForMutation(); const next = { ...current, records: current.records.filter(item => item.id !== id) };
    if (!write(next)) throw new Error(mutationFailure || 'Preventive record could not be deleted locally.'); return next;
  },
  removeReminder(id: string) {
    const current = readForMutation(); const next = { ...current, reminders: current.reminders.filter(item => item.id !== id) };
    if (!write(next)) throw new Error(mutationFailure || 'Preventive reminder could not be deleted locally.'); return next;
  },
  importData(value: unknown, mode: 'merge' | 'replace' = 'merge') {
    const incoming = validatePlatformData(value); const next = mode === 'replace' ? incoming : merged(readForMutation(), incoming);
    if (!write(next)) throw new Error(mutationFailure || 'Platform archive could not be saved locally.'); return next;
  },
  clear() {
    if (typeof window === 'undefined') return true;
    try { localStorage.removeItem(KEY); mutationFailure = null; return true; }
    catch { mutationFailure = 'Phase 5 platform data could not be deleted locally.'; return false; }
  },
  exportData() { return read(); },
};
