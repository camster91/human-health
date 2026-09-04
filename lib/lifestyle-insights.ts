import { HistoryEntry } from './domain';
import {
  GlucoseExerciseContext,
  LifestyleDataset,
  MovementLog,
  NutritionLog,
  SleepLog,
  WellbeingLog,
  localDateKey,
} from './lifestyle';
import { workoutCompletionRatio } from './schedule';

export type DataState = 'ready' | 'insufficient' | 'disabled';

function withinDays<T extends { recordedAt: string }>(items: T[], days: number, now = new Date()) {
  const cutoff = now.getTime() - days * 86_400_000;
  return items.filter(item => {
    const time = new Date(item.recordedAt).getTime();
    return Number.isFinite(time) && time >= cutoff && time <= now.getTime() + 86_400_000;
  });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function standardDeviation(values: number[]) {
  const mean = average(values);
  if (mean === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

export function sleepSummary(entries: SleepLog[], days = 7, now = new Date()) {
  const recent = withinDays(entries, days, now);
  const durations = recent.map(entry => entry.durationMinutes).filter((value): value is number => typeof value === 'number' && value > 0);
  const qualities = recent.map(entry => entry.quality).filter((value): value is 1 | 2 | 3 | 4 | 5 => typeof value === 'number');
  const meanMinutes = average(durations);
  const variationMinutes = standardDeviation(durations);
  return {
    state: recent.length ? 'ready' as const : 'insufficient' as const,
    daysLogged: recent.length,
    averageMinutes: meanMinutes,
    averageHours: meanMinutes === null ? null : meanMinutes / 60,
    averageQuality: average(qualities),
    consistencyVariationMinutes: variationMinutes,
    message: !recent.length
      ? 'No sleep entries are available for this period.'
      : durations.length < 3
        ? 'More sleep-duration entries are needed before a useful consistency pattern can be shown.'
        : variationMinutes !== null && variationMinutes > 90
          ? 'Recorded sleep duration varied considerably. This is an observation, not a sleep diagnosis.'
          : 'Recorded sleep duration was reasonably consistent across the available entries.',
  };
}

export function movementSummary(entries: MovementLog[], days = 7, now = new Date()) {
  const recent = withinDays(entries, days, now);
  const steps = recent.map(entry => entry.steps).filter((value): value is number => typeof value === 'number');
  const active = recent.map(entry => entry.activeMinutes).filter((value): value is number => typeof value === 'number');
  const sedentary = recent.map(entry => entry.sedentaryMinutes).filter((value): value is number => typeof value === 'number');
  const breaks = recent.map(entry => entry.movementBreaks).filter((value): value is number => typeof value === 'number');
  return {
    state: recent.length ? 'ready' as const : 'insufficient' as const,
    daysLogged: recent.length,
    averageSteps: average(steps),
    averageActiveMinutes: average(active),
    averageSedentaryMinutes: average(sedentary),
    averageMovementBreaks: average(breaks),
    message: recent.length ? 'Movement is reported separately from planned workouts so the app does not double-count activity.' : 'No daily-movement entries are available yet.',
  };
}

function proportion(values: (boolean | undefined)[]) {
  const recorded = values.filter((value): value is boolean => typeof value === 'boolean');
  return recorded.length ? recorded.filter(Boolean).length / recorded.length : null;
}

export function nutritionSummary(entries: NutritionLog[], days = 7, now = new Date()) {
  const recent = withinDays(entries, days, now);
  const hydration = recent.map(entry => entry.hydrationMl).filter((value): value is number => typeof value === 'number');
  const produce = recent.map(entry => entry.produceServings).filter((value): value is number => typeof value === 'number');
  return {
    state: recent.length ? 'ready' as const : 'insufficient' as const,
    daysLogged: recent.length,
    averageHydrationMl: average(hydration),
    averageProduceServings: average(produce),
    proteinAdherence: proportion(recent.map(entry => entry.proteinTargetMet)),
    fibreAdherence: proportion(recent.map(entry => entry.fibreTargetMet)),
    regularMealShare: proportion(recent.map(entry => entry.mealsRegular)),
    adequateAppetiteShare: proportion(recent.map(entry => entry.appetiteAdequate)),
    message: recent.length ? 'These are user-defined habit patterns, not nutritional diagnosis or treatment.' : 'No nutrition or hydration habits are available yet.',
  };
}

export function wellbeingSummary(entries: WellbeingLog[], days = 7, now = new Date()) {
  const recent = withinDays(entries, days, now);
  return {
    state: recent.length ? 'ready' as const : 'insufficient' as const,
    daysLogged: recent.length,
    averageEnergy: average(recent.map(entry => entry.energy).filter((value): value is number => typeof value === 'number')),
    averageMood: average(recent.map(entry => entry.mood).filter((value): value is number => typeof value === 'number')),
    averageStress: average(recent.map(entry => entry.stress).filter((value): value is number => typeof value === 'number')),
    illnessDays: recent.filter(entry => entry.illness).length,
    painDays: recent.filter(entry => entry.pain).length,
    concerningSymptomDays: recent.filter(entry => entry.concerningSymptoms).length,
    message: recent.length ? 'Wellbeing entries are descriptive context and are not mental-health or medical diagnoses.' : 'No wellbeing entries are available yet.',
  };
}

export type AssociationResult = {
  state: 'ready' | 'insufficient';
  samples: number;
  coefficient: number | null;
  direction: 'positive' | 'negative' | 'none' | 'unknown';
  strength: 'weak' | 'moderate' | 'strong' | 'unknown';
  message: string;
};

export function pearsonAssociation(pairs: { x: number; y: number }[], minimumSamples = 6): AssociationResult {
  const valid = pairs.filter(pair => Number.isFinite(pair.x) && Number.isFinite(pair.y));
  if (valid.length < minimumSamples) return { state: 'insufficient', samples: valid.length, coefficient: null, direction: 'unknown', strength: 'unknown', message: `At least ${minimumSamples} comparable observations are required before showing an association.` };
  const xs = valid.map(pair => pair.x);
  const ys = valid.map(pair => pair.y);
  const meanX = average(xs)!;
  const meanY = average(ys)!;
  const numerator = valid.reduce((sum, pair) => sum + (pair.x - meanX) * (pair.y - meanY), 0);
  const denominatorX = Math.sqrt(xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0));
  const denominatorY = Math.sqrt(ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0));
  if (!denominatorX || !denominatorY) return { state: 'insufficient', samples: valid.length, coefficient: null, direction: 'unknown', strength: 'unknown', message: 'The available observations do not vary enough to calculate a useful association.' };
  const coefficient = numerator / (denominatorX * denominatorY);
  const absolute = Math.abs(coefficient);
  const strength = absolute >= 0.65 ? 'strong' : absolute >= 0.35 ? 'moderate' : 'weak';
  const direction = absolute < 0.1 ? 'none' : coefficient > 0 ? 'positive' : 'negative';
  return {
    state: 'ready',
    samples: valid.length,
    coefficient,
    direction,
    strength,
    message: `Across ${valid.length} comparable logged days, the variables had a ${strength} ${direction === 'none' ? 'near-zero' : direction} association. This does not establish cause and effect.`,
  };
}

function bestDailySleep(entries: SleepLog[]) {
  const map = new Map<string, SleepLog>();
  for (const entry of entries) {
    const previous = map.get(entry.date);
    if (!previous || new Date(entry.recordedAt) > new Date(previous.recordedAt)) map.set(entry.date, entry);
  }
  return map;
}

export function sleepTrainingAssociation(sleep: SleepLog[], history: HistoryEntry[], minimumSamples = 6) {
  const sleepByDate = bestDailySleep(sleep);
  const pairs = history.flatMap(entry => {
    if ((entry.status || 'completed') === 'abandoned') return [];
    const date = localDateKey(new Date(entry.completedAt));
    const sleepEntry = sleepByDate.get(date);
    if (!sleepEntry?.durationMinutes) return [];
    return [{ x: sleepEntry.durationMinutes / 60, y: workoutCompletionRatio(entry) }];
  });
  const result = pearsonAssociation(pairs, minimumSamples);
  return { ...result, label: 'Sleep duration and workout completion', message: result.state === 'ready' ? `${result.message} It describes your logged data only and should not be treated as a medical conclusion.` : result.message };
}

export type GlucoseSafetyDecision = {
  constrainIntensity: boolean;
  reason: string;
  medicalBoundary: string;
};

export function glucoseSafetyDecision(entry?: GlucoseExerciseContext | null): GlucoseSafetyDecision {
  const medicalBoundary = 'The app does not calculate insulin, carbohydrate, correction, or treatment decisions. Follow your established diabetes safety plan and clinician guidance.';
  if (!entry) return { constrainIntensity: false, reason: 'No current exercise/glucose context was entered, so the app makes no glucose assumption.', medicalBoundary };
  const concerning = entry.symptoms
    || entry.relationToPersonalRange === 'below'
    || entry.trend === 'rapidly-falling'
    || entry.trend === 'rapidly-rising';
  if (concerning) return { constrainIntensity: true, reason: 'The latest optional glucose context includes symptoms, a below-personal-range state, or rapid change. High-intensity work is withheld until you apply your established safety plan.', medicalBoundary };
  if (entry.relationToPersonalRange === 'above') return { constrainIntensity: false, reason: 'The latest entry is above the user’s personal range. The app records that context but does not determine treatment or exercise clearance.', medicalBoundary };
  return { constrainIntensity: false, reason: 'The latest optional glucose context did not trigger this app’s conservative intensity guardrail.', medicalBoundary };
}

export function latestByRecordedAt<T extends { recordedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0] || null;
}

export function lifestyleSummary(dataset: LifestyleDataset, now = new Date()) {
  return {
    sleep: sleepSummary(dataset.sleep, 7, now),
    movement: movementSummary(dataset.movement, 7, now),
    nutrition: nutritionSummary(dataset.nutrition, 7, now),
    wellbeing: wellbeingSummary(dataset.wellbeing, 7, now),
    glucose: glucoseSafetyDecision(latestByRecordedAt(dataset.glucose)),
  };
}
