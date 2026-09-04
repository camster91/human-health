import { Equipment, SessionId } from './domain';
import type { CapabilityDomain } from './whole-person-types';

export type SkillMetric = 'reps' | 'seconds' | 'assistance-kg' | 'external-load-kg' | 'quality';
export type SkillStep = {
  id: string;
  name: string;
  target: string;
  metric: SkillMetric;
  targetValue?: number;
  requiredEquipment: Equipment[];
};
export type SkillTree = { id: string; name: string; domain: 'bodyweight'; steps: SkillStep[] };

export const skillTrees: SkillTree[] = [
  { id: 'pull-up', name: 'Pull-up', domain: 'bodyweight', steps: [
    { id: 'hang', name: 'Dead hang', target: '30–60 sec comfortable hold', metric: 'seconds', targetValue: 30, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'scap', name: 'Scapular pull-up', target: '8–12 controlled reps', metric: 'reps', targetValue: 8, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'assisted', name: 'Assisted pull-up', target: '3 × 6–10 with stable or decreasing assistance', metric: 'reps', targetValue: 6, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'strict', name: 'Strict pull-up', target: '3 × 5–10', metric: 'reps', targetValue: 5, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'weighted', name: 'Weighted pull-up', target: 'Progress external load while preserving clean reps', metric: 'external-load-kg', targetValue: 1, requiredEquipment: ['bodyweight', 'pullup-bar'] },
  ] },
  { id: 'chin-up', name: 'Chin-up', domain: 'bodyweight', steps: [
    { id: 'assisted', name: 'Assisted chin-up', target: '3 × 6–10 with stable or decreasing assistance', metric: 'reps', targetValue: 6, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'strict', name: 'Strict chin-up', target: '3 × 5–10', metric: 'reps', targetValue: 5, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'weighted', name: 'Weighted chin-up', target: 'Progress external load with full range', metric: 'external-load-kg', targetValue: 1, requiredEquipment: ['bodyweight', 'pullup-bar'] },
  ] },
  { id: 'push-up', name: 'Push-up', domain: 'bodyweight', steps: [
    { id: 'incline', name: 'Incline push-up', target: '3 × 10–15', metric: 'reps', targetValue: 10, requiredEquipment: ['bodyweight'] },
    { id: 'floor', name: 'Floor push-up', target: '3 × 10–20', metric: 'reps', targetValue: 10, requiredEquipment: ['bodyweight'] },
    { id: 'tempo', name: 'Tempo push-up', target: '3 × 8–15 controlled', metric: 'reps', targetValue: 8, requiredEquipment: ['bodyweight'] },
    { id: 'weighted', name: 'Weighted/advanced push-up', target: 'Progress added load or variation safely', metric: 'external-load-kg', targetValue: 1, requiredEquipment: ['bodyweight'] },
  ] },
  { id: 'dip', name: 'Dip', domain: 'bodyweight', steps: [
    { id: 'support', name: 'Support hold', target: '3 × 20–30 sec comfortable', metric: 'seconds', targetValue: 20, requiredEquipment: ['bodyweight', 'dip-station'] },
    { id: 'assisted', name: 'Assisted dip', target: '3 × 6–10 with stable or decreasing assistance', metric: 'reps', targetValue: 6, requiredEquipment: ['bodyweight', 'dip-station'] },
    { id: 'strict', name: 'Strict dip', target: '3 × 5–10', metric: 'reps', targetValue: 5, requiredEquipment: ['bodyweight', 'dip-station'] },
    { id: 'weighted', name: 'Weighted dip', target: 'Progress load only with comfortable shoulders', metric: 'external-load-kg', targetValue: 1, requiredEquipment: ['bodyweight', 'dip-station'] },
  ] },
  { id: 'hang-skill', name: 'Hang / grip', domain: 'bodyweight', steps: [
    { id: 'active', name: 'Active hang', target: '3 × 20–30 sec', metric: 'seconds', targetValue: 20, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'dead', name: 'Dead hang', target: '45–60 sec', metric: 'seconds', targetValue: 45, requiredEquipment: ['bodyweight', 'pullup-bar'] },
    { id: 'long', name: 'Long hang', target: '60–90 sec without discomfort', metric: 'seconds', targetValue: 60, requiredEquipment: ['bodyweight', 'pullup-bar'] },
  ] },
];

export function nextSkillStep(treeId: string, stepId: string): SkillStep | undefined {
  const tree = skillTrees.find(item => item.id === treeId);
  if (!tree) return undefined;
  const index = Math.max(0, tree.steps.findIndex(step => step.id === stepId));
  return tree.steps[Math.min(tree.steps.length - 1, index + 1)];
}
