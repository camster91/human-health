import { normalizePreventiveRecord, normalizePreventiveReminder } from './preventive';
import type { PreventiveRecord, PreventiveReminder } from './types';

const KEY = 'human-health:platform:v1';
export type PlatformLocalData = { schemaVersion: 1; records: PreventiveRecord[]; reminders: PreventiveReminder[] };
const emptyData: PlatformLocalData = { schemaVersion: 1, records: [], reminders: [] };

function read(): PlatformLocalData {
  if (typeof window === 'undefined') return emptyData;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<PlatformLocalData> | null;
    if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.records) || !Array.isArray(parsed.reminders)) return emptyData;
    return {
      schemaVersion: 1,
      records: parsed.records.map(normalizePreventiveRecord),
      reminders: parsed.reminders.map(normalizePreventiveReminder),
    };
  } catch { return emptyData; }
}
function write(value: PlatformLocalData) {
  if (typeof window === 'undefined') return false;
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}

export const platformStore = {
  load: read,
  save(value: PlatformLocalData) { return write({ schemaVersion: 1, records: value.records.map(normalizePreventiveRecord), reminders: value.reminders.map(normalizePreventiveReminder) }); },
  addRecord(record: PreventiveRecord) { const current = read(); const next = { ...current, records: [...current.records, normalizePreventiveRecord(record)] }; if (!write(next)) throw new Error('Preventive record could not be saved locally.'); return next; },
  addReminder(reminder: PreventiveReminder) { const current = read(); const next = { ...current, reminders: [...current.reminders, normalizePreventiveReminder(reminder)] }; if (!write(next)) throw new Error('Preventive reminder could not be saved locally.'); return next; },
  removeRecord(id: string) { const current = read(); const next = { ...current, records: current.records.filter(item => item.id !== id) }; if (!write(next)) throw new Error('Preventive record could not be deleted locally.'); return next; },
  removeReminder(id: string) { const current = read(); const next = { ...current, reminders: current.reminders.filter(item => item.id !== id) }; if (!write(next)) throw new Error('Preventive reminder could not be deleted locally.'); return next; },
  clear() { if (typeof window === 'undefined') return true; try { localStorage.removeItem(KEY); return true; } catch { return false; } },
  exportData() { return read(); },
};
