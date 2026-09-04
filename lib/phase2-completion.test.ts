import { describe, expect, it } from 'vitest';
import { domainDeficits, minimumEffectiveDay } from './performance';
import { defaultPreferences } from './preferences';
import { ActivityDose, cardioEquivalentMinutes, mobilityPrescription, readinessDecision, skillTrees } from './whole-person';

function plannedCardioEquivalentMinutes(activity: ActivityDose[]) {
  return activity
    .filter(item => item.domain === 'cardio' && (item.kind || 'planned') === 'planned')
    .reduce((sum, item) => sum + cardioEquivalentMinutes(item.minutes || 0, item.effort || 'moderate'), 0);
}

function incidentalMovementMinutes(activity: ActivityDose[]) {
  return activity
    .filter(item => item.kind === 'incidental')
    .reduce((sum, item) => sum + (item.minutes || 0), 0);
}

describe('Phase 2 completion behaviours', () => {
  it('distinguishes planned cardio from incidental movement', () => {
    const activity: ActivityDose[] = [
      { domain: 'cardio', kind: 'planned', effort: 'moderate', minutes: 30, completedAt: '2026-09-03T12:00:00Z' },
      { domain: 'cardio', kind: 'incidental', effort: 'easy', minutes: 40, completedAt: '2026-09-03T13:00:00Z' },
    ];
    expect(plannedCardioEquivalentMinutes(activity)).toBe(30);
    expect(incidentalMovementMinutes(activity)).toBe(40);
  });

  it('uses sleep duration and subjective readiness conservatively', () => {
    expect(readinessDecision({ sleepHours: 5.5, subjective: 2 }).level).toBe('reduced');
  });

  it('provides distinct preparation and longer mobility sessions', () => {
    const preparation = mobilityPrescription('lower-a', 'prepare', 6);
    const longer = mobilityPrescription('lower-a', 'restore', 12);
    expect(preparation.kind).toBe('prepare');
    expect(longer.kind).toBe('restore');
    expect(longer.minutes).toBeGreaterThan(preparation.minutes);
    expect(longer.items).not.toEqual(preparation.items);
  });

  it('covers the planned bodyweight skill families', () => {
    expect(skillTrees.map(tree => tree.id)).toEqual(expect.arrayContaining(['pull-up', 'chin-up', 'push-up', 'dip', 'hang-skill']));
  });

  it('lets deprioritized domains stop driving catch-up plans', () => {
    const priorities = { ...defaultPreferences.domainPriorities, cardio: 'deprioritize' as const };
    expect(domainDeficits([], new Date('2026-09-03T12:00:00Z'), { priorities })).not.toContain('cardio');
    const plan = minimumEffectiveDay({ availableMinutes: 20, activity: [], readiness: { level: 'normal', volumeMultiplier: 1, allowProgression: true, reasons: [] }, priorities, equipment: ['bodyweight'] });
    expect(plan.domains).not.toContain('cardio');
  });
});
