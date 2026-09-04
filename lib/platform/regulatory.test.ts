import { describe, expect, it } from 'vitest';
import { regulatoryGate } from './regulatory';

describe('regulatory review checkpoint', () => {
  it('blocks medication/insulin dosing and emergency monitoring', () => {
    expect(regulatoryGate({ id: 'dose', name: 'Dose calculator', medicationOrInsulinDose: true }).decision).toBe('blocked');
    expect(regulatoryGate({ id: 'emergency', name: 'Emergency alert', emergencyMonitoring: true }).decision).toBe('blocked');
  });

  it('escalates diagnostic/clinical decision support instead of declaring compliance', () => {
    const result = regulatoryGate({ id: 'risk', name: 'Disease risk', diagnosticClaim: true, patientSpecificRiskScore: true });
    expect(result.decision).toBe('specialist-review-required');
    expect(result.legalDetermination).toBe(false);
  });

  it('keeps ordinary wellness education in normal review scope', () => {
    expect(regulatoryGate({ id: 'wellness', name: 'Training education', wellnessEducationOnly: true }).decision).toBe('wellness-scope');
  });
});
