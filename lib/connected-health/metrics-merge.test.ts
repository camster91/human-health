import { describe, expect, it } from 'vitest';
import { chooseSourceForMetric, observationFreshness, sourceFreshness } from './freshness';
import { convertToCanonical } from './metrics';
import { mergeObservationCollections } from './merge';
import { defaultConnectedHealthPreferences } from './types';
import { makeObservation, makeSource } from './test-helpers';

describe('connected-health normalization and merge', () => {
  it('converts supported source units into canonical units', () => {
    expect(convertToCanonical('sleep-duration', 8, 'hour')).toEqual({ value: 480, unit: 'minute' });
    expect(convertToCanonical('distance', 1_500, 'm')).toEqual({ value: 1.5, unit: 'km' });
    expect(convertToCanonical('water', 1.25, 'L')).toEqual({ value: 1_250, unit: 'ml' });
    expect(convertToCanonical('protein', 25_000, 'mg')).toEqual({ value: 25, unit: 'g' });
    expect(convertToCanonical('heart-rate', Number.NaN, 'bpm')).toBeNull();
  });

  it('upserts a newer provider version without duplicating the observation', () => {
    const first = makeObservation('steps', 1_000, { externalId: 'record-1', provenance: { provider: 'health-connect', ingestionMethod: 'native-sync', sourceName: 'Health Connect', originalType: 'StepsRecord', originalUnit: 'count', externalId: 'record-1', externalVersion: 1, importedAt: '2026-09-01T12:00:00Z' } });
    const updated = makeObservation('steps', 1_200, { externalId: 'record-1', provenance: { ...first.provenance, externalVersion: 2, importedAt: '2026-09-02T12:00:00Z' } });
    const merged = mergeObservationCollections([first], [updated]);
    expect(merged.observations).toHaveLength(1);
    expect(merged.observations[0].value).toBe(1_200);
  });

  it('applies source-scoped provider deletions', () => {
    const sourceA = makeObservation('steps', 1_000, { sourceId: 'a', externalId: 'same-record' });
    const sourceB = makeObservation('steps', 2_000, { sourceId: 'b', externalId: 'same-record' });
    const merged = mergeObservationCollections([sourceA, sourceB], [], ['same-record'], 'a');
    expect(merged.observations.map(item => item.sourceId)).toEqual(['b']);
  });

  it('reports observation/source freshness and honours an explicit primary source', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    const current = makeObservation('steps', 1_000, { sourceId: 'a', recordedAt: '2026-09-03T08:00:00Z' });
    const stale = makeObservation('steps', 2_000, { sourceId: 'b', recordedAt: '2026-08-01T08:00:00Z' });
    const sources = [makeSource('a', { lastSuccessAt: '2026-09-03T08:00:00Z' }), makeSource('b', { lastSuccessAt: '2026-08-01T08:00:00Z' })];
    expect(observationFreshness(current, now)).toBe('current');
    expect(observationFreshness(stale, now)).toBe('stale');
    expect(sourceFreshness(sources[1], now)).toBe('stale');
    expect(chooseSourceForMetric([current, stale], sources, 'steps', 'b', now)?.id).toBe('b');
    expect(defaultConnectedHealthPreferences.primarySourceByMetric.steps).toBeUndefined();
  });
});
