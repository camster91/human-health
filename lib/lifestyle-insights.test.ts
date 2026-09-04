import { describe, expect, it } from 'vitest';
import { HistoryEntry } from './domain';
import {
  glucoseSafetyDecision,
  movementSummary,
  nutritionSummary,
  pearsonAssociation,
  sleepSummary,
  sleepTrainingAssociation,
  wellbeingSummary,
} from './lifestyle-insights';

const now = new Date('2026-09-08T12:00:00Z');

describe('lifestyle summaries', () => {
  it('keeps duration, consistency, movement, nutrition, and wellbeing as separate observations', () => {
    const sleep = Array.from({ length: 7 }, (_, index) => ({ id: `s${index}`, date: `2026-09-0${index + 1}`, recordedAt: `2026-09-0${index + 1}T12:00:00Z`, source: 'manual' as const, schemaVersion: 1 as const, durationMinutes: 420 + index * 5, quality: 3 as const }));
    expect(sleepSummary(sleep, 7, now).averageHours).toBeGreaterThan(7);
    expect(sleepSummary(sleep, 7, now).consistencyVariationMinutes).not.toBeNull();

    const movement = movementSummary([{ id: 'm', date: '2026-09-07', recordedAt: '2026-09-07T12:00:00Z', source: 'manual', schemaVersion: 1, steps: 8000, activeMinutes: 30 }], 7, now);
    expect(movement.averageSteps).toBe(8000);

    const nutrition = nutritionSummary([{ id: 'n', date: '2026-09-07', recordedAt: '2026-09-07T12:00:00Z', source: 'manual', schemaVersion: 1, hydrationMl: 2200, proteinTargetMet: true }], 7, now);
    expect(nutrition.proteinAdherence).toBe(1);

    const wellbeing = wellbeingSummary([{ id: 'w', date: '2026-09-07', recordedAt: '2026-09-07T12:00:00Z', source: 'manual', schemaVersion: 1, energy: 4, mood: 3, stress: 2 }], 7, now);
    expect(wellbeing.averageEnergy).toBe(4);
  });
});

describe('evidence-thresholded associations', () => {
  it('requires minimum sample size and variance', () => {
    expect(pearsonAssociation([{ x: 1, y: 1 }], 6).state).toBe('insufficient');
    expect(pearsonAssociation(Array.from({ length: 6 }, () => ({ x: 7, y: 1 })), 6).state).toBe('insufficient');
  });

  it('reports association direction without causal language', () => {
    const result = pearsonAssociation(Array.from({ length: 8 }, (_, index) => ({ x: index + 1, y: index / 10 })), 6);
    expect(result.state).toBe('ready');
    expect(result.direction).toBe('positive');
    expect(result.message).toContain('does not establish cause');
  });

  it('pairs sleep and workout completion by comparable local date', () => {
    const sleep = Array.from({ length: 6 }, (_, index) => ({ id: `s${index}`, date: `2026-09-0${index + 1}`, recordedAt: `2026-09-0${index + 1}T08:00:00Z`, source: 'manual' as const, schemaVersion: 1 as const, durationMinutes: 360 + index * 30 }));
    const history: HistoryEntry[] = Array.from({ length: 6 }, (_, index) => ({
      session: 'upper-a',
      completedAt: `2026-09-0${index + 1}T18:00:00Z`,
      status: index < 2 ? 'ended-early' : 'completed',
      exercises: [{ id: 'bench', name: 'Bench', movement: 'horizontal-push', equipment: ['barbell'], priority: 'primary', repRange: [5, 8], sets: 4, logs: Array.from({ length: index < 2 ? 1 : 4 }, () => ({ reps: 6, weight: 60, completedAt: `2026-09-0${index + 1}T18:00:00Z` })) }],
    }));
    const result = sleepTrainingAssociation(sleep, history, 6);
    expect(result.samples).toBe(6);
    expect(result.message).toContain('does not establish cause');
  });
});

describe('Type 1 diabetes exercise context boundary', () => {
  it('withholds intensity for symptoms, below-personal-range state, or rapid change without dosing', () => {
    const result = glucoseSafetyDecision({ id: 'g', date: '2026-09-08', recordedAt: '2026-09-08T12:00:00Z', source: 'manual', schemaVersion: 1, timing: 'before', relationToPersonalRange: 'below', trend: 'rapidly-falling', symptoms: true });
    expect(result.constrainIntensity).toBe(true);
    expect(result.medicalBoundary).toContain('does not calculate insulin');
    expect(result.medicalBoundary).not.toMatch(/\d+\s*(g|units?)/i);
  });

  it('does not infer a glucose state when none was entered', () => {
    expect(glucoseSafetyDecision(null).constrainIntensity).toBe(false);
    expect(glucoseSafetyDecision(null).reason).toContain('no glucose assumption');
  });
});
