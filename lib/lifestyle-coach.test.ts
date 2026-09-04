import { describe, expect, it } from 'vitest';
import { defaultLifestylePreferences, emptyHealthContext, LifestyleDataset } from './lifestyle';
import { buildLifestyleCoachDecision } from './lifestyle-coach';
import { defaultPreferences } from './preferences';

function dataset(overrides: Partial<LifestyleDataset> = {}): LifestyleDataset {
  return {
    sleep: [],
    movement: [],
    nutrition: [],
    wellbeing: [],
    glucose: [],
    healthContext: emptyHealthContext,
    preferences: defaultLifestylePreferences,
    ...overrides,
  };
}

const base = {
  baseReadiness: { level: 'normal' as const, volumeMultiplier: 1, allowProgression: true, reasons: [] },
  history: [],
  activity: [],
  availableMinutes: 20,
  mode: 'normal' as const,
  equipment: ['bodyweight' as const],
  cardioTargetMinutes: 150,
  priorities: defaultPreferences.domainPriorities,
  now: new Date('2026-09-03T12:00:00Z'),
};

describe('lifestyle coach', () => {
  it('keeps missing or disabled data unknown rather than inferred', () => {
    const decision = buildLifestyleCoachDecision({ ...base, dataset: dataset() });
    expect(decision.unknown.some(item => item.includes('not logged'))).toBe(true);
    expect(decision.dataUsed).toContain('recent training load');
  });

  it('reduces progression after limited sleep and low energy', () => {
    const decision = buildLifestyleCoachDecision({
      ...base,
      dataset: dataset({
        sleep: [{ id: 's', date: '2026-09-03', recordedAt: '2026-09-03T08:00:00Z', source: 'manual', schemaVersion: 1, durationMinutes: 300, quality: 2 }],
        wellbeing: [{ id: 'w', date: '2026-09-03', recordedAt: '2026-09-03T09:00:00Z', source: 'manual', schemaVersion: 1, energy: 2, stress: 4 }],
      }),
    });
    expect(decision.level).not.toBe('normal');
    expect(decision.allowProgression).toBe(false);
  });

  it('puts concerning symptoms and glucose context ahead of catch-up training', () => {
    const preferences = { ...defaultLifestylePreferences, glucoseContextEnabled: true, consent: { ...defaultLifestylePreferences.consent, 'glucose-context': true } };
    const decision = buildLifestyleCoachDecision({
      ...base,
      dataset: dataset({
        preferences,
        wellbeing: [{ id: 'w', date: '2026-09-03', recordedAt: '2026-09-03T09:00:00Z', source: 'manual', schemaVersion: 1, concerningSymptoms: true }],
        glucose: [{ id: 'g', date: '2026-09-03', recordedAt: '2026-09-03T09:30:00Z', source: 'manual', schemaVersion: 1, timing: 'before', relationToPersonalRange: 'below', trend: 'falling' }],
      }),
    });
    expect(decision.level).toBe('recovery');
    expect(decision.highIntensityAllowed).toBe(false);
    expect(decision.medicalBoundary).toContain('does not calculate insulin');
  });

  it('respects an explicit clinician restriction without claiming clearance', () => {
    const preferences = { ...defaultLifestylePreferences, consent: { ...defaultLifestylePreferences.consent, 'health-context': true } };
    const decision = buildLifestyleCoachDecision({
      ...base,
      dataset: dataset({
        preferences,
        healthContext: { schemaVersion: 1, updatedAt: '2026-09-03T09:00:00Z', conditions: [], medications: [], allergies: [], clinicianRestrictions: ['No jumping until reassessed'] },
      }),
    });
    expect(decision.highIntensityAllowed).toBe(false);
    expect(decision.reasons.join(' ')).toContain('restriction');
    expect(decision.medicalBoundary).toContain('does not diagnose');
  });
});
