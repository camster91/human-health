import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import type { HumanHealthExport } from '../storage';
import { buildClinicianSummary, clinicianSummaryMarkdown } from './clinician-export';

const training: HumanHealthExport = { schemaVersion: 2, exportedAt: '2026-09-03T12:00:00Z', activeWorkout: null, restTimer: null, history: [], activity: [], readiness: [], skills: {}, assessments: [], progressions: {}, skillAssessments: [], preferences: defaultPreferences, scheduleEvents: [] };

describe('clinician-friendly export', () => {
  it('keeps provenance and non-diagnostic framing visible', () => {
    const summary = buildClinicianSummary({ training, connectedObservations: [{ id: 'o1', sourceId: 'apple', metric: 'resting-heart-rate', value: 60, unit: 'bpm', startTime: '2026-09-01T08:00:00Z', recordedAt: '2026-09-01T08:00:00Z', quality: 'direct', provenance: { provider: 'apple-health', ingestionMethod: 'file-import', sourceName: 'Apple Health', originalType: 'HKQuantityTypeIdentifierRestingHeartRate', externalId: '1', importedAt: '2026-09-01T09:00:00Z' } }], connectedSources: [{ id: 'apple', provider: 'apple-health', displayName: 'Apple Health', status: 'current', supportedMetrics: ['resting-heart-rate'], grantedMetrics: ['resting-heart-rate'], staleAfterMs: 86_400_000 }], preventiveRecords: [], preventiveReminders: [], generatedAt: new Date('2026-09-03T12:00:00Z') });
    expect(summary.connectedHealth.metrics[0].sourceNames).toEqual(['Apple Health']);
    expect(summary.framing).toContain('not a diagnosis');
    expect(clinicianSummaryMarkdown(summary)).toContain('clinician discussion summary');
  });
});
