import { HistoryEntry, SessionId } from './domain';
import { ActivityDose, CardioOption, activityCountsTowardCardioTarget } from './whole-person';

export type RecentTrainingLoad = {
  lowerSets: number;
  upperSets: number;
  lowerBodySets: number;
  lowerBodyRecent: boolean;
  hoursSinceLower: number | null;
  hoursSinceAny: number | null;
  hardCardioMinutes: number;
  hoursSinceHardCardio: number | null;
  message: string;
};

export function recentTrainingLoad(history: HistoryEntry[], activity: ActivityDose[] = [], now = new Date()): RecentTrainingLoad {
  let lowerSets = 0;
  let upperSets = 0;
  let hoursSinceLower: number | null = null;
  let hoursSinceAny: number | null = null;
  let hardCardioMinutes = 0;
  let hoursSinceHardCardio: number | null = null;

  const completed = [...history]
    .filter(entry => (entry.status || 'completed') !== 'abandoned')
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  if (completed.length) hoursSinceAny = (now.getTime() - new Date(completed[0].completedAt).getTime()) / 3_600_000;
  for (const entry of completed) {
    const hours = (now.getTime() - new Date(entry.completedAt).getTime()) / 3_600_000;
    if (hours < 0 || hours > 48) continue;
    const sets = entry.exercises.reduce((sum, exercise) => sum + exercise.logs.filter(log => !log.warmup).length, 0);
    if (entry.session.startsWith('lower')) {
      lowerSets += sets;
      if (hoursSinceLower === null || hours < hoursSinceLower) hoursSinceLower = hours;
    } else {
      upperSets += sets;
    }
  }

  for (const dose of activity.filter(item => activityCountsTowardCardioTarget(item) && item.effort === 'hard')) {
    const hours = (now.getTime() - new Date(dose.completedAt).getTime()) / 3_600_000;
    if (hours < 0 || hours > 36) continue;
    hardCardioMinutes += dose.minutes || 0;
    if (hoursSinceHardCardio === null || hours < hoursSinceHardCardio) hoursSinceHardCardio = hours;
  }

  const lowerBodyRecent = hoursSinceLower !== null && hoursSinceLower < 36;
  const context: string[] = [];
  if (lowerBodyRecent) context.push(`Lower-body training was about ${Math.round(hoursSinceLower!)} hours ago (${lowerSets} logged working sets).`);
  if (hoursSinceHardCardio !== null) context.push(`Hard planned cardio was about ${Math.round(hoursSinceHardCardio)} hours ago (${hardCardioMinutes} min in the last 36 hours).`);
  if (!context.length) context.push('No recent demanding lower-body or hard-cardio load is recorded.');
  return { lowerSets, upperSets, lowerBodySets: lowerSets, lowerBodyRecent, hoursSinceLower, hoursSinceAny, hardCardioMinutes, hoursSinceHardCardio, message: context.join(' ') };
}

export function coordinateCardio(options: CardioOption[], load: RecentTrainingLoad, readiness: 'normal' | 'reduced' | 'recovery') {
  if (readiness === 'recovery') return options.filter(option => option.type === 'recovery');
  const demandingLower = load.lowerBodyRecent && load.lowerSets >= 6;
  if (demandingLower) {
    return options
      .filter(option => option.type !== 'intervals')
      .map(option => option.type === 'steady' ? { ...option, description: `${option.description} Recent lower-body training is being protected, so hard intervals are deferred.` } : option);
  }
  return options;
}

export function powerAllowed(load: RecentTrainingLoad, readiness: 'normal' | 'reduced' | 'recovery', highImpactAllowed = true) {
  if (!highImpactAllowed) return { allowed: false, reason: 'High-impact work is disabled in preferences.' };
  if (readiness !== 'normal') return { allowed: false, reason: 'Recovery/readiness is not normal, so explosive work stays low impact.' };
  if (load.lowerBodyRecent && load.lowerSets >= 6) return { allowed: false, reason: `${load.lowerSets} lower-body working sets were logged within the last 36 hours; avoid stacking extra jump fatigue.` };
  if (load.hoursSinceHardCardio !== null && load.hoursSinceHardCardio < 24 && load.hardCardioMinutes >= 15) return { allowed: false, reason: `${load.hardCardioMinutes} hard cardio minutes were logged within the last 24 hours; keep athletic work low impact today.` };
  return { allowed: true, reason: 'No recent lower-body or hard-cardio load currently requires power work to be deferred.' };
}

export function strengthLoadAdjustment(session: SessionId, load: RecentTrainingLoad, readiness: 'normal' | 'reduced' | 'recovery') {
  if (readiness === 'recovery') return { reduce: true, volumeMultiplier: 0.5, pauseProgression: true, reason: 'Recovery-first readiness overrides normal strength progression.' };
  if (session.startsWith('lower') && load.hoursSinceHardCardio !== null && load.hoursSinceHardCardio < 24 && load.hardCardioMinutes >= 20) return { reduce: true, volumeMultiplier: 0.8, pauseProgression: true, reason: `Recent hard cardio (${load.hardCardioMinutes} min) may add lower-body fatigue. Keep the lower session conservative and do not force progression.` };
  if (readiness === 'reduced') return { reduce: true, volumeMultiplier: 0.8, pauseProgression: true, reason: 'Readiness is reduced; trim volume and hold load progression.' };
  return { reduce: false, volumeMultiplier: 1, pauseProgression: false, reason: 'Current recent workload does not require an automatic strength reduction.' };
}
