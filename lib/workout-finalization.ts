import { HistoryEntry, Workout } from './domain';
import { ActivityDose } from './whole-person';

export function historyWorkoutKey(entry: HistoryEntry) {
  return entry.workoutId || (entry.startedAt ? `${entry.session}:${entry.startedAt}` : null);
}

export function activityWorkoutKey(dose: ActivityDose) {
  return dose.workoutId ? `${dose.workoutId}:${dose.domain}:${dose.sessionId || ''}` : null;
}

export function deduplicateHistory(history: HistoryEntry[]) {
  const seen = new Map<string, number>();
  const result: HistoryEntry[] = [];
  for (const entry of history) {
    const key = historyWorkoutKey(entry);
    if (!key) { result.push(entry); continue; }
    const existing = seen.get(key);
    if (existing === undefined) {
      seen.set(key, result.length);
      result.push(entry);
    } else {
      result[existing] = entry;
    }
  }
  return result;
}

export function deduplicateWorkoutActivity(activity: ActivityDose[]) {
  const seen = new Map<string, number>();
  const result: ActivityDose[] = [];
  for (const dose of activity) {
    const key = activityWorkoutKey(dose);
    if (!key) { result.push(dose); continue; }
    const existing = seen.get(key);
    if (existing === undefined) {
      seen.set(key, result.length);
      result.push(dose);
    } else {
      result[existing] = dose;
    }
  }
  return result;
}

export function upsertHistoryEntry(history: HistoryEntry[], entry: HistoryEntry) {
  return deduplicateHistory([...history, entry]);
}

export function replaceWorkoutActivity(activity: ActivityDose[], workoutId: string | undefined, doses: ActivityDose[]) {
  if (!workoutId) return [...activity, ...doses];
  return deduplicateWorkoutActivity([...activity.filter(item => item.workoutId !== workoutId), ...doses]);
}

export function activeWorkoutWasFinalized(active: Workout | null, history: HistoryEntry[]) {
  if (!active) return false;
  return history.some(entry => entry.workoutId === active.id || (!entry.workoutId && entry.session === active.session && entry.startedAt === active.startedAt));
}
