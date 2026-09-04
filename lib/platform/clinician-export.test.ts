import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import type { HumanHealthExport } from '../storage';
import { buildClinicianSummary, clinicianSummaryMarkdown } from './clinician-export';

const training: HumanHealthExport = { schemaVersion: 2, exportedAt: '2026-09-03T12:00:00Z', activeWorkout: null, restTimer: null, history: [], activity: [], readiness: [], skills: {}, assessments: [], progressions: {}, skillAssessments: [], preferences: defaultPreferences, scheduleEvents: [] };

function observation(id: string, sourceId: string, sourceName: string, value: number) {
  return { id, sourceId, metric: 'resting-heart-rate' as const, value, unit: 'bpm' as const, startTime: '2026-09-01T08:00:00Z', recordedAt: '2026-09-01T08:00:00Z', quality: 'direct' as const, provenance: { provider: 'apple-health' as const, ingestionMethod: 'file-import' as const, sourceName, originalType: 'HKQuantityTypeIdentifierRestingHeartRate', externalId: id, importedAt: '2026-09-01T09:00:00Z' } };
}

describe('clinician-friendly export', () => {
  it('keeps source provenance and non-diagnostic framing visible', () => {
    const summary = buildClinicianSummary({
      training,
      connectedObservations: [observation('o1', 'apple-watch', 'Apple Watch', 60), observation('o2', 'apple-phone', 'iPhone', 64)],
      connectedSources: [
        { id: 'apple-watch', provider: 'apple-health', displayName: 'Apple Watch', status: 'current', supportedMetrics: ['resting-heart-rate'], grantedMetrics: ['resting-heart-rate'], staleAfterMs: 86_400_000 },
        { id: 'apple-phone', provider: 'apple-health', displayName: 'iPhone', status: 'current', supportedMetrics: ['resting-heart-rate'], grantedMetrics: ['resting-heart-rate'], staleAfterMs: 86_400_000 },
      ],
      preventiveRecords: [], preventiveReminders: [], generatedAt: new Date('2026-09-03T12:00:00Z'),
    });
    expect(summary.connectedHealth.metrics).toHaveLength(2);
    expect(new Set(summary.connectedHealth.metrics.map(metric => metric.sourceId))).toEqual(new Set(['apple-watch', 'apple-phone']));
    expect(summary.framing).toContain('not a diagnosis');
    const markdown = clinicianSummaryMarkdown(summary);
    expect(markdown).toContain('clinician discussion summary');
    expect(markdown).toContain('source apple-watch');
    expect(markdown).toContain('source apple-phone');
  });
});
