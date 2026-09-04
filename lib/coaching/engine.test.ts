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

function lowerEntry(at: string): HistoryEntry {
  return {
    session: 'lower-a',
    status: 'completed',
    completedAt: at,
    exercises: [{
      id: 'squat', name: 'Barbell Back Squat', movement: 'squat', equipment: ['barbell','rack'], priority: 'primary', repRange: [5,8], sets: 4,
      logs: Array.from({ length: 4 }, () => ({ weight: 80, reps: 6, rir: 2, formQuality: 'good' as const, completedAt: at })),
    }, {
      id: 'rdl', name: 'Romanian Deadlift', movement: 'hinge', equipment: ['barbell'], priority: 'secondary', repRange: [6,10], sets: 3,
      logs: Array.from({ length: 3 }, () => ({ weight: 70, reps: 8, rir: 2, formQuality: 'good' as const, completedAt: at })),
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

  it('distinguishes progression and regression from a plateau', () => {
    const improving = [benchEntry('2026-08-01T12:00:00Z', 70), benchEntry('2026-08-08T12:00:00Z', 72.5), benchEntry('2026-08-22T12:00:00Z', 77.5), benchEntry('2026-09-01T12:00:00Z', 80)];
    const regressing = [benchEntry('2026-08-01T12:00:00Z', 80), benchEntry('2026-08-08T12:00:00Z', 80), benchEntry('2026-08-22T12:00:00Z', 75), benchEntry('2026-09-01T12:00:00Z', 72.5)];
    expect(assessPlateaus(improving, [], new Date('2026-09-03T12:00:00Z'))[0].status).toBe('progressing');
    expect(assessPlateaus(regressing, [], new Date('2026-09-03T12:00:00Z'))[0].status).toBe('regressing');
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

  it('keeps current connected-health directions descriptive rather than calling them medically better or worse', () => {
    const snapshot = createCoachingSnapshot({
      history: [], activity: [], readiness: [], preferences: defaultPreferences, now: new Date('2026-09-03T12:00:00Z'),
      connectedSignals: [{ id: 'resting-heart-rate', label: 'Resting heart rate', status: 'current', direction: 'down', currentAverage: 58, previousAverage: 62, unit: 'bpm', sampleDays: 7, note: 'Seven-day average moved down.' }],
    });
    const trend = snapshot.trends.find(item => item.id === 'connected-trend:resting-heart-rate');
    expect(trend?.direction).toBe('mixed');
    expect(trend?.message).toContain('value-neutral');
    expect(trend?.message).not.toContain('improving');
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

  it('uses explicit life mode before generic deficit chasing', () => {
    const preferences = { ...defaultPreferences, lifeMode: 'travel' as const };
    const snapshot = createCoachingSnapshot({ history: [], activity: [], readiness: [], preferences, now: new Date('2026-09-03T12:00:00Z') });
    expect(snapshot.actions[0].id).toBe('life-mode');
    expect(snapshot.actions[0].instruction).toContain('portable substitutions');
  });

  it('avoids stacking another hard lower-body stressor after recent demanding lower work', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    const snapshot = createCoachingSnapshot({ history: [lowerEntry('2026-09-03T06:00:00Z')], activity: [], readiness: [], preferences: defaultPreferences, now });
    expect(snapshot.actions.some(action => action.id === 'avoid-stacking')).toBe(true);
    expect(snapshot.evidence.find(item => item.id === 'recent-load')?.observation).toContain('Lower-body training');
  });
});
