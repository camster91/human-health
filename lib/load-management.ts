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
    .map(entry => ({ entry, timestamp: Date.parse(entry.completedAt) }))
    .filter(item => Number.isFinite(item.timestamp) && item.timestamp <= now.getTime())
    .sort((a, b) => b.timestamp - a.timestamp);
  if (completed.length) hoursSinceAny = (now.getTime() - completed[0].timestamp) / 3_600_000;
  for (const { entry, timestamp } of completed) {
    const hours = (now.getTime() - timestamp) / 3_600_000;
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
    const timestamp = Date.parse(dose.completedAt);
    if (!Number.isFinite(timestamp)) continue;
    const hours = (now.getTime() - timestamp) / 3_600_000;
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
  if (readiness === 'recovery') return [];
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
  if (readiness === 'recovery') return { allowed: false, reason: 'Pain or illness was flagged, so Human Health pauses automatic athletic exercise suggestions rather than treating a lower-impact option as clearance.' };
  if (readiness !== 'normal') return { allowed: false, reason: 'Recovery/readiness is not normal, so explosive work stays low impact.' };
  if (load.lowerBodyRecent && load.lowerSets >= 6) return { allowed: false, reason: `${load.lowerSets} lower-body working sets were logged within the last 36 hours; avoid stacking extra jump fatigue.` };
  if (load.hoursSinceHardCardio !== null && load.hoursSinceHardCardio < 24 && load.hardCardioMinutes >= 15) return { allowed: false, reason: `${load.hardCardioMinutes} hard cardio minutes were logged within the last 24 hours; keep athletic work low impact today.` };
  return { allowed: true, reason: 'No recent lower-body or hard-cardio load currently requires power work to be deferred.' };
}

export type StrengthLoadAdjustment = {
  reduce: boolean;
  volumeMultiplier: number;
  pauseProgression: boolean;
  source: 'none' | 'readiness' | 'hard-cardio';
  reason: string;
};

export function strengthLoadAdjustment(session: SessionId, load: RecentTrainingLoad, readiness: 'normal' | 'reduced' | 'recovery'): StrengthLoadAdjustment {
  if (readiness === 'recovery') return { reduce: true, volumeMultiplier: 0, pauseProgression: true, source: 'readiness', reason: 'Pain or illness was flagged, so Human Health pauses automatic strength suggestions instead of prescribing a reduced workout.' };
  if (session.startsWith('lower') && load.hoursSinceHardCardio !== null && load.hoursSinceHardCardio < 24 && load.hardCardioMinutes >= 20) return { reduce: true, volumeMultiplier: 0.8, pauseProgression: true, source: 'hard-cardio', reason: `Recent hard cardio (${load.hardCardioMinutes} min) may add lower-body fatigue. Keep the lower session conservative and do not force progression.` };
  if (readiness === 'reduced') return { reduce: true, volumeMultiplier: 0.8, pauseProgression: true, source: 'readiness', reason: 'Readiness is reduced; trim volume and hold load progression.' };
  return { reduce: false, volumeMultiplier: 1, pauseProgression: false, source: 'none', reason: 'Current recent workload does not require an automatic strength reduction.' };
}
