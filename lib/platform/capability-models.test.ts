import { describe, expect, it } from 'vitest';
import { canClaimValidated, capabilityModelRegistry, validationEvidenceSatisfiesClaim, withValidationStatus } from './capability-models';

const external = {
  id: 'e1',
  title: 'External study',
  kind: 'external-study' as const,
  reference: 'doi:external-study',
  population: 'Defined external study population',
  protocol: 'Pre-registered comparison protocol',
  outcome: 'Intended-use performance outcome',
  reviewedAt: '2026-09-01T12:00:00Z',
};
const replication = {
  id: 'e2',
  title: 'Independent replication',
  kind: 'replication' as const,
  reference: 'doi:independent-replication',
  population: 'Independent replication population',
  protocol: 'Independent replication protocol',
  outcome: 'Replication of intended-use performance',
  independent: true,
  reviewedAt: '2026-09-02T12:00:00Z',
};

describe('capability-model validation gates', () => {
  it('does not claim current models are validated', () => {
    expect(capabilityModelRegistry.every(model => !canClaimValidated(model))).toBe(true);
  });

  it('rejects validated status without complete external evidence and independent replication', () => {
    const model = capabilityModelRegistry[0];
    expect(() => withValidationStatus(model, 'validated-for-intended-use', [])).toThrow();
    expect(validationEvidenceSatisfiesClaim([external, { ...replication, independent: false }])).toBe(false);
    expect(validationEvidenceSatisfiesClaim([{ ...external, protocol: undefined }, replication])).toBe(false);
    expect(validationEvidenceSatisfiesClaim([external, { ...replication, reference: external.reference }])).toBe(false);
    expect(canClaimValidated(withValidationStatus(model, 'validated-for-intended-use', [external, replication]))).toBe(true);
  });

  it('rejects duplicate evidence ids and invalid review timestamps', () => {
    expect(validationEvidenceSatisfiesClaim([external, { ...replication, id: external.id }])).toBe(false);
    expect(validationEvidenceSatisfiesClaim([{ ...external, reviewedAt: 'not-a-date' }, replication])).toBe(false);
  });
});
