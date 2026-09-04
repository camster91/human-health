import { HistoryEntry } from './domain';
import { workoutCompletionRatio } from './schedule';
import { ActivityDose, Assessment, ReadinessRecord, activityCountsTowardCardioTarget, cardioEquivalentMinutes, readinessDecision } from './whole-person';

export type ExerciseStrengthTrend = { exerciseId: string; first: number; latest: number; percentChange: number; samples: number };

function estimatedOneRepMax(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function strengthTrends(history: HistoryEntry[]): ExerciseStrengthTrend[] {
  const byExercise = new Map<string, { date: number; value: number }[]>();
  history.filter(entry => (entry.status || 'completed') !== 'abandoned').forEach(entry => entry.exercises.filter(exercise => exercise.priority === 'primary').forEach(exercise => {
    const best = exercise.logs.filter(set => !set.warmup && !set.pain).reduce((max, set) => Math.max(max, estimatedOneRepMax(set.weight, set.reps)), 0);
    if (!best) return;
    const current = byExercise.get(exercise.id) || [];
    current.push({ date: new Date(entry.completedAt).getTime(), value: best });
    byExercise.set(exercise.id, current);
  }));
  return [...byExercise.entries()].flatMap(([exerciseId, values]) => {
    const sorted = values.sort((a, b) => a.date - b.date);
    if (sorted.length < 2 || sorted[0].value <= 0) return [];
    const first = sorted[0].value;
    const latest = sorted.at(-1)!.value;
    return [{ exerciseId, first, latest, percentChange: (latest - first) / first * 100, samples: sorted.length }];
  });
}

export function normalizedStrengthTrend(history: HistoryEntry[]) {
  const trends = strengthTrends(history);
  if (!trends.length) return { percentChange: null as number | null, exerciseCount: 0, message: 'More repeated primary-lift data is needed before a strength trend can be calculated.' };
  const ordered = trends.map(trend => trend.percentChange).sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  const median = ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
  return { percentChange: median, exerciseCount: trends.length, message: `Median relative change across ${trends.length} repeatedly measured primary lift${trends.length === 1 ? '' : 's'}. Loads from different exercise variants are not treated as interchangeable.` };
}

export function cardioCoverage(activity: ActivityDose[], target = 150, now = new Date()) {
  const cutoff = now.getTime() - 7 * 86_400_000;
  const equivalent = activity
    .filter(item => activityCountsTowardCardioTarget(item) && new Date(item.completedAt).getTime() >= cutoff)
    .reduce((sum, item) => sum + cardioEquivalentMinutes(item.minutes || 0, item.effort || 'moderate'), 0);
  return { equivalentMinutes: equivalent, target, coverage: target > 0 ? Math.min(1, equivalent / target) : 0, remaining: Math.max(0, target - equivalent) };
}

export function recoveryPattern(records: ReadinessRecord[], now = new Date()) {
  const cutoff = now.getTime() - 7 * 86_400_000;
  const recent = records.filter(record => new Date(record.recordedAt).getTime() >= cutoff);
  const counts = { normal: 0, reduced: 0, recovery: 0 };
  recent.forEach(record => counts[readinessDecision(record.input).level]++);
  if (!recent.length) return { checkIns: 0, normalShare: null as number | null, ...counts, message: 'No recent readiness check-ins. Recovery status remains unknown rather than assumed.' };
  const normalShare = counts.normal / recent.length;
  return { checkIns: recent.length, normalShare, ...counts, message: counts.recovery > 0 ? 'At least one recovery-first check-in was recorded this week.' : counts.reduced > counts.normal ? 'Reduced-readiness days were more common than normal-readiness days this week.' : 'Recorded readiness was mostly supportive of normal training this week.' };
}

export function consistencyPattern(history: HistoryEntry[], now = new Date()) {
  const currentStart = now.getTime() - 28 * 86_400_000;
  const previousStart = now.getTime() - 56 * 86_400_000;
  const qualifies = (entry: HistoryEntry) => (entry.status || 'completed') !== 'abandoned' && workoutCompletionRatio(entry) >= 0.6;
  const current = history.filter(entry => {
    const date = new Date(entry.completedAt).getTime();
    return date >= currentStart && date <= now.getTime() && qualifies(entry);
  });
  const previous = history.filter(entry => {
    const date = new Date(entry.completedAt).getTime();
    return date >= previousStart && date < currentStart && qualifies(entry);
  });
  const activeWeeks = new Set(current.map(entry => Math.floor((now.getTime() - new Date(entry.completedAt).getTime()) / (7 * 86_400_000)))).size;
  const change = current.length - previous.length;
  return {
    sessions: current.length,
    previousSessions: previous.length,
    activeWeeks,
    weeklyAverage: current.length / 4,
    change,
    message: current.length === 0 ? 'No qualifying strength sessions are recorded in the last 28 days.' : `${current.length} qualifying strength session${current.length === 1 ? '' : 's'} across ${activeWeeks} active week${activeWeeks === 1 ? '' : 's'} in the last 28 days; ${change === 0 ? 'the count matches' : change > 0 ? `${change} more than` : `${Math.abs(change)} fewer than`} the preceding 28 days.`,
  };
}

export function assessmentDue(assessments: Assessment[], metricId: string, now = new Date(), intervalDays = 42) {
  const values = assessments.filter(item => item.metricId === metricId).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  if (!values.length) return { due: true, daysSince: null as number | null, message: 'No baseline has been recorded yet.' };
  const daysSince = Math.floor((now.getTime() - new Date(values[0].recordedAt).getTime()) / 86_400_000);
  return { due: daysSince >= intervalDays, daysSince, message: daysSince >= intervalDays ? `Last comparable assessment was ${daysSince} days ago; a repeat test is due.` : `Last comparable assessment was ${daysSince} days ago.` };
}

export function dueAssessments(assessments: Assessment[], metricIds: string[], now = new Date(), intervalDays = 42) {
  return metricIds.filter(id => assessmentDue(assessments, id, now, intervalDays).due);
}
