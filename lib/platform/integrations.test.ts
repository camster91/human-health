import { describe, expect, it } from 'vitest';
import { makeObservation, makeSource } from '../connected-health/test-helpers';
import { defaultPreferences } from '../preferences';
import type { HumanHealthExport } from '../storage';
import type { IntegrationBundle } from './types';
import { createIntegrationBundle, integrationBundleContainsOnlyScopes, shareIntegrationBundle } from './integrations';

const training: HumanHealthExport = { schemaVersion: 2, exportedAt: '2026-09-03T12:00:00Z', activeWorkout: null, restTimer: null, history: [], activity: [], readiness: [], skills: {}, assessments: [], progressions: {}, skillAssessments: [], preferences: defaultPreferences, scheduleEvents: [] };

function preventiveBundle() {
  return createIntegrationBundle({ scopes: ['preventive:read'], preventiveRecords: [], preventiveReminders: [], generatedAt: new Date('2026-09-03T12:00:00Z') });
}

describe('integration bundles', () => {
  it('includes only explicitly requested scopes', () => {
    const bundle = preventiveBundle();
    expect(bundle.preventive).toBeDefined();
    expect(bundle.training).toBeUndefined();
    expect(bundle.connectedHealth).toBeUndefined();
    expect(integrationBundleContainsOnlyScopes(bundle)).toBe(true);
  });

  it('allows a preventive-only bundle when training or connected-health data is unavailable', () => {
    expect(() => createIntegrationBundle({ scopes: ['preventive:read'], training: null, connectedObservations: null, connectedSources: null, preventiveRecords: [], preventiveReminders: [] })).not.toThrow();
  });

  it('requires trusted data only when the corresponding scope is selected', () => {
    expect(() => createIntegrationBundle({ scopes: ['training:read'], training: null, preventiveRecords: [], preventiveReminders: [] })).toThrow('Trusted training data');
    expect(() => createIntegrationBundle({ scopes: ['connected-health:read'], connectedObservations: null, connectedSources: null, preventiveRecords: [], preventiveReminders: [] })).toThrow('Trusted connected-health data');

    const trainingBundle = createIntegrationBundle({ scopes: ['training:read'], training, preventiveRecords: [], preventiveReminders: [] });
    expect(trainingBundle.training).toEqual(training);
    const connectedBundle = createIntegrationBundle({ scopes: ['connected-health:read'], connectedObservations: [], connectedSources: [], preventiveRecords: [], preventiveReminders: [] });
    expect(connectedBundle.connectedHealth).toEqual({ observations: [], sources: [] });
  });

  it('rejects inconsistent connected observation/source provenance at create and share boundaries', () => {
    const orphan = makeObservation('steps', 1_000, { sourceId: 'missing' });
    expect(() => createIntegrationBundle({ scopes: ['connected-health:read'], connectedObservations: [orphan], connectedSources: [], preventiveRecords: [], preventiveReminders: [] })).toThrow('relationship integrity failed');

    const source = makeSource('watch');
    const valid = makeObservation('steps', 1_000, { sourceId: 'watch' });
    const bundle = createIntegrationBundle({ scopes: ['connected-health:read'], connectedObservations: [valid], connectedSources: [source], preventiveRecords: [], preventiveReminders: [] });
    bundle.connectedHealth = { observations: [{ ...valid, sourceId: 'missing' }], sources: [source] };
    expect(integrationBundleContainsOnlyScopes(bundle)).toBe(false);
  });

  it('requires at least one explicit scope and rejects malformed declared payloads', () => {
    expect(() => createIntegrationBundle({ scopes: [], preventiveRecords: [], preventiveReminders: [] })).toThrow();
    expect(integrationBundleContainsOnlyScopes({ ...preventiveBundle(), preventive: undefined })).toBe(false);
    expect(integrationBundleContainsOnlyScopes({ ...preventiveBundle(), scopes: ['preventive:read', 'preventive:read'] })).toBe(false);
  });

  it('requires confirmation and strips undeclared object properties before host share', async () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    let shares = 0;
    let received: Record<string, unknown> | null = null;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        HumanHealthIntegrationHost: {
          async describe() { return { name: 'Test host', supportedScopes: ['preventive:read'] }; },
          async share(bundle: IntegrationBundle) { shares++; received = bundle as unknown as Record<string, unknown>; return { accepted: true }; },
        },
      },
    });
    try {
      const bundle = Object.assign(preventiveBundle(), { undeclaredSecret: 'must not leave browser' }) as IntegrationBundle;
      await expect(shareIntegrationBundle(bundle, { confirmed: false })).rejects.toThrow('Explicit user confirmation');
      expect(shares).toBe(0);
      await expect(shareIntegrationBundle(bundle, { confirmed: true })).resolves.toMatchObject({ accepted: true });
      expect(shares).toBe(1);
      expect(received).not.toHaveProperty('undeclaredSecret');
      expect(received).toHaveProperty('preventive');
      expect(received).not.toHaveProperty('training');
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    }
  });
});
