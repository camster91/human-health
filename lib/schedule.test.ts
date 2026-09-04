import { describe, expect, it } from 'vitest';
import { HistoryEntry } from './domain';
import { contextualRollingSession, createScheduleOverride, nextRollingSession, workoutCompletionRatio } from './schedule';

function entry(status: 'completed' | 'ended-early' | 'abandoned', benchWorking: number, rowWorking: number, optionalSets = 0): HistoryEntry {
  return { session: 'upper-a', status, completedAt: '2026-09-02T12:00:00-04:00', exercises: [
    { id: 'bench', name: 'Bench', movement: 'horizontal-push', equipment: ['barbell'], priority: 'primary', repRange: [5, 8], sets: 4, logs: [{ weight: 20, reps: 10, warmup: true, completedAt: '2026-09-02T11:55:00-04:00' }, ...Array.from({ length: benchWorking }, () => ({ weight: 60, reps: 6, completedAt: '2026-09-02T12:00:00-04:00' }))] },
    { id: 'row', name: 'Row', movement: 'horizontal-pull', equipment: ['barbell'], priority: 'primary', repRange: [6, 10], sets: 4, logs: Array.from({ length: rowWorking }, () => ({ weight: 50, reps: 8, completedAt: '2026-09-02T12:20:00-04:00' })) },
    { id: 'extra', name: 'Optional extra', movement: 'biceps', equipment: ['dumbbell'], priority: 'accessory', repRange: [8, 12], sets: optionalSets, logs: [], optional: true },
  ] };
}

describe('rolling schedule', () => {
  it('ignores warm-ups and optional additions in the completion ratio', () => {
    expect(workoutCompletionRatio(entry('ended-early', 4, 4, 5))).toBe(1);
  });

  it('keeps explicitly deferred planned work in the required denominator', () => {
    const partial = entry('ended-early', 4, 0);
    partial.exercises[1].deferred = true;
    expect(workoutCompletionRatio(partial)).toBe(0.5);
    expect(nextRollingSession([partial]).repeating).toBe(true);
  });

  it('advances complete work and repeats insufficient ended-early/abandoned work', () => {
    expect(nextRollingSession([entry('completed', 4, 4)]).session).toBe('lower-a');
    expect(nextRollingSession([entry('ended-early', 1, 0)]).repeating).toBe(true);
    expect(nextRollingSession([entry('abandoned', 4, 4)]).repeating).toBe(true);
  });

  it('advances a partial session only after enough work and all primaries are covered', () => {
    expect(nextRollingSession([entry('ended-early', 4, 2)]).session).toBe('lower-a');
    expect(nextRollingSession([entry('ended-early', 4, 0)]).session).toBe('upper-a');
  });

  it('applies explicit life modes and manual session overrides without rewriting history', () => {
    const history = [entry('completed', 4, 4)];
    const travel = contextualRollingSession(history, 'travel');
    expect(travel.adaptation).toBe('portable');
    expect(travel.progressionAllowed).toBe(false);
    const manual = contextualRollingSession(history, 'normal', 'upper-b');
    expect(manual.session).toBe('upper-b');
    expect(manual.manual).toBe(true);
    expect(history[0].session).toBe('upper-a');
  });

  it('records a manual override/skip as an explicit event', () => {
    const event = createScheduleOverride('upper-a', 'lower-a', 'skip', new Date('2026-09-03T12:00:00Z'));
    expect(event.type).toBe('skip');
    expect(event.recordedAt).toBe('2026-09-03T12:00:00.000Z');
  });
});
