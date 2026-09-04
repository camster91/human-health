import { cardioCoverage, consistencyPattern, normalizedStrengthTrend, recoveryPattern } from '../capability-trends';
import { comparableStrengthLogs } from '../engine';
import { recentTrainingLoad } from '../load-management';
import { domainDeficits } from '../performance';
import type { DomainPriority } from '../preferences';
import { readinessDecisionFromRecords } from '../whole-person';
import type { CapabilityDomain } from '../whole-person';
import type { CoachAction, CoachEvidence, CoachTrend, CoachingInput, CoachingSnapshot, GoalAllocation, PlateauAssessment } from './types';

function confidence(samples: number) {
  if (samples <= 0) return 'insufficient' as const;
  if (samples < 3) return 'low' as const;
  if (samples < 6) return 'medium' as const;
  return 'high' as const;
}

function e1rm(weight: number, reps: number) {
  return weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
}

export function assessPlateaus(history: CoachingInput['history'], readiness: CoachingInput['readiness'], now = new Date()): PlateauAssessment[] {
  const constrained = recoveryPattern(readiness, now);
  const byExercise = new Map<string, { name: string; at: number; value: number }[]>();
  history.filter(entry => (entry.status || 'completed') !== 'abandoned').forEach(entry => {
    const at = Date.parse(entry.completedAt);
    if (!Number.isFinite(at) || at > now.getTime()) return;
    entry.exercises.filter(exercise => exercise.priority === 'primary').forEach(exercise => {
      const best = comparableStrengthLogs(exercise).reduce((max, set) => Math.max(max, e1rm(set.weight, set.reps)), 0);
      if (!best) return;
      const values = byExercise.get(exercise.id) || [];
      values.push({ name: exercise.name, at, value: best });
      byExercise.set(exercise.id, values);
    });
  });

  return [...byExercise.entries()].map(([exerciseId, values]) => {
    const sorted = values.sort((a, b) => a.at - b.at).slice(-6);
    const exposures = sorted.length;
    const spanDays = exposures > 1 ? Math.round((sorted.at(-1)!.at - sorted[0].at) / 86_400_000) : 0;
    if (exposures < 4 || spanDays < 14) return { exerciseId, exerciseName: sorted.at(-1)?.name || exerciseId, status: 'insufficient', exposures, spanDays, changePercent: null, deloadSuggested: false, reasons: ['At least four comparable exposures across 14 days are required before calling a plateau.'] };
    const early = sorted.slice(0, 2).reduce((sum, item) => sum + item.value, 0) / 2;
    const recent = sorted.slice(-2).reduce((sum, item) => sum + item.value, 0) / 2;
    const changePercent = early > 0 ? (recent - early) / early * 100 : 0;
    const recentDirection = sorted.at(-1)!.value - sorted.at(-2)!.value;
    const recoveryConstrained = constrained.checkIns >= 3 && constrained.normalShare !== null && constrained.normalShare < 0.5;
    let status: PlateauAssessment['status'] = 'stable';
    if (changePercent >= 2) status = 'progressing';
    else if (changePercent <= -5) status = 'regressing';
    else if (Math.abs(changePercent) < 2 && Math.abs(recentDirection / Math.max(1, sorted.at(-2)!.value)) < 0.02) status = 'plateau';
    const deloadSuggested = (status === 'plateau' || status === 'regressing') && recoveryConstrained;
    const reasons = [
      `${exposures} comparable exposures across ${spanDays} days changed ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%.`,
      recoveryConstrained ? 'Most recent readiness check-ins were constrained.' : 'Recovery data does not currently add strong support for a deload.',
      deloadSuggested ? 'A short advisory deload is reasonable; it is not applied automatically.' : 'Keep collecting comparable exposures before changing the programme aggressively.',
    ];
    return { exerciseId, exerciseName: sorted.at(-1)!.name, status, exposures, spanDays, changePercent, deloadSuggested, reasons };
  });
}

export function balanceGoals(input: CoachingInput, readinessLevel: 'normal' | 'reduced' | 'recovery'): GoalAllocation[] {
  if (readinessLevel === 'recovery') return [];
  const deficits = new Set(domainDeficits(input.activity, input.now || new Date(), { cardioTargetMinutes: input.preferences.cardioTargetMinutes, priorities: input.preferences.domainPriorities }));
  const weights: Record<DomainPriority, number> = { focus: 4, maintain: 2, deprioritize: 0, off: 0 };
  const entries = Object.entries(input.preferences.domainPriorities) as [CapabilityDomain, DomainPriority][];
  const domains = entries
    .map(([domain, priority]) => ({ domain, priority, weight: weights[priority] + (deficits.has(domain) ? 1 : 0) }))
    .filter(item => item.weight > 0 && item.priority !== 'off' && item.priority !== 'deprioritize');
  const total = domains.reduce((sum, item) => sum + item.weight, 0) || 1;
  return domains.sort((a, b) => b.weight - a.weight).slice(0, 5).map(item => ({
    domain: item.domain,
    priority: item.priority,
    share: Math.round(item.weight / total * 100),
    reason: `${item.priority === 'focus' ? 'Focus priority' : 'Maintenance priority'}${deficits.has(item.domain) ? ' and currently below its configured target' : ''}.`,
  }));
}

export function createCoachingSnapshot(input: CoachingInput): CoachingSnapshot {
  const now = input.now || new Date();
  const readiness = readinessDecisionFromRecords(input.readiness, now);
  const evidence: CoachEvidence[] = [];
  const trends: CoachTrend[] = [];

  const strength = normalizedStrengthTrend(input.history, now);
  evidence.push({ id: 'strength', domain: 'strength', label: 'Primary-lift trend', observation: strength.message, sampleCount: strength.exerciseCount, window: 'all comparable primary-lift history', confidence: confidence(strength.exerciseCount), current: strength.percentChange, unit: '%' });
  trends.push({ id: 'strength-trend', domain: 'strength', label: 'Strength', direction: strength.percentChange === null ? 'unknown' : strength.percentChange > 2 ? 'improving' : strength.percentChange < -2 ? 'declining' : 'stable', confidence: confidence(strength.exerciseCount), message: strength.message, evidenceIds: ['strength'] });

  const cardio = cardioCoverage(input.activity, input.preferences.cardioTargetMinutes, now);
  const cardioSamples = input.activity.filter(item => {
    const at = Date.parse(item.completedAt);
    return item.domain === 'cardio' && Number.isFinite(at) && at <= now.getTime();
  }).length;
  evidence.push({ id: 'cardio', domain: 'cardio', label: 'Planned aerobic coverage', observation: `${Math.round(cardio.equivalentMinutes)} of ${cardio.target} equivalent planned minutes recorded in the current seven-day window.`, sampleCount: cardioSamples, window: '7 days', confidence: confidence(cardioSamples), current: cardio.coverage * 100, unit: '%' });
  trends.push({ id: 'cardio-trend', domain: 'cardio', label: 'Cardio target coverage', direction: cardio.coverage >= 1 ? 'stable' : 'unknown', confidence: confidence(cardioSamples), message: `${Math.round(cardio.remaining)} equivalent planned minutes remain against the configured weekly target.`, evidenceIds: ['cardio'] });

  const consistency = consistencyPattern(input.history, now);
  evidence.push({ id: 'consistency', domain: 'consistency', label: 'Training consistency', observation: consistency.message, sampleCount: consistency.sessions, window: '28 days vs preceding 28 days', confidence: confidence(consistency.sessions), current: consistency.sessions, previous: consistency.previousSessions, unit: 'sessions' });
  trends.push({ id: 'consistency-trend', domain: 'consistency', label: 'Consistency', direction: consistency.change > 0 ? 'improving' : consistency.change < 0 ? 'declining' : consistency.sessions ? 'stable' : 'unknown', confidence: confidence(consistency.sessions), message: consistency.message, evidenceIds: ['consistency'] });

  const recovery = recoveryPattern(input.readiness, now);
  evidence.push({ id: 'recovery', domain: 'recovery', label: 'Readiness pattern', observation: recovery.message, sampleCount: recovery.checkIns, window: '7 days', confidence: confidence(recovery.checkIns), current: recovery.normalShare === null ? null : recovery.normalShare * 100, unit: '% normal check-ins' });
  trends.push({ id: 'recovery-trend', domain: 'recovery', label: 'Recovery', direction: recovery.checkIns === 0 ? 'unknown' : recovery.normalShare !== null && recovery.normalShare >= 0.7 ? 'stable' : recovery.normalShare !== null && recovery.normalShare < 0.5 ? 'declining' : 'mixed', confidence: confidence(recovery.checkIns), message: recovery.message, evidenceIds: ['recovery'] });

  const workload = recentTrainingLoad(input.history, input.activity, now);
  const workloadSamples = workload.lowerSets + workload.upperSets + (workload.hardCardioMinutes ? 1 : 0);
  evidence.push({ id: 'recent-load', domain: 'recovery', label: 'Recent training load', observation: workload.message, sampleCount: workloadSamples, window: '36–48 hours', confidence: confidence(workloadSamples), current: workload.lowerSets + workload.upperSets, unit: 'working sets' });

  for (const signal of input.connectedSignals || []) {
    const comparable = signal.direction !== 'insufficient';
    const usable = signal.status === 'current' && comparable;
    const direction: CoachTrend['direction'] = !usable ? 'unknown' : signal.direction === 'stable' ? 'stable' : 'mixed';
    const message = signal.status !== 'current'
      ? `This connected signal is ${signal.status} and does not drive a current action.`
      : !comparable
        ? `${signal.note} A comparable prior window is not available, so no direction is inferred.`
        : `${signal.note} Recorded direction: ${signal.direction}. Human Health keeps this direction value-neutral rather than labelling it medically better or worse.`;
    evidence.push({ id: `connected:${signal.id}`, domain: 'connected-health', label: signal.label, observation: signal.status === 'current' ? signal.note : `${signal.status}: ${signal.note}`, sampleCount: signal.sampleDays, window: 'provider trend window', confidence: usable ? confidence(signal.sampleDays) : 'insufficient', current: signal.currentAverage, previous: signal.previousAverage, unit: signal.unit });
    trends.push({ id: `connected-trend:${signal.id}`, domain: 'connected-health', label: signal.label, direction, confidence: usable ? confidence(signal.sampleDays) : 'insufficient', message, evidenceIds: [`connected:${signal.id}`] });
  }

  const plateaus = assessPlateaus(input.history, input.readiness, now);
  const goals = balanceGoals(input, readiness.level);
  const actions: CoachAction[] = [];
  if (readiness.level === 'recovery') {
    actions.push({
      id: 'safety-hold',
      kind: 'recover',
      priority: 1,
      title: 'Automatic exercise suggestions paused',
      instruction: 'Do not use Human Health as exercise clearance while pain or illness is flagged. Use your established care/safety plan or appropriate professional support before resuming app-generated training suggestions.',
      rationale: readiness.reasons.join(' ') || 'A recent readiness record includes pain or illness.',
      evidenceIds: ['recovery'],
      reversible: false,
    });
  } else if (readiness.level === 'reduced') {
    actions.push({ id: 'reduced-load', kind: 'hold', priority: 1, title: 'Keep progression conservative', instruction: 'Use the reduced-readiness volume path and hold automatic load progression for this exposure.', rationale: readiness.reasons.join(' ') || 'Recent readiness data supports a conservative session.', evidenceIds: ['recovery'], reversible: true });
  }

  if (readiness.level !== 'recovery' && readiness.level === 'normal' && input.preferences.lifeMode !== 'normal') {
    const copy = input.preferences.lifeMode === 'travel'
      ? 'Use portable substitutions and preserve movement patterns rather than forcing normal-gym loads.'
      : input.preferences.lifeMode === 'return'
        ? 'Rebuild tolerance with reduced volume before resuming normal progression.'
        : 'Preserve key strength and cardio capability with a lower total training burden.';
    actions.push({ id: 'life-mode', kind: 'schedule', priority: actions.length ? 2 : 1, title: `${input.preferences.lifeMode.replaceAll('-', ' ')} mode is active`, instruction: copy, rationale: 'The selected life mode is an explicit user preference and should shape recommendations before deficit chasing.', evidenceIds: ['consistency'], reversible: true });
  }

  if (readiness.level === 'normal' && ((workload.lowerBodyRecent && workload.lowerSets >= 6) || (workload.hoursSinceHardCardio !== null && workload.hoursSinceHardCardio < 24 && workload.hardCardioMinutes >= 15))) {
    actions.push({ id: 'avoid-stacking', kind: 'hold', priority: actions.length ? 2 : 1, title: 'Avoid stacking another hard lower-body stressor', instruction: 'Prefer upper-body, easy aerobic, mobility, balance, or other low-fatigue work until the recent lower-body load is less concentrated.', rationale: workload.message, evidenceIds: ['recent-load'], reversible: true });
  }

  if (readiness.level !== 'recovery') {
    const deloads = plateaus.filter(item => item.deloadSuggested);
    if (deloads.length) actions.push({ id: 'deload', kind: 'deload', priority: actions.length ? 2 : 1, title: 'Consider a short deload', instruction: `Reduce volume and/or load briefly for ${deloads.map(item => item.exerciseName).join(', ')}, then reassess comparable performance.`, rationale: 'Repeated performance stagnation/regression aligns with constrained recovery evidence. The app does not apply this automatically.', evidenceIds: ['strength', 'recovery'], reversible: true });

    const leading = goals[0];
    if (leading) actions.push({ id: 'goal-balance', kind: 'balance-goals', priority: actions.length ? 2 : 1, title: `Prioritize ${leading.domain.replaceAll('-', ' ')}`, instruction: `Allocate the next available training opportunity to ${leading.domain.replaceAll('-', ' ')} while maintaining the other enabled goals.`, rationale: leading.reason, evidenceIds: leading.domain === 'strength' ? ['strength'] : leading.domain === 'cardio' ? ['cardio'] : ['consistency'], reversible: true });

    if (consistency.sessions < 4) actions.push({ id: 'minimum-dose', kind: 'minimum-dose', priority: 3, title: 'Protect consistency with a minimum dose', instruction: 'When time is tight, prefer a short valid session over trying to make up missed work later.', rationale: consistency.message, evidenceIds: ['consistency'], reversible: true });
  }

  return {
    generatedAt: now.toISOString(),
    evidence,
    trends,
    plateaus,
    goals,
    actions: actions.slice(0, 4),
    readinessLevel: readiness.level,
    safetyBoundary: 'Coaching recommendations are fitness guidance only. Pain or illness pauses automatic exercise suggestions; Human Health does not diagnose conditions, clear injuries, prescribe medication/insulin, calculate treatment carbohydrates, or provide emergency monitoring.',
  };
}
