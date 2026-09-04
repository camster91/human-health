import { describe, expect, it } from 'vitest';
import { createManualObservation, habitTarget } from './habits';
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
});
