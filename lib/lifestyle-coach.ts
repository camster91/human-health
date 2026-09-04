import { Equipment, HistoryEntry, TrainingMode } from './domain';
import { LifestyleDataset, WellbeingLog } from './lifestyle';
import { glucoseSafetyDecision, latestByRecordedAt, lifestyleSummary } from './lifestyle-insights';
import { RecentTrainingLoad, powerAllowed, recentTrainingLoad } from './load-management';
import { DomainPriority } from './preferences';
import { minimumEffectiveDay } from './performance';
import { ActivityDose, CapabilityDomain, ReadinessDecision, ReadinessRecord, readinessDecision } from './whole-person';

export type LifestyleCoachDecision = {
  level: 'normal' | 'reduced' | 'recovery';
  allowProgression: boolean;
  highIntensityAllowed: boolean;
  recommendedDomains: CapabilityDomain[];
  recommendedSessionIds: string[];
  minutes: number;
  reasons: string[];
  dataUsed: string[];
  unknown: string[];
  medicalBoundary: string;
};

function todayWellbeing(dataset: LifestyleDataset): WellbeingLog | null {
  return latestByRecordedAt(dataset.wellbeing);
}

function combineReadiness(base: ReadinessDecision, dataset: LifestyleDataset): ReadinessDecision {
  const latestSleep = latestByRecordedAt(dataset.sleep);
  const wellbeing = todayWellbeing(dataset);
  const lifestyleInput = {
    sleep: latestSleep?.quality !== undefined && latestSleep.quality <= 2 ? 'poor' as const : undefined,
    sleepHours: latestSleep?.durationMinutes !== undefined ? latestSleep.durationMinutes / 60 : undefined,
    fatigue: wellbeing?.energy !== undefined && wellbeing.energy <= 2 ? 'high' as const : undefined,
    stress: wellbeing?.stress !== undefined && wellbeing.stress >= 4 ? 'high' as const : undefined,
    illness: wellbeing?.illness,
    pain: wellbeing?.pain || wellbeing?.concerningSymptoms,
  };
  const lifestyle = readinessDecision(lifestyleInput);
  const rank = { normal: 0, reduced: 1, recovery: 2 } as const;
  const strongest = rank[lifestyle.level] > rank[base.level] ? lifestyle : base;
  return {
    ...strongest,
    reasons: [...new Set([...base.reasons, ...lifestyle.reasons])],
    allowProgression: base.allowProgression && lifestyle.allowProgression,
    volumeMultiplier: Math.min(base.volumeMultiplier, lifestyle.volumeMultiplier),
  };
}

export function buildLifestyleCoachDecision(options: {
  dataset: LifestyleDataset;
  baseReadiness: ReadinessDecision;
  readinessRecords?: ReadinessRecord[];
  history: HistoryEntry[];
  activity: ActivityDose[];
  availableMinutes: number;
  mode: TrainingMode;
  equipment: Equipment[];
  cardioTargetMinutes: number;
  priorities: Record<CapabilityDomain, DomainPriority>;
  now?: Date;
}): LifestyleCoachDecision {
  const now = options.now || new Date();
  const consent = options.dataset.preferences.consent;
  const readiness = combineReadiness(options.baseReadiness, options.dataset);
  const load = recentTrainingLoad(options.history, options.activity, now);
  const glucose = consent['glucose-context'] && options.dataset.preferences.glucoseContextEnabled
    ? glucoseSafetyDecision(latestByRecordedAt(options.dataset.glucose))
    : glucoseSafetyDecision(null);
  const healthRestrictions = consent['health-context'] ? options.dataset.healthContext.clinicianRestrictions : [];
  const wellbeing = consent.wellbeing ? todayWellbeing(options.dataset) : null;
  const safetyConstraint = glucose.constrainIntensity || Boolean(wellbeing?.concerningSymptoms) || healthRestrictions.length > 0;
  const effectiveReadiness: ReadinessDecision = safetyConstraint
    ? { level: 'recovery', volumeMultiplier: Math.min(0.5, readiness.volumeMultiplier), allowProgression: false, reasons: readiness.reasons }
    : readiness;
  const day = minimumEffectiveDay({
    availableMinutes: options.availableMinutes,
    activity: options.activity,
    readiness: effectiveReadiness,
    mode: options.mode,
    cardioTargetMinutes: options.cardioTargetMinutes,
    priorities: options.priorities,
    equipment: options.equipment,
  });
  const power = powerAllowed(load, effectiveReadiness.level, options.dataset.preferences.consent.wellbeing !== false && !glucose.constrainIntensity);

  const reasons = [...effectiveReadiness.reasons];
  if (glucose.constrainIntensity) reasons.push(glucose.reason);
  if (wellbeing?.concerningSymptoms) reasons.push('Concerning symptoms were recorded; the app will not prescribe demanding exercise.');
  if (healthRestrictions.length) reasons.push(`Stored clinician restriction${healthRestrictions.length === 1 ? '' : 's'} must be respected before selecting exercises.`);
  if (!power.allowed) reasons.push(power.reason);
  reasons.push(day.message);

  const dataUsed: string[] = [];
  const unknown: string[] = [];
  for (const domain of ['sleep', 'movement', 'nutrition', 'wellbeing', 'health-context', 'glucose-context'] as const) {
    if (!consent[domain]) {
      unknown.push(`${domain} disabled`);
      continue;
    }
    if (domain === 'sleep') (options.dataset.sleep.length ? dataUsed : unknown).push(options.dataset.sleep.length ? 'latest sleep entry' : 'sleep not logged');
    if (domain === 'movement') (options.dataset.movement.length ? dataUsed : unknown).push(options.dataset.movement.length ? 'recent movement entries' : 'movement not logged');
    if (domain === 'nutrition') (options.dataset.nutrition.length ? dataUsed : unknown).push(options.dataset.nutrition.length ? 'recent nutrition/hydration habits' : 'nutrition not logged');
    if (domain === 'wellbeing') (options.dataset.wellbeing.length ? dataUsed : unknown).push(options.dataset.wellbeing.length ? 'latest wellbeing entry' : 'wellbeing not logged');
    if (domain === 'health-context') (healthRestrictions.length || options.dataset.healthContext.conditions.length ? dataUsed : unknown).push(healthRestrictions.length || options.dataset.healthContext.conditions.length ? 'optional health context' : 'health context empty');
    if (domain === 'glucose-context') (options.dataset.glucose.length ? dataUsed : unknown).push(options.dataset.glucose.length ? 'latest optional exercise/glucose context' : 'glucose context not logged');
  }
  dataUsed.push('recent training load', 'Phase 2 readiness and life mode');

  return {
    level: effectiveReadiness.level,
    allowProgression: effectiveReadiness.allowProgression && !safetyConstraint,
    highIntensityAllowed: effectiveReadiness.level === 'normal' && !safetyConstraint && power.allowed,
    recommendedDomains: day.domains,
    recommendedSessionIds: day.sessionIds,
    minutes: day.minutes,
    reasons: [...new Set(reasons.filter(Boolean))],
    dataUsed: [...new Set(dataUsed)],
    unknown: [...new Set(unknown)],
    medicalBoundary: `${glucose.medicalBoundary} Human Health provides fitness and lifestyle guidance only; it does not diagnose illness, clear injuries, or replace urgent or professional medical care.`,
  };
}

export function lifestyleCoachSummary(dataset: LifestyleDataset) {
  const summary = lifestyleSummary(dataset);
  const messages: string[] = [];
  if (summary.sleep.averageHours !== null) messages.push(`Average logged sleep: ${summary.sleep.averageHours.toFixed(1)} hours across ${summary.sleep.daysLogged} day${summary.sleep.daysLogged === 1 ? '' : 's'}.`);
  if (summary.movement.averageSteps !== null) messages.push(`Average logged daily movement: ${Math.round(summary.movement.averageSteps)} steps.`);
  if (summary.nutrition.proteinAdherence !== null) messages.push(`Your own protein habit was marked complete on ${Math.round(summary.nutrition.proteinAdherence * 100)}% of logged days.`);
  if (summary.wellbeing.averageEnergy !== null) messages.push(`Average logged energy: ${summary.wellbeing.averageEnergy.toFixed(1)} / 5.`);
  if (!messages.length) messages.push('Lifestyle context is optional. Add only the information that is useful to you.');
  return messages;
}
