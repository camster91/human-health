import { describe, expect, it } from 'vitest';
import { HistoryEntry } from './domain';
import { coordinateCardio, powerAllowed, recentTrainingLoad, strengthLoadAdjustment } from './load-management';
import { cardioOptions } from './whole-person';

const lower: HistoryEntry = { session: 'lower-a', status: 'completed', completedAt: '2026-09-03T06:00:00-04:00', exercises: [
  { id: 'squat', name: 'Squat', movement: 'squat', equipment: ['barbell'], priority: 'primary', repRange: [5, 8], sets: 4, logs: [{ weight: 20, reps: 10, warmup: true, completedAt: '2026-09-03T06:10:00-04:00' }, ...Array.from({ length: 4 }, () => ({ weight: 80, reps: 6, completedAt: '2026-09-03T06:30:00-04:00' }))] },
  { id: 'rdl', name: 'RDL', movement: 'hinge', equipment: ['barbell'], priority: 'secondary', repRange: [6, 10], sets: 3, logs: Array.from({ length: 3 }, () => ({ weight: 70, reps: 8, completedAt: '2026-09-03T06:45:00-04:00' })) },
] };
const now = new Date('2026-09-03T08:00:00-04:00');

describe('cross-domain load management', () => {
  it('detects working sets without counting warm-ups', () => {
    const load = recentTrainingLoad([lower], [], now);
    expect(load.lowerSets).toBe(7);
    expect(load.hoursSinceLower).toBe(2);
  });

  it('defers intervals and power after demanding recent lower-body work', () => {
    const load = recentTrainingLoad([lower], [], now);
    expect(coordinateCardio(cardioOptions(0, 150, 'normal', 30), load, 'normal').some(option => option.type === 'intervals')).toBe(false);
    expect(powerAllowed(load, 'normal').allowed).toBe(false);
  });

  it('uses hard planned cardio but ignores incidental movement', () => {
    const activity = [
      { domain: 'cardio' as const, minutes: 25, effort: 'hard' as const, kind: 'planned' as const, completedAt: '2026-09-03T00:00:00-04:00' },
      { domain: 'cardio' as const, minutes: 90, effort: 'hard' as const, kind: 'incidental' as const, completedAt: '2026-09-03T00:00:00-04:00' },
    ];
    const load = recentTrainingLoad([], activity, now);
    expect(load.hardCardioMinutes).toBe(25);
    expect(strengthLoadAdjustment('lower-b', load, 'normal').pauseProgression).toBe(true);
    expect(strengthLoadAdjustment('upper-a', load, 'normal').reduce).toBe(false);
  });

  it('always disables explosive work when the user disabled high impact', () => {
    expect(powerAllowed(recentTrainingLoad([], [], now), 'normal', false).allowed).toBe(false);
  });
});
