import { describe, expect, it } from 'vitest';
import { chooseSourceForMetric, observationFreshness, observationsForMetric, sourceFreshness } from './freshness';
import type { HealthObservation, HealthSourceState } from './types';

function observation(recordedAt: string, sourceId = 'source-a'): HealthObservation {
  return {
    id: `${sourceId}:${recordedAt}`,
    sourceId,
    metric: 'steps',
    value: 1000,
    unit: 'count',
    startTime: recordedAt,
    recordedAt,
    quality: 'direct',
    provenance: {
      provider: 'health-connect',
      ingestionMethod: 'native-sync',
      sourceName: sourceId,
      originalType: 'steps',
      originalUnit: 'count',
      externalId: `${sourceId}:${recordedAt}`,
      importedAt: recordedAt,
    },
  };
}

function source(id: string, lastSuccessAt: string): HealthSourceState {
  return {
    id,
    provider: 'health-connect',
    displayName: id,
    status: 'current',
    supportedMetrics: ['steps'],
    grantedMetrics: ['steps'],
    staleAfterMs: 24 * 60 * 60_000,
    lastSuccessAt,
  };
}

describe('connected-health temporal freshness', () => {
  const now = new Date('2026-09-04T12:00:00Z');

  it('classifies and excludes materially future observations from metric queries', () => {
    const current = observation('2026-09-04T11:55:00Z');
    const future = observation('2026-09-04T13:00:00Z');
    expect(observationFreshness(future, now)).toBe('future');
    expect(observationsForMetric([future, current], 'steps', { now })).toEqual([current]);
  });

  it('does not choose a source that only has invalid/future evidence', () => {
    const futureSource = source('future-source', '2026-09-04T11:59:00Z');
    const currentSource = source('current-source', '2026-09-04T11:58:00Z');
    const selected = chooseSourceForMetric(
      [observation('2026-09-04T13:00:00Z', futureSource.id), observation('2026-09-04T11:50:00Z', currentSource.id)],
      [futureSource, currentSource],
      'steps',
      futureSource.id,
      now,
    );
    expect(selected?.id).toBe(currentSource.id);
  });

  it('does not treat a future source sync timestamp as current', () => {
    expect(sourceFreshness(source('source-a', '2026-09-05T12:00:00Z'), now)).toBe('stale');
  });
});
