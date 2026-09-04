import { Equipment, HistoryEntry } from './domain';
import { plannedExercises } from './workout-accounting';
import { ActivityDose } from './whole-person-foundation';
import { microSessions } from './whole-person-skills';
import type { CapabilityDomain } from './whole-person-types';

export type Assessment = { metricId: string; value: number; recordedAt: string; note?: string };

function validAssessmentValues(assessments: Assessment[], id: string, now = new Date()) {
  const ceiling = now.getTime() + 5 * 60_000;
  return assessments
    .filter(item => item.metricId === id && Number.isFinite(item.value))
    .map(item => ({ item, timestamp: Date.parse(item.recordedAt) }))
    .filter(value => Number.isFinite(value.timestamp) && value.timestamp <= ceiling)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function latestAssessment(assessments: Assessment[], id: string, now = new Date()) {
  return validAssessmentValues(assessments, id, now).at(-1)?.item || null;
}
export function assessmentTrend(assessments: Assessment[], id: string, now = new Date()) {
  const values = validAssessmentValues(assessments, id, now);
  return values.length < 2 ? null : values.at(-1)!.item.value - values[0].item.value;
}

export type AthleticPlan = { domain: 'power' | 'balance' | 'movement'; name: string; items: string[]; reason: string; impact: 'low' | 'moderate' };
export function athleticPlan(assessments: Assessment[], readiness: 'normal' | 'reduced' | 'recovery', options: { highImpactAllowed?: boolean; equipment?: Equipment[]; now?: Date } = {}): AthleticPlan[] {
  if (readiness === 'recovery') return [];
  const balance = latestAssessment(assessments, 'single-leg-balance', options.now)?.value || 0;
  const plans: AthleticPlan[] = [];
  if (balance < 30 || options.highImpactAllowed === false) plans.push({ domain: 'balance', name: 'Balance foundation', items: ['Single-leg balance 3 × 20–30 sec/side', 'Step-down control 2 × 6/side', 'Heel-to-toe walk 2 × 10 steps'], reason: options.highImpactAllowed === false ? 'High-impact work is disabled, so athletic development stays with balance and coordination.' : 'Build repeatable single-leg control and coordination.', impact: 'low' });
  if (readiness === 'normal' && options.highImpactAllowed !== false) plans.push({ domain: 'power', name: 'Low-volume power', items: ['3–5 sets of 2–3 crisp jumps or explosive reps', 'Full recovery between sets'], reason: 'Train power without turning it into conditioning.', impact: 'moderate' });
  plans.push({ domain: 'movement', name: 'Carry + locomotion', items: options.equipment?.includes('dumbbell') || options.equipment?.includes('barbell') ? ['Suitcase or farmer carry 3 × 20–40 m', 'Controlled backward walk or march'] : ['Controlled loaded-object carry only if a safe object is available', 'Controlled backward walk or march'], reason: 'Build practical work capacity, coordination, and trunk control.', impact: 'low' });
  return plans;
}

export function weeklyMinutes(doses: ActivityDose[], domain: CapabilityDomain, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const ceiling = now.getTime();
  return doses.filter(item => {
    if (item.domain !== domain) return false;
    const timestamp = Date.parse(item.completedAt);
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= ceiling;
  }).reduce((sum, item) => sum + (item.minutes || 0), 0);
}
export function targetProgress(current: number, target: number) {
  return target <= 0 ? 0 : Math.min(1, current / target);
}
export function minimumEffectiveOptions(minutes: number, needs: CapabilityDomain[], equipment: Equipment[] = ['bodyweight']) {
  return microSessions
    .filter(session => session.minutes <= minutes && (needs.length === 0 || needs.includes(session.domain)) && (session.requiredEquipment || []).every(item => equipment.includes(item)))
    .sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name));
}

export function workoutActivityDoses(entry: HistoryEntry): ActivityDose[] {
  if ((entry.status || 'completed') === 'abandoned') return [];
  const requiredExercises = plannedExercises(entry.exercises);
  const prescribedRequired = requiredExercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const completedRequired = requiredExercises.reduce((sum, exercise) => sum + Math.min(exercise.sets, exercise.logs.filter(log => !log.warmup).length), 0);
  const allWorkingSets = entry.exercises.reduce((sum, exercise) => sum + Math.min(exercise.sets, exercise.logs.filter(log => !log.warmup).length), 0);
  if (!allWorkingSets) return [];
  const quality = prescribedRequired > 0 ? Math.min(1, completedRequired / prescribedRequired) : 1;
  const workoutId = entry.workoutId || (entry.startedAt ? `${entry.session}:${entry.startedAt}` : undefined);
  const base = { workoutId, completedAt: entry.completedAt, kind: 'planned' as const, source: 'workout' as const, quality };
  const doses: ActivityDose[] = [{ ...base, domain: 'strength', sets: allWorkingSets, sessionId: `strength:${entry.session}` }];
  const coreSets = entry.exercises.filter(exercise => exercise.movement === 'core').reduce((sum, exercise) => sum + exercise.logs.filter(log => !log.warmup).length, 0);
  if (coreSets) doses.push({ ...base, domain: 'core', sets: coreSets, sessionId: `embedded-core:${entry.session}` });
  const bodyweightSets = entry.exercises.filter(exercise => exercise.movement !== 'core' && exercise.metadata?.loadType === 'bodyweight').reduce((sum, exercise) => sum + exercise.logs.filter(log => !log.warmup).length, 0);
  if (bodyweightSets) doses.push({ ...base, domain: 'bodyweight', sets: bodyweightSets, sessionId: `embedded-bodyweight:${entry.session}` });
  return doses;
}
