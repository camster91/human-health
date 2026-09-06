import { describe, expect, test } from 'vitest';
import {
  completeSoftHabit,
  habitPattern,
  completedToday,
  enabledHabitsSummary,
  habitOverviewMessage,
  SoftHabitCompletion,
} from './soft-habits';

describe('soft habits', () => {
  test('completes a soft habit', () => {
    const completion = completeSoftHabit('morning-movement', 'Felt great', new Date('2026-09-06T07:00:00Z'));
    expect(completion.habitId).toBe('morning-movement');
    expect(completion.note).toBe('Felt great');
    expect(completion.completedAt).toBe('2026-09-06T07:00:00.000Z');
  });

  test('rejects unknown habit', () => {
    expect(() => completeSoftHabit('unknown' as any)).toThrow('Unknown habit');
  });

  test('rejects oversized notes', () => {
    const longNote = 'x'.repeat(301);
    expect(() => completeSoftHabit('breath-pause', longNote)).toThrow('Habit note must be 300 characters or fewer');
  });

  test('allows completion without note', () => {
    const completion = completeSoftHabit('breath-pause');
    expect(completion.note).toBeUndefined();
  });

  test('calculates habit pattern over 7 days', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-02T07:00:00Z')),
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-04T07:00:00Z')),
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-06T07:00:00Z')),
      completeSoftHabit('breath-pause', undefined, new Date('2026-09-06T07:00:00Z')), // different habit
    ];

    const pattern = habitPattern(completions, 'morning-movement', { now, days: 7 });
    expect(pattern.daysWithCompletions).toBe(3);
    expect(pattern.totalDays).toBe(7);
    expect(pattern.completions).toHaveLength(3);
    expect(pattern.message).toBe('3/7 days completed.');
  });

  test('shows factual message when no completions', () => {
    const pattern = habitPattern([], 'morning-movement', { days: 7 });
    expect(pattern.message).toBe('No completions in the last 7 days.');
  });

  test('shows factual message when all days complete', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = Array.from({ length: 7 }, (_, i) =>
      completeSoftHabit('breath-pause', undefined, new Date(Date.UTC(2026, 8, 6 - i, 12)))
    );

    const pattern = habitPattern(completions, 'breath-pause', { now, days: 7 });
    expect(pattern.daysWithCompletions).toBe(7);
    expect(pattern.message).toBe('7/7 days completed.');
  });

  test('detects completion for today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-05T07:00:00Z')),
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-06T07:00:00Z')),
    ];

    expect(completedToday(completions, 'morning-movement', now)).toBe(true);
    expect(completedToday(completions, 'breath-pause', now)).toBe(false);
  });

  test('returns false when not completed today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-05T07:00:00Z')),
    ];

    expect(completedToday(completions, 'morning-movement', now)).toBe(false);
  });

  test('summarizes multiple enabled habits', () => {
    const now = new Date('2026-09-06T15:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-04T07:00:00Z')),
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-06T07:00:00Z')),
      completeSoftHabit('breath-pause', undefined, new Date('2026-09-06T14:00:00Z')),
    ];

    const summary = enabledHabitsSummary(completions, ['morning-movement', 'breath-pause'], 7, now);
    expect(summary).toHaveLength(2);
    expect(summary[0].habitId).toBe('morning-movement');
    expect(summary[0].daysWithCompletions).toBe(2);
    expect(summary[1].habitId).toBe('breath-pause');
    expect(summary[1].daysWithCompletions).toBe(1);
  });

  test('generates overview message when no habits enabled', () => {
    const message = habitOverviewMessage([], []);
    expect(message).toBe('No rituals enabled.');
  });

  test('generates overview message when nothing completed today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-05T07:00:00Z')),
    ];

    const message = habitOverviewMessage(completions, ['morning-movement', 'breath-pause'], now);
    expect(message).toBe('2 rituals enabled. 0 completed today.');
  });

  test('generates overview message when some completed today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-06T07:00:00Z')),
    ];

    const message = habitOverviewMessage(completions, ['morning-movement', 'breath-pause'], now);
    expect(message).toBe('1/2 rituals completed today.');
  });

  test('generates overview message when all completed today', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('morning-movement', undefined, new Date('2026-09-06T07:00:00Z')),
      completeSoftHabit('breath-pause', undefined, new Date('2026-09-06T14:00:00Z')),
    ];

    const message = habitOverviewMessage(completions, ['morning-movement', 'breath-pause'], now);
    expect(message).toBe('2/2 rituals completed today.');
  });

  test('counts unique days correctly with multiple completions same day', () => {
    const now = new Date('2026-09-06T23:59:00Z');
    const completions: SoftHabitCompletion[] = [
      completeSoftHabit('breath-pause', undefined, new Date('2026-09-06T07:00:00Z')),
      completeSoftHabit('breath-pause', undefined, new Date('2026-09-06T14:00:00Z')),
      completeSoftHabit('breath-pause', undefined, new Date('2026-09-06T21:00:00Z')),
    ];

    const pattern = habitPattern(completions, 'breath-pause', { now, days: 1 });
    expect(pattern.daysWithCompletions).toBe(1); // 1 unique day, not 3 completions
  });
});
