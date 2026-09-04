import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import type { HumanHealthExport } from '../storage';
import { createIntegrationBundle, integrationBundleContainsOnlyScopes, shareIntegrationBundle } from './integrations';

const training: HumanHealthExport = { schemaVersion: 2, exportedAt: '2026-09-03T12:00:00Z', activeWorkout: null, restTimer: null, history: [], activity: [], readiness: [], skills: {}, assessments: [], progressions: {}, skillAssessments: [], preferences: defaultPreferences, scheduleEvents: [] };

function preventiveBundle() {
  return createIntegrationBundle({ scopes: ['preventive:read'], training, connectedObservations: [], connectedSources: [], preventiveRecords: [], preventiveReminders: [], generatedAt: new Date('2026-09-03T12:00:00Z') });
}

describe('integration bundles', () => {
  it('includes only explicitly requested scopes', () => {
    const bundle = preventiveBundle();
    expect(bundle.preventive).toBeDefined();
    expect(bundle.training).toBeUndefined();
    expect(bundle.connectedHealth).toBeUndefined();
    expect(integrationBundleContainsOnlyScopes(bundle)).toBe(true);
  });

  it('requires at least one explicit scope', () => {
    expect(() => createIntegrationBundle({ scopes: [], training, connectedObservations: [], connectedSources: [], preventiveRecords: [], preventiveReminders: [] })).toThrow();
  });

  it('requires explicit confirmation before an integration host receives data', async () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    let shares = 0;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        HumanHealthIntegrationHost: {
          async describe() { return { name: 'Test host', supportedScopes: ['preventive:read'] as const }; },
          async share() { shares++; return { accepted: true }; },
        },
      },
    });
    try {
      const bundle = preventiveBundle();
      await expect(shareIntegrationBundle(bundle, { confirmed: false })).rejects.toThrow('Explicit user confirmation');
      expect(shares).toBe(0);
      await expect(shareIntegrationBundle(bundle, { confirmed: true })).resolves.toMatchObject({ accepted: true });
      expect(shares).toBe(1);
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    }
  });
});
