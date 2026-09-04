import { Assessment } from './whole-person';

export type AthleticLevel = 'foundation' | 'develop' | 'express';
export type AthleticProgressionDecision = {
  metricId: 'single-leg-balance' | 'jump';
  action: 'hold' | 'advance' | 'regress';
  level: AthleticLevel;
  nextLevel: AthleticLevel;
  message: string;
  evidenceCount: number;
};

const levelOrder: AthleticLevel[] = ['foundation', 'develop', 'express'];
const minimumRelativeGain: Record<'single-leg-balance' | 'jump', number> = { 'single-leg-balance': 0.05, jump: 0.02 };
function move(level: AthleticLevel, delta: number) {
  const index = levelOrder.indexOf(level);
  return levelOrder[Math.max(0, Math.min(levelOrder.length - 1, index + delta))];
}

export function recommendAthleticProgression(options: {
  metricId: 'single-leg-balance' | 'jump';
  assessments: Assessment[];
  currentLevel?: AthleticLevel;
  readiness: 'normal' | 'reduced' | 'recovery';
  highImpactAllowed?: boolean;
}): AthleticProgressionDecision {
  const level = options.currentLevel || 'foundation';
  const values = options.assessments
    .filter(item => item.metricId === options.metricId)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .slice(-4);

  if (options.readiness !== 'normal' || (options.metricId === 'jump' && options.highImpactAllowed === false)) {
    return { metricId: options.metricId, action: 'hold', level, nextLevel: level, evidenceCount: values.length, message: options.highImpactAllowed === false && options.metricId === 'jump' ? 'High-impact progression is disabled in preferences.' : 'Hold athletic progression while recovery is reduced. Keep the current level and prioritize clean, low-fatigue practice.' };
  }
  if (values.length < 3) return { metricId: options.metricId, action: 'hold', level, nextLevel: level, evidenceCount: values.length, message: 'Keep the current level until at least three comparable benchmark results are available.' };

  const baseline = values.slice(0, -2).reduce((sum, item) => sum + item.value, 0) / Math.max(1, values.length - 2);
  if (baseline <= 0) return { metricId: options.metricId, action: 'hold', level, nextLevel: level, evidenceCount: values.length, message: 'Benchmark values need a positive baseline before the app can compare progression.' };
  const required = baseline * (1 + minimumRelativeGain[options.metricId]);
  const recent = values.slice(-2);
  const improved = recent.every(item => item.value >= required);
  const regressed = recent.every(item => item.value <= baseline * 0.9);

  if (improved) {
    const nextLevel = move(level, 1);
    return nextLevel === level
      ? { metricId: options.metricId, action: 'hold', level, nextLevel: level, evidenceCount: values.length, message: 'Repeated benchmark improvement is confirmed. Stay at the top level and progress quality or difficulty gradually rather than adding volume automatically.' }
      : { metricId: options.metricId, action: 'advance', level, nextLevel, evidenceCount: values.length, message: 'Two recent benchmarks improved beyond the earlier baseline. Advance one athletic level while keeping volume low and technique crisp.' };
  }
  if (regressed) {
    const nextLevel = move(level, -1);
    return { metricId: options.metricId, action: nextLevel === level ? 'hold' : 'regress', level, nextLevel, evidenceCount: values.length, message: 'Two recent benchmarks are meaningfully below the earlier baseline. Reduce complexity or impact temporarily and rebuild quality.' };
  }
  return { metricId: options.metricId, action: 'hold', level, nextLevel: level, evidenceCount: values.length, message: 'The evidence is mixed or stable. Keep the current level and reassess after another comparable benchmark.' };
}

export function athleticLevelSession(metricId: 'single-leg-balance' | 'jump', level: AthleticLevel) {
  if (metricId === 'single-leg-balance') {
    if (level === 'foundation') return ['Supported single-leg balance 3 × 20–30 sec/side', 'Controlled step-down 2 × 6/side'];
    if (level === 'develop') return ['Single-leg balance with reach 3 × 5/side', 'Slow step-down 3 × 6/side', 'Controlled lateral step 2 × 6/side'];
    return ['Reactive single-leg balance 3 × 15–20 sec/side', 'Low-amplitude direction-change drill 3 × 4/side', 'Single-leg landing stick 3 × 3/side'];
  }
  if (level === 'foundation') return ['Snap-down 3 × 3', 'Fast bodyweight squat 3 × 5', 'Low pogo 2 × 5'];
  if (level === 'develop') return ['Countermovement jump 4 × 3 with full rest', 'Low broad jump 3 × 3', 'Fast concentric squat 3 × 4'];
  return ['Countermovement jump 5 × 2 with full rest', 'Low-volume lateral or broad jump 3 × 2/side', 'Optional loaded jump or explosive lift only when technically appropriate'];
}
