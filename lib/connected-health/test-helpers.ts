import { metricDefinitions } from './metrics';
import { observationId } from './merge';
import { ConnectedMetric, HealthObservation, HealthSourceState } from './types';

export function makeObservation(metric: ConnectedMetric, value: number, options: Partial<HealthObservation> & { sourceId?: string; externalId?: string; recordedAt?: string; startTime?: string } = {}): HealthObservation {
  const sourceId = options.sourceId || 'source:a';
  const recordedAt = options.recordedAt || options.startTime || '2026-09-03T12:00:00.000Z';
  const externalId = options.externalId || `${metric}:${recordedAt}:${value}`;
  return {
    id: options.id || observationId(sourceId, externalId),
    sourceId,
    metric,
    value,
    unit: options.unit || metricDefinitions[metric].unit,
    startTime: options.startTime || recordedAt,
    endTime: options.endTime,
    recordedAt,
    timezoneOffsetMinutes: options.timezoneOffsetMinutes,
    quality: options.quality || 'direct',
    provenance: options.provenance || {
      provider: 'manual',
      ingestionMethod: 'manual',
      sourceName: sourceId,
      originalType: metric,
      originalUnit: options.unit || metricDefinitions[metric].unit,
      externalId,
      importedAt: recordedAt,
    },
    tags: options.tags,
  };
}

export function makeSource(id = 'source:a', options: Partial<HealthSourceState> = {}): HealthSourceState {
  return {
    id,
    provider: options.provider || 'manual',
    displayName: options.displayName || id,
    status: options.status || 'current',
    supportedMetrics: options.supportedMetrics || ['steps'],
    grantedMetrics: options.grantedMetrics || options.supportedMetrics || ['steps'],
    staleAfterMs: options.staleAfterMs || 48 * 3_600_000,
    lastAttemptAt: options.lastAttemptAt,
    lastSuccessAt: options.lastSuccessAt || '2026-09-03T12:00:00.000Z',
    cursor: options.cursor,
    error: options.error,
    partialReason: options.partialReason,
    recordCount: options.recordCount,
  };
}
