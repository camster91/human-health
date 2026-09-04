import { describe, expect, it } from 'vitest';
import { canClaimValidated, capabilityModelRegistry, withValidationStatus } from './capability-models';

describe('capability-model validation gates', () => {
  it('does not claim current models are validated', () => {
    expect(capabilityModelRegistry.every(model => !canClaimValidated(model))).toBe(true);
  });

  it('rejects validated status without external evidence and replication', () => {
    const model = capabilityModelRegistry[0];
    expect(() => withValidationStatus(model, 'validated-for-intended-use', [])).toThrow();
    const evidence = [
      { id: 'e1', title: 'External study', kind: 'external-study' as const, reference: 'doi:example', protocol: 'Pre-registered comparison', reviewedAt: '2026-09-01T12:00:00Z' },
      { id: 'e2', title: 'Replication', kind: 'replication' as const, reference: 'doi:replication', reviewedAt: '2026-09-02T12:00:00Z' },
    ];
    expect(canClaimValidated(withValidationStatus(model, 'validated-for-intended-use', evidence))).toBe(true);
  });
});
