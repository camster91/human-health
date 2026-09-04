import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import type { HumanHealthExport } from '../storage';
import { createIntegrationBundle, integrationBundleContainsOnlyScopes } from './integrations';

const training: HumanHealthExport = { schemaVersion: 2, exportedAt: '2026-09-03T12:00:00Z', activeWorkout: null, restTimer: null, history: [], activity: [], readiness: [], skills: {}, assessments: [], progressions: {}, skillAssessments: [], preferences: defaultPreferences, scheduleEvents: [] };

describe('integration bundles', () => {
  it('includes only explicitly requested scopes', () => {
    const bundle = createIntegrationBundle({ scopes: ['preventive:read'], training, connectedObservations: [], connectedSources: [], preventiveRecords: [], preventiveReminders: [], generatedAt: new Date('2026-09-03T12:00:00Z') });
    expect(bundle.preventive).toBeDefined();
    expect(bundle.training).toBeUndefined();
    expect(bundle.connectedHealth).toBeUndefined();
    expect(integrationBundleContainsOnlyScopes(bundle)).toBe(true);
  });

  it('requires at least one explicit scope', () => {
    expect(() => createIntegrationBundle({ scopes: [], training, connectedObservations: [], connectedSources: [], preventiveRecords: [], preventiveReminders: [] })).toThrow();
  });
});
