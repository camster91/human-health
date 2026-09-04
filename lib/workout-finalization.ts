import { HistoryEntry, Workout } from './domain';
import { ActivityDose } from './whole-person';

export function upsertHistoryEntry(history: HistoryEntry[], entry: HistoryEntry) {
  if (!entry.workoutId) return [...history, entry];
  const index = history.findIndex(item => item.workoutId === entry.workoutId);
  if (index < 0) return [...history, entry];
  const next = [...history];
  next[index] = entry;
  return next;
}

export function replaceWorkoutActivity(activity: ActivityDose[], workoutId: string | undefined, doses: ActivityDose[]) {
  if (!workoutId) return [...activity, ...doses];
  return [...activity.filter(item => item.workoutId !== workoutId), ...doses];
}

export function activeWorkoutWasFinalized(active: Workout | null, history: HistoryEntry[]) {
  return Boolean(active && history.some(entry => entry.workoutId === active.id));
}
