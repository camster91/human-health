import { describe, expect, it } from 'vitest';
import { defaultPreferences, normalizePreferences, swapPreferenceKey } from './preferences';

describe('preferences', () => {
  it('normalizes unsafe numeric values and plate inventory', () => {
    const value = normalizePreferences({ cardioTargetMinutes: 9999, defaultRestSeconds: 1, plateBarKg: -10, availablePlatesKg: [10, 10, 5, -2, Number.NaN] });
    expect(value.cardioTargetMinutes).toBe(600);
    expect(value.defaultRestSeconds).toBe(15);
    expect(value.plateBarKg).toBe(0);
    expect(value.availablePlatesKg).toEqual([10, 5]);
  });

  it('merges partial domain priorities without losing defaults', () => {
    const value = normalizePreferences({ domainPriorities: { ...defaultPreferences.domainPriorities, cardio: 'off' } });
    expect(value.domainPriorities.cardio).toBe('off');
    expect(value.domainPriorities.strength).toBe('focus');
  });

  it('rejects corrupted enum, boolean, equipment and nested preference values', () => {
    const value = normalizePreferences({ lifeMode: 'unsafe' as never, unitSystem: 'stone' as never, highImpactAllowed: 'yes' as never, nextSessionOverride: 'random' as never, lastUnavailableEquipment: ['rack', 'laser' as never], domainPriorities: { ...defaultPreferences.domainPriorities, cardio: 'urgent' as never }, swapPreferences: { 'work:bench': 'dumbbell-bench', bad: 3 as never } });
    expect(value.lifeMode).toBe('normal');
    expect(value.unitSystem).toBe('metric');
    expect(value.highImpactAllowed).toBe(true);
    expect(value.nextSessionOverride).toBeNull();
    expect(value.lastUnavailableEquipment).toEqual(['rack']);
    expect(value.domainPriorities.cardio).toBe('focus');
    expect(value.swapPreferences).toEqual({ 'work:bench': 'dumbbell-bench' });
  });

  it('scopes saved swaps by gym and original exercise', () => {
    expect(swapPreferenceKey('work', 'bench')).toBe('work:bench');
  });
});
