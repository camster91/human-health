import { describe, expect, it } from 'vitest';
import { defaultPreferences } from './preferences';
import { availableSkillTrees, domainDeficits, minimumEffectiveDay, recommendSkillProgression } from './performance';

describe('measured bodyweight progression', () => {
  it('advances only after two clean comparable assessments', () => {
    const assessments = [
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 20, variation: 'band-blue', recordedAt: '2026-09-01T12:00:00Z' },
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 20, variation: 'band-blue', recordedAt: '2026-09-02T12:00:00Z' },
    ];
    expect(recommendSkillProgression('pull-up', 'assisted', assessments, new Date('2026-09-03T12:00:00Z')).stepId).toBe('strict');
  });

  it('allows a meaningful decrease in recorded assistance when test conditions match', () => {
    const assessments = [
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 20, variation: 'assisted-machine', recordedAt: '2026-09-01T12:00:00Z' },
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 15, variation: 'assisted-machine', recordedAt: '2026-09-02T12:00:00Z' },
    ];
    expect(recommendSkillProgression('pull-up', 'assisted', assessments, new Date('2026-09-03T12:00:00Z')).action).toBe('advance');
  });

  it('holds when assistance records/test conditions differ or discomfort is reported', () => {
    const mixed = [
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 20, variation: 'band-blue', recordedAt: '2026-09-01T12:00:00Z' },
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, variation: 'band-blue', recordedAt: '2026-09-02T12:00:00Z' },
    ];
    const now = new Date('2026-09-03T12:00:00Z');
    expect(recommendSkillProgression('pull-up', 'assisted', mixed, now).action).toBe('hold');
    expect(recommendSkillProgression('pull-up', 'assisted', [{ ...mixed[0], pain: true }], now).action).toBe('hold');
  });

  it('does not advance assisted skills when the latest test required more assistance', () => {
    const assessments = [
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 20, recordedAt: '2026-09-01T12:00:00Z' },
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 8, assistanceKg: 22.5, recordedAt: '2026-09-02T12:00:00Z' },
    ];
    expect(recommendSkillProgression('pull-up', 'assisted', assessments, new Date('2026-09-03T12:00:00Z')).action).toBe('hold');
  });

  it('fails closed for a stale/unknown saved skill step and ignores future assessments', () => {
    expect(recommendSkillProgression('pull-up', 'removed-step', [], new Date('2026-09-03T12:00:00Z')).action).toBe('hold');
    const future = [
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 10, assistanceKg: 10, recordedAt: '2027-01-01T12:00:00Z' },
      { treeId: 'pull-up', stepId: 'assisted', passed: true, clean: true, pain: false, metric: 'reps' as const, value: 10, assistanceKg: 10, recordedAt: '2027-01-02T12:00:00Z' },
    ];
    expect(recommendSkillProgression('pull-up', 'assisted', future, new Date('2026-09-03T12:00:00Z')).action).toBe('hold');
  });

  it('filters skill trees by actual equipment', () => {
    expect(availableSkillTrees(['bodyweight']).map(tree => tree.id)).toEqual(['push-up']);
    expect(availableSkillTrees(['bodyweight', 'pullup-bar']).some(tree => tree.id === 'pull-up')).toBe(true);
  });
});

describe('whole-person daily planning', () => {
  it('honours custom cardio targets, planned activity and disabled domains', () => {
    const activity = [{ domain: 'cardio' as const, minutes: 200, effort: 'moderate' as const, kind: 'incidental' as const, completedAt: '2026-09-02T12:00:00Z' }];
    const deficits = domainDeficits(activity, new Date('2026-09-03T12:00:00Z'), { cardioTargetMinutes: 30, priorities: { cardio: 'focus', power: 'off' } });
    expect(deficits).toContain('cardio');
    expect(deficits).not.toContain('power');
  });

  it('does not let future activity satisfy current targets', () => {
    const activity = [{ domain: 'cardio' as const, minutes: 300, effort: 'moderate' as const, kind: 'planned' as const, completedAt: '2027-09-02T12:00:00Z' }];
    expect(domainDeficits(activity, new Date('2026-09-03T12:00:00Z'), { cardioTargetMinutes: 30 })).toContain('cardio');
  });

  it('uses focus priorities before maintenance work', () => {
    const priorities = { ...defaultPreferences.domainPriorities, mobility: 'focus' as const, cardio: 'maintain' as const, strength: 'maintain' as const };
    const deficits = domainDeficits([], new Date('2026-09-03T12:00:00Z'), { priorities });
    expect(deficits[0]).toBe('mobility');
  });

  it('fits a minimum-effective plan inside the actual time and equipment', () => {
    const plan = minimumEffectiveDay({ availableMinutes: 18, activity: [], readiness: { level: 'normal', volumeMultiplier: 1, allowProgression: true, reasons: [] }, mode: 'travel', equipment: ['bodyweight'], priorities: defaultPreferences.domainPriorities, now: new Date('2026-09-03T12:00:00Z') });
    expect(plan.minutes).toBeLessThan(19);
    expect(plan.sessionIds.length).toBeGreaterThan(0);
  });

  it('withholds automatic exercise suggestions when pain/illness puts readiness in recovery', () => {
    const plan = minimumEffectiveDay({ availableMinutes: 20, activity: [], readiness: { level: 'recovery', volumeMultiplier: 0.5, allowProgression: false, reasons: ['pain'] }, equipment: ['bodyweight'], now: new Date('2026-09-03T12:00:00Z') });
    expect(plan.domains).toEqual([]);
    expect(plan.sessionIds).toEqual([]);
    expect(plan.minutes).toBe(0);
    expect(plan.message).toContain('pauses automatic exercise suggestions');
  });
});
