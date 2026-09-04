import { describe, expect, it } from 'vitest';
import { strengthLoadAdjustment } from './load-management';
import {
  capabilityModelRegistry,
  canClaimValidated,
  regulatoryGate,
  shareIntegrationBundle,
  type IntegrationBundle,
} from './platform';
import { athleticPlan, cardioOptions, corePrescription, readinessDecision } from './whole-person';

const emptyLoad = {
  lowerSets: 0,
  upperSets: 0,
  lowerBodySets: 0,
  lowerBodyRecent: false,
  hoursSinceLower: null,
  hoursSinceAny: null,
  hardCardioMinutes: 0,
  hoursSinceHardCardio: null,
  message: 'No recent load.',
};

describe('release safety invariants', () => {
  it('keeps pain or illness as a zero-prescription safety hold', () => {
    for (const input of [{ pain: true }, { illness: true }]) {
      const readiness = readinessDecision(input);
      expect(readiness.level).toBe('recovery');
      expect(readiness.volumeMultiplier).toBe(0);
      expect(readiness.allowProgression).toBe(false);
      expect(strengthLoadAdjustment('upper-a', emptyLoad, readiness.level).volumeMultiplier).toBe(0);
      expect(cardioOptions(0, 150, readiness.level, 30)).toEqual([]);
      expect(corePrescription({ session: 'upper-a', equipment: ['bodyweight'], readiness: readiness.level })).toEqual([]);
      expect(athleticPlan([], readiness.level)).toEqual([]);
    }
  });

  it('keeps medication/insulin dosing and emergency monitoring outside product scope', () => {
    expect(regulatoryGate({ id: 'dose', name: 'Dose feature', medicationOrInsulinDose: true }).decision).toBe('blocked');
    expect(regulatoryGate({ id: 'emergency', name: 'Emergency monitor', emergencyMonitoring: true }).decision).toBe('blocked');
    expect(regulatoryGate({ id: 'diagnosis', name: 'Diagnosis', diagnosticClaim: true }).decision).toBe('specialist-review-required');
  });

  it('does not let any built-in capability model claim validation', () => {
    expect(capabilityModelRegistry.length).toBeGreaterThan(0);
    for (const model of capabilityModelRegistry) {
      expect(model.medicalUseAllowed).toBe(false);
      expect(model.validationStatus).not.toBe('validated-for-intended-use');
      expect(canClaimValidated(model)).toBe(false);
    }
  });

  it('requires explicit confirmation before any integration host can receive data', async () => {
    const bundle: IntegrationBundle = {
      schemaVersion: 1,
      generatedAt: '2026-09-04T12:00:00.000Z',
      scopes: ['coaching:read'],
      coaching: { note: 'Deterministic fitness guidance only.' },
      safety: 'Explicit user export/share only.',
    };
    await expect(shareIntegrationBundle(bundle, { confirmed: false })).rejects.toThrow(/explicit user confirmation/i);
  });
});
