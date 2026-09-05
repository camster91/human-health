import { describe, expect, it } from 'vitest';
import { chooseSourceForMetric, observationFreshness, observationsForMetric, sourceFreshness } from './freshness';
import type { HealthObservation, HealthSourceState } from './types';

function observation(
  eventTime: string,
  sourceId = 'source-a',
  options: { recordedAt?: string; endTime?: string } = {},
): HealthObservation {
  const recordedAt = options.recordedAt || eventTime;
  return {
    id: `${sourceId}:${eventTime}:${recordedAt}`,
    sourceId,
    metric: 'steps',
    value: 1000,
    unit: 'count',
    startTime: eventTime,
    endTime: options.endTime,
    recordedAt,
    quality: 'direct',
    provenance: {
      provider: 'health-connect',
      ingestionMethod: 'native-sync',
      sourceName: sourceId,
      originalType: 'steps',
      originalUnit: 'count',
      externalId: `${sourceId}:${eventTime}:${recordedAt}`,
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
    const future = observation('2026-09-04T13:00:00Z', 'source-a', { recordedAt: '2026-09-04T11:00:00Z' });
    expect(observationFreshness(future, now)).toBe('future');
    expect(observationsForMetric([future, current], 'steps', { now })).toEqual([current]);
  });

  it('does not let a recent provider creation timestamp make an old event current', () => {
    const oldEvent = observation('2026-08-20T12:00:00Z', 'source-a', { recordedAt: '2026-09-04T11:59:00Z' });
    expect(observationFreshness(oldEvent, now)).toBe('stale');
  });

  it('orders latest evidence by event time rather than provider creation time', () => {
    const olderEventNewerCreation = observation('2026-09-04T09:00:00Z', 'source-a', { recordedAt: '2026-09-04T11:59:00Z' });
    const newerEventOlderCreation = observation('2026-09-04T11:00:00Z', 'source-a', { recordedAt: '2026-09-04T10:00:00Z' });
    expect(observationsForMetric([olderEventNewerCreation, newerEventOlderCreation], 'steps', { now })[0]).toBe(newerEventOlderCreation);
  });

  it('uses endTime as the event evidence timestamp when an interval has one', () => {
    const interval = observation('2026-08-01T10:00:00Z', 'source-a', { endTime: '2026-09-04T11:30:00Z', recordedAt: '2026-08-01T10:00:00Z' });
    expect(observationFreshness(interval, now)).toBe('current');
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
