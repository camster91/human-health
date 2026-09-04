import { Equipment, TrainingMode } from './domain';
import type { DomainPriority } from './preferences';
import {
  ActivityDose,
  CapabilityDomain,
  ReadinessDecision,
  SkillMetric,
  SkillStep,
  SkillTree,
  activityCountsTowardCardioTarget,
  cardioEquivalentMinutes,
  minimumEffectiveOptions,
  skillTrees,
  weeklyTargets,
} from './whole-person';

export type LifeMode = TrainingMode;
export type SkillAssessment = {
  treeId: string;
  stepId: string;
  passed: boolean;
  clean: boolean;
  pain: boolean;
  recordedAt: string;
  metric?: SkillMetric;
  value?: number;
  assistanceKg?: number;
  externalLoadKg?: number;
  variation?: string;
  note?: string;
};
export type SkillRecommendation = { action: 'hold' | 'advance' | 'regress'; stepId: string; message: string };

export function skillAssessmentValue(step: SkillStep, assessment: SkillAssessment) {
  if (step.metric === 'assistance-kg') return assessment.assistanceKg ?? assessment.value;
  if (step.metric === 'external-load-kg') return assessment.externalLoadKg ?? assessment.value;
  return assessment.value;
}

export function skillAssessmentPasses(step: SkillStep, assessment: SkillAssessment) {
  if (assessment.pain || !assessment.clean) return false;
  const value = skillAssessmentValue(step, assessment);
  if (typeof value === 'number' && typeof step.targetValue === 'number') {
    if (step.metric === 'assistance-kg') return value <= step.targetValue;
    return value >= step.targetValue;
  }
  return assessment.passed;
}

export function skillAssessmentsAreComparable(first: SkillAssessment, second: SkillAssessment) {
  if ((first.metric || null) !== (second.metric || null)) return false;
  if ((first.variation || '') !== (second.variation || '')) return false;
  if (typeof first.assistanceKg === 'number' || typeof second.assistanceKg === 'number') {
    if (typeof first.assistanceKg !== 'number' || typeof second.assistanceKg !== 'number') return false;
    if (Math.abs(first.assistanceKg - second.assistanceKg) > 2.5) return false;
  }
  return true;
}

export function recommendSkillProgression(treeId: string, currentStepId: string, assessments: SkillAssessment[]): SkillRecommendation {
  const tree = skillTrees.find(item => item.id === treeId);
  if (!tree) return { action: 'hold', stepId: currentStepId, message: 'Skill tree not found.' };
  const index = Math.max(0, tree.steps.findIndex(step => step.id === currentStepId));
  const currentStep = tree.steps[index];
  const recent = assessments
    .filter(item => item.treeId === treeId && item.stepId === currentStepId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 3);

  if (recent.some(item => item.pain)) return { action: 'hold', stepId: currentStepId, message: 'Discomfort was reported. Hold progression and reassess rather than advancing.' };
  const latestPair = recent.slice(0, 2);
  if (latestPair.length === 2 && !skillAssessmentsAreComparable(latestPair[0], latestPair[1])) {
    return { action: 'hold', stepId: currentStepId, message: 'The two latest results used different assistance or test conditions. Repeat a comparable assessment before changing level.' };
  }
  const assistanceStableOrLower = currentStep.id !== 'assisted'
    || typeof latestPair[0]?.assistanceKg !== 'number'
    || typeof latestPair[1]?.assistanceKg !== 'number'
    || latestPair[0].assistanceKg <= latestPair[1].assistanceKg;
  if (latestPair.length === 2 && latestPair.every(item => skillAssessmentPasses(currentStep, item)) && assistanceStableOrLower) {
    const next = tree.steps[Math.min(index + 1, tree.steps.length - 1)];
    return next.id === currentStepId
      ? { action: 'hold', stepId: currentStepId, message: 'Top progression reached; improve quality or difficulty gradually.' }
      : { action: 'advance', stepId: next.id, message: `Two clean comparable assessments met the target. ${next.name} is the next progression.` };
  }
  if (latestPair.length === 2 && latestPair.every(item => skillAssessmentPasses(currentStep, item)) && !assistanceStableOrLower) {
    return { action: 'hold', stepId: currentStepId, message: 'Repetitions were achieved with more assistance on the latest test. Keep the current step until assistance is stable or decreasing.' };
  }
  if (latestPair.length === 2 && latestPair.every(item => !skillAssessmentPasses(currentStep, item)) && index > 0) {
    const previous = tree.steps[index - 1];
    return { action: 'regress', stepId: previous.id, message: `The current target was missed twice. Use ${previous.name} temporarily and rebuild clean performance.` };
  }
  return { action: 'hold', stepId: currentStepId, message: 'Keep the current step until its target is repeatable across two clean comparable assessments.' };
}

export function availableSkillSteps(tree: SkillTree, equipment: Equipment[]) {
  return tree.steps.filter(step => step.requiredEquipment.every(item => equipment.includes(item)));
}

export function availableSkillTrees(equipment: Equipment[]) {
  return skillTrees.filter(tree => availableSkillSteps(tree, equipment).length > 0);
}

export type AthleticSession = { id: string; name: string; domain: 'power' | 'balance' | 'movement'; minutes: number; items: string[]; impact: 'low' | 'moderate' };
export const athleticSessions: AthleticSession[] = [
  { id: 'balance-base', name: 'Balance + coordination base', domain: 'balance', minutes: 8, impact: 'low', items: ['Single-leg balance 3 × 20–40 sec/side', 'Heel-to-toe walk 2 × 10 steps', 'Controlled step-down 2 × 6/side'] },
  { id: 'power-base', name: 'Low-volume power', domain: 'power', minutes: 10, impact: 'moderate', items: ['Low pogo or snap-down practice 3 × 5', 'Countermovement jump 3 × 3 with full rest', 'Fast bodyweight squat 2 × 5'] },
  { id: 'movement-carry', name: 'Carry + locomotion', domain: 'movement', minutes: 10, impact: 'low', items: ['Suitcase carry 3 × 30 sec/side', 'Farmer carry 3 × 30 sec', 'Backward walk or controlled march 3 × 30 sec'] },
];

export function athleticRecommendation(options: { pain?: boolean; lowEnergy?: boolean; highImpactOkay?: boolean; recentLowerBody?: boolean; recentHardCardio?: boolean; canCarry?: boolean }) {
  if (options.pain || options.highImpactOkay === false || options.recentLowerBody || options.recentHardCardio) return athleticSessions.find(session => session.id === 'balance-base')!;
  if (options.lowEnergy) return options.canCarry === false ? athleticSessions.find(session => session.id === 'balance-base')! : athleticSessions.find(session => session.id === 'movement-carry')!;
  return athleticSessions.find(session => session.id === 'power-base')!;
}

export type DailyPlan = { mode: LifeMode; minutes: number; domains: CapabilityDomain[]; message: string; sessionIds: string[] };

function uniqueCompletedSessions(doses: ActivityDose[]) {
  const keys = new Set<string>();
  for (const dose of doses) {
    if ((dose.quality ?? 1) < 0.6) continue;
    keys.add(`${dose.sessionId || dose.domain}:${dose.completedAt.slice(0, 10)}`);
  }
  return keys.size;
}

export function domainDeficits(
  activity: ActivityDose[],
  now = new Date(),
  options: { cardioTargetMinutes?: number; priorities?: Partial<Record<CapabilityDomain, DomainPriority>> } = {},
): CapabilityDomain[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const cardioTarget = options.cardioTargetMinutes ?? weeklyTargets.find(target => target.domain === 'cardio')?.minutes ?? 150;
  const priorityOrder: Record<DomainPriority, number> = { focus: 0, maintain: 1, deprioritize: 2, off: 3 };

  return weeklyTargets
    .filter(target => (options.priorities?.[target.domain] || 'maintain') !== 'off')
    .map(target => {
      const recent = activity.filter(item => item.domain === target.domain && new Date(item.completedAt) >= start);
      const minutes = target.domain === 'cardio'
        ? recent.filter(activityCountsTowardCardioTarget).reduce((sum, item) => sum + cardioEquivalentMinutes(item.minutes || 0, item.effort || 'moderate'), 0)
        : recent.reduce((sum, item) => sum + (item.minutes || 0), 0);
      const sessions = uniqueCompletedSessions(recent);
      const requiredMinutes = target.domain === 'cardio' ? cardioTarget : target.minutes;
      const behind = requiredMinutes !== undefined ? minutes < requiredMinutes : target.sessions !== undefined ? sessions < target.sessions : false;
      return behind ? target.domain : null;
    })
    .filter(Boolean)
    .sort((a, b) => priorityOrder[options.priorities?.[a as CapabilityDomain] || 'maintain'] - priorityOrder[options.priorities?.[b as CapabilityDomain] || 'maintain']) as CapabilityDomain[];
}

export function minimumEffectiveDay(options: {
  availableMinutes: number;
  activity: ActivityDose[];
  readiness: ReadinessDecision;
  mode?: LifeMode;
  cardioTargetMinutes?: number;
  priorities?: Partial<Record<CapabilityDomain, DomainPriority>>;
  equipment?: Equipment[];
}): DailyPlan {
  const mode = options.mode || 'normal';
  const availableMinutes = Math.max(0, Math.floor(options.availableMinutes));
  const equipment = options.equipment || ['bodyweight'];
  const deficits = domainDeficits(options.activity, new Date(), { cardioTargetMinutes: options.cardioTargetMinutes, priorities: options.priorities });

  if (options.readiness.level === 'recovery') {
    const sessions = minimumEffectiveOptions(availableMinutes, ['mobility'], equipment);
    const chosen = sessions[0];
    return { mode, minutes: chosen?.minutes || 0, domains: chosen ? [chosen.domain] : [], message: 'Recovery signals take priority. Keep today easy and avoid chasing missed training volume.', sessionIds: chosen ? [chosen.id] : [] };
  }

  const modeDomains: CapabilityDomain[] = mode === 'travel'
    ? ['bodyweight', 'cardio', 'mobility', 'movement']
    : mode === 'return'
      ? ['mobility', 'cardio', 'strength']
      : mode === 'maintenance'
        ? ['strength', 'cardio', 'mobility']
        : deficits;
  const needs = modeDomains.filter((domain, index, all) => all.indexOf(domain) === index && (options.priorities?.[domain] || 'maintain') !== 'off');
  if (!needs.length) return { mode, minutes: 0, domains: [], message: 'No enabled domain is currently below its configured target. Choose optional easy work or keep the day free.', sessionIds: [] };

  const candidates = minimumEffectiveOptions(availableMinutes, needs, equipment)
    .sort((a, b) => needs.indexOf(a.domain) - needs.indexOf(b.domain) || a.minutes - b.minutes);
  const selected: typeof candidates = [];
  let used = 0;
  for (const candidate of candidates) {
    if (selected.some(item => item.domain === candidate.domain)) continue;
    if (used + candidate.minutes > availableMinutes) continue;
    selected.push(candidate);
    used += candidate.minutes;
  }

  return {
    mode,
    minutes: used,
    domains: selected.map(session => session.domain),
    message: mode === 'return'
      ? 'Return mode: rebuild consistency and tolerance before normal progression.'
      : mode === 'travel'
        ? 'Travel mode: preserve important patterns with the equipment and time available.'
        : mode === 'maintenance'
          ? 'Maintenance mode: preserve strength and aerobic fitness with a lower training burden.'
          : 'Use today to cover the most important current fitness gaps without trying to make up everything at once.',
    sessionIds: selected.map(session => session.id),
  };
}

export function findSkillTree(id: string): SkillTree | undefined {
  return skillTrees.find(tree => tree.id === id);
}
