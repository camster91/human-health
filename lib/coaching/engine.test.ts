import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '../domain';
import { defaultPreferences } from '../preferences';
import { assessPlateaus, balanceGoals, createCoachingSnapshot } from './engine';

function benchEntry(at: string, weight: number, reps = 5): HistoryEntry {
  return {
    session: 'upper-a',
    status: 'completed',
    completedAt: at,
    exercises: [{
      id: 'bench', name: 'Barbell Bench Press', movement: 'horizontal-push', equipment: ['barbell','bench','rack'], priority: 'primary', repRange: [5,8], sets: 3,
      logs: Array.from({ length: 3 }, () => ({ weight, reps, rir: 2, formQuality: 'good' as const, completedAt: at })),
    }],
  };
}

describe('Phase 4 plateau and deload logic', () => {
  it('requires repeated comparable evidence before calling a plateau', () => {
    const result = assessPlateaus([benchEntry('2026-09-01T12:00:00Z', 80), benchEntry('2026-09-08T12:00:00Z', 80)], [], new Date('2026-09-10T12:00:00Z'));
    expect(result[0].status).toBe('insufficient');
    expect(result[0].deloadSuggested).toBe(false);
  });

  it('detects a plateau but only suggests deload when recovery evidence also aligns', () => {
    const history = [
      benchEntry('2026-08-01T12:00:00Z', 80), benchEntry('2026-08-08T12:00:00Z', 80), benchEntry('2026-08-22T12:00:00Z', 80), benchEntry('2026-09-01T12:00:00Z', 80),
    ];
    expect(assessPlateaus(history, [], new Date('2026-09-03T12:00:00Z'))[0]).toMatchObject({ status: 'plateau', deloadSuggested: false });
    const readiness = [
      { recordedAt: '2026-09-01T08:00:00Z', input: { sleep: 'poor' as const, fatigue: 'high' as const } },
      { recordedAt: '2026-09-02T08:00:00Z', input: { stress: 'high' as const } },
      { recordedAt: '2026-09-03T08:00:00Z', input: { soreness: 'high' as const } },
    ];
    expect(assessPlateaus(history, readiness, new Date('2026-09-03T12:00:00Z'))[0].deloadSuggested).toBe(true);
  });
});

describe('Phase 4 goal balancing and actions', () => {
  it('uses goal preferences as planning weights without creating a health score', () => {
    const preferences = { ...defaultPreferences, domainPriorities: { ...defaultPreferences.domainPriorities, strength: 'focus' as const, cardio: 'maintain' as const, power: 'off' as const, balance: 'deprioritize' as const } };
    const goals = balanceGoals({ history: [], activity: [], readiness: [], preferences, now: new Date('2026-09-03T12:00:00Z') }, 'normal');
    expect(goals[0].domain).toBe('strength');
    expect(goals.some(goal => goal.domain === 'power')).toBe(false);
    expect(goals.some(goal => goal.domain === 'balance')).toBe(false);
    expect(goals.reduce((sum, goal) => sum + goal.share, 0)).toBeLessThanOrEqual(100);
  });

  it('makes stale connected signals visible but does not let them drive current confidence', () => {
    const snapshot = createCoachingSnapshot({
      history: [], activity: [], readiness: [], preferences: defaultPreferences, now: new Date('2026-09-03T12:00:00Z'),
      connectedSignals: [{ id: 'sleep', label: 'Sleep', status: 'stale', direction: 'down', currentAverage: 300, previousAverage: 420, unit: 'minute', sampleDays: 7, note: 'Old watch data' }],
    });
    expect(snapshot.evidence.find(item => item.id === 'connected:sleep')?.confidence).toBe('insufficient');
    expect(snapshot.trends.find(item => item.id === 'connected-trend:sleep')?.direction).toBe('unknown');
  });

  it('puts recovery first and keeps all actions reversible', () => {
    const snapshot = createCoachingSnapshot({
      history: [], activity: [], preferences: defaultPreferences, now: new Date('2026-09-03T12:00:00Z'),
      readiness: [{ recordedAt: '2026-09-03T08:00:00Z', input: { pain: true } }],
    });
    expect(snapshot.actions[0].kind).toBe('recover');
    expect(snapshot.actions.every(action => action.reversible)).toBe(true);
    expect(snapshot.safetyBoundary).toContain('insulin');
  });
});
