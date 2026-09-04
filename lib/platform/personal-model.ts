import { workingLogs } from '../engine';
import { activityCountsTowardCardioTarget } from '../whole-person';
import type { HumanHealthExport } from '../storage';
import type { PersonalModelSnapshot } from './types';

export const personalModelPolicy = {
  location: 'device-only' as const,
  networkTraining: false,
  crossUserLearning: false,
  automaticSharing: false,
  medicalPrediction: false,
  explanation: 'Personal baselines are deterministic summaries generated from this device’s own data. They are not trained across users and are not sent to a server by default.',
};

export function createPersonalModelSnapshot(training: HumanHealthExport, now = new Date(), historyWindowDays = 56): PersonalModelSnapshot {
  const days = Math.max(14, Math.min(365, Math.floor(historyWindowDays)));
  const cutoff = now.getTime() - days * 86_400_000;
  const sessions = training.history.filter(entry => {
    const at = Date.parse(entry.completedAt);
    return Number.isFinite(at) && at >= cutoff && at <= now.getTime() && (entry.status || 'completed') !== 'abandoned';
  });
  const readiness = training.readiness.filter(record => {
    const at = Date.parse(record.recordedAt);
    return Number.isFinite(at) && at >= cutoff && at <= now.getTime();
  });
  const plannedCardioMinutes = training.activity.filter(item => {
    const at = Date.parse(item.completedAt);
    return Number.isFinite(at) && at >= cutoff && at <= now.getTime() && activityCountsTowardCardioTarget(item);
  }).reduce((sum, item) => sum + (item.minutes || 0), 0);
  const strengthExposureByExercise: Record<string, number> = {};
  sessions.forEach(entry => entry.exercises.filter(exercise => exercise.priority === 'primary').forEach(exercise => {
    strengthExposureByExercise[exercise.id] = (strengthExposureByExercise[exercise.id] || 0) + workingLogs(exercise).filter(log => !log.pain && log.formQuality !== 'poor').length;
  }));
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    location: 'device-only',
    historyWindowDays: days,
    trainingSessions: sessions.length,
    readinessCheckIns: readiness.length,
    plannedCardioMinutes,
    preferredGymId: training.preferences.selectedGymId,
    strengthExposureByExercise,
    domainPriorities: { ...training.preferences.domainPriorities },
    limitations: [
      'This is a local descriptive baseline, not a clinical prediction model.',
      'Missing or unlogged activity is not inferred.',
      'It must not be used for diagnosis, medication/insulin dosing, emergency monitoring, or injury clearance.',
    ],
  };
}
