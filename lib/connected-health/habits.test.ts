import { describe, expect, it } from 'vitest';
import { createManualObservation, habitCoverage, habitTarget } from './habits';
import { defaultConnectedHealthPreferences } from './types';

describe('nutrition and hydration habits', () => {
  it('creates source-owned manual observations with provenance', () => {
    const observation = createManualObservation('water', 500, new Date('2026-09-03T12:00:00Z'));
    expect(observation.sourceId).toBe('manual:habits');
    expect(observation.metric).toBe('water');
    expect(observation.unit).toBe('ml');
    expect(observation.provenance.ingestionMethod).toBe('manual');
  });

  it('rejects negative, non-finite and out-of-range entries', () => {
    expect(() => createManualObservation('water', -1)).toThrow();
    expect(() => createManualObservation('protein', Number.NaN)).toThrow();
    expect(() => createManualObservation('meal-quality', 6)).toThrow('between 1 and 5');
    expect(() => createManualObservation('fruit-vegetable-servings', 31)).toThrow();
  });

  it('uses configurable habit targets', () => {
    const preferences = { ...defaultConnectedHealthPreferences, waterTargetMl: 2_500, proteinTargetG: 120, fibreTargetG: 30, fruitVegetableTarget: 6 };
    expect(habitTarget('water', preferences)).toBe(2_500);
    expect(habitTarget('protein', preferences)).toBe(120);
    expect(habitTarget('fibre', preferences)).toBe(30);
    expect(habitTarget('fruit-vegetable-servings', preferences)).toBe(6);
  });

  it('reports target coverage without converting missing days into zero', () => {
    const now = new Date('2026-09-07T20:00:00Z');
    const observations = [
      createManualObservation('water', 1_000, new Date('2026-09-05T12:00:00Z')),
      createManualObservation('water', 1_000, new Date('2026-09-05T18:00:00Z')),
      createManualObservation('water', 2_500, new Date('2026-09-06T12:00:00Z')),
      createManualObservation('water', 2_000, new Date('2026-09-07T12:00:00Z')),
    ];
    const result = habitCoverage(observations, 'water', 2_000, { sourceId: 'manual:habits', now });
    expect(result.daysWithData).toBe(3);
    expect(result.daysMeetingTarget).toBe(3);
    expect(result.currentStreak).toBe(3);
    expect(result.note).toContain('Missing days remain missing');
  });

  it('averages meal quality per day rather than adding scores', () => {
    const now = new Date('2026-09-03T20:00:00Z');
    const observations = [createManualObservation('meal-quality', 3, new Date('2026-09-03T12:00:00Z')), createManualObservation('meal-quality', 5, new Date('2026-09-03T18:00:00Z'))];
    const result = habitCoverage(observations, 'meal-quality', 4, { sourceId: 'manual:habits', now });
    expect(result.average).toBe(4);
    expect(result.daysMeetingTarget).toBe(1);
  });
});
