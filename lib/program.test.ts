import { describe, expect, it } from 'vitest';
import { adaptWorkout } from './engine';
import { buildSession, exerciseIsAvailable, exercises, findExercise, gyms, rankedSubstitutions, starterProgramDefinition } from './program';

describe('exercise graph and program', () => {
  it('resolves every starter-program exercise and versions the program', () => {
    expect(starterProgramDefinition.version).toBeGreaterThan(0);
    for (const session of Object.values(starterProgramDefinition.sessions)) {
      expect(session.every(item => Boolean(findExercise(item.id)))).toBe(true);
    }
  });

  it('contains the Phase 2 bodyweight skill movements', () => {
    for (const id of ['pullup', 'chinup', 'pushup', 'dip', 'dead-hang']) expect(Boolean(findExercise(id))).toBe(true);
  });

  it('only returns substitutions available in the active gym', () => {
    const source = findExercise('bench')!;
    const home = gyms.find(gym => gym.id === 'home')!;
    const options = rankedSubstitutions(source, home);
    expect(options.length).toBeGreaterThan(0);
    expect(options.every(option => option.exercise.movement === source.movement)).toBe(true);
    expect(options.every(option => exerciseIsAvailable(option.exercise, home))).toBe(true);
  });

  it('ranks a saved compatible preference first without treating loads as equivalent', () => {
    const source = findExercise('bench')!;
    const commercial = gyms.find(gym => gym.id === 'commercial')!;
    const options = rankedSubstitutions(source, commercial, { preferredId: 'dumbbell-bench' });
    expect(options[0].exercise.id).toBe('dumbbell-bench');
    expect(options[0].reason).toContain('history remain separate');
  });

  it('adapts every prescribed exercise to the selected equipment or removes it explicitly', () => {
    const travel = gyms.find(gym => gym.id === 'hotel')!;
    const result = adaptWorkout(buildSession('upper-a'), { gym: travel, mode: 'travel' });
    expect(result.exercises.every(exercise => exerciseIsAvailable(exercise, travel))).toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('uses a saved compatible replacement during automatic adaptation', () => {
    const result = adaptWorkout(buildSession('upper-a'), { gym: gyms.find(gym => gym.id === 'commercial')!, unavailable: ['rack'], preferredSubstitutions: { bench: 'dumbbell-bench' } });
    expect(result.exercises[0].id).toBe('dumbbell-bench');
  });

  it('keeps exercise identifiers unique', () => {
    expect(new Set(exercises.map(exercise => exercise.id)).size).toBe(exercises.length);
  });
});
