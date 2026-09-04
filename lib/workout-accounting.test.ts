import { describe, expect, it } from 'vitest';
import { plannedExercises } from './workout-accounting';

const completed = { id: 'bench', name: 'Bench', movement: 'horizontal-push' as const, equipment: ['barbell' as const], priority: 'primary' as const, repRange: [5, 8] as [number, number], sets: 2, logs: [{ weight: 60, reps: 6, completedAt: '2026-09-01T10:00:00Z' }], optional: true };
const replacement = { id: 'dumbbell-bench', originalId: 'bench', name: 'Dumbbell Bench', movement: 'horizontal-push' as const, equipment: ['dumbbell' as const], priority: 'primary' as const, repRange: [6, 10] as [number, number], sets: 2, logs: [], optional: false };

describe('planned exercise accounting', () => {
  it('keeps completed sets from a split substitution in planned work', () => {
    expect(plannedExercises([completed, replacement])).toHaveLength(2);
  });

  it('does not promote an unrelated optional addition into planned work', () => {
    const curl = { ...completed, id: 'curl', name: 'Curl', movement: 'biceps' as const, originalId: undefined };
    expect(plannedExercises([curl, replacement]).map(item => item.id)).toEqual(['dumbbell-bench']);
  });
});
