import { describe, expect, it } from 'vitest';
import { chooseSourceForMetric, observationFreshness, sourceFreshness } from './freshness';
import { convertToCanonical } from './metrics';
import { mergeObservationCollections, normalizeObservation, observationId, stableHash } from './merge';
import { defaultConnectedHealthPreferences } from './types';
import { makeObservation, makeSource } from './test-helpers';

describe('connected-health normalization and merge', () => {
  it('converts supported source units into canonical units', () => {
    expect(convertToCanonical('sleep-duration', 8, 'hour')).toEqual({ value: 480, unit: 'minute' });
    expect(convertToCanonical('distance', 1_500, 'm')).toEqual({ value: 1.5, unit: 'km' });
    expect(convertToCanonical('water', 1.25, 'L')).toEqual({ value: 1_250, unit: 'ml' });
    expect(convertToCanonical('protein', 25_000, 'mg')).toEqual({ value: 25, unit: 'g' });
    expect(convertToCanonical('heart-rate', 72, 'count/min')).toEqual({ value: 72, unit: 'bpm' });
    expect(convertToCanonical('cardio-fitness', 42, 'mL/min·kg')).toEqual({ value: 42, unit: 'ml/kg/min' });
    expect(convertToCanonical('heart-rate', Number.NaN, 'bpm')).toBeNull();
  });

  it('rejects unknown non-empty units instead of silently treating them as canonical', () => {
    expect(convertToCanonical('distance', 5, 'furlong')).toBeNull();
    expect(convertToCanonical('water', 2, 'bucket')).toBeNull();
    expect(convertToCanonical('steps', 100, 'metres')).toBeNull();
    expect(convertToCanonical('steps', 100)).toEqual({ value: 100, unit: 'count' });
  });

  it('derives observation identity from source ownership instead of trusting an imported ID', () => {
    const first = makeObservation('steps', 1_000, { sourceId: 'watch:a', externalId: 'record-1' });
    const malicious = makeObservation('steps', 2_000, { id: first.id, sourceId: 'watch:b', externalId: 'record-1' });
    const normalized = normalizeObservation(malicious)!;
    expect(normalized.id).toBe(observationId('watch:b', 'record-1'));
    expect(normalized.id).not.toBe(first.id);
    expect(stableHash('one')).not.toBe(stableHash('two'));
    expect(stableHash('one').length).toBeGreaterThanOrEqual(13);
    const merged = mergeObservationCollections([first], [malicious]);
    expect(merged.observations).toHaveLength(2);
  });

  it('rejects invalid provider, ingestion, quality, dates and units', () => {
    const base = makeObservation('steps', 1_000);
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, provider: 'unknown' } })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, ingestionMethod: 'scrape' } })).toBeNull();
    expect(normalizeObservation({ ...base, quality: 'estimated' })).toBeNull();
    expect(normalizeObservation({ ...base, startTime: 'bad-date' })).toBeNull();
    expect(normalizeObservation({ ...base, value: -1 })).toBeNull();
    expect(normalizeObservation({ ...base, unit: 'km' })).toBeNull();
  });

  it('rejects scalar coercion and malformed unit/timestamp types without throwing', () => {
    const base = makeObservation('steps', 1_000);
    expect(normalizeObservation({ ...base, value: '1000' })).toBeNull();
    expect(normalizeObservation({ ...base, unit: 7 })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, originalUnit: 7 } })).toBeNull();
    expect(normalizeObservation({ ...base, startTime: Date.parse(base.startTime) })).toBeNull();
    expect(normalizeObservation({ ...base, recordedAt: Date.parse(base.recordedAt) })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, importedAt: Date.parse(base.provenance.importedAt) } })).toBeNull();
  });

  it('rejects invalid versions, timezone offsets and optional provenance scalar types', () => {
    const base = makeObservation('steps', 1_000);
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, externalVersion: -1 } })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, externalVersion: 1.5 } })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, externalVersion: Number.NaN } })).toBeNull();
    expect(normalizeObservation({ ...base, timezoneOffsetMinutes: 14 * 60 + 1 })).toBeNull();
    expect(normalizeObservation({ ...base, timezoneOffsetMinutes: 30.5 })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, applicationId: 42 } })).toBeNull();
    expect(normalizeObservation({ ...base, provenance: { ...base.provenance, device: { name: 'watch' } } })).toBeNull();
  });

  it('rejects malformed tags rather than silently dropping untrusted tag values', () => {
    const base = makeObservation('steps', 1_000);
    expect(normalizeObservation({ ...base, tags: ['bad'] })).toBeNull();
    expect(normalizeObservation({ ...base, tags: { sample: Number.NaN } })).toBeNull();
    expect(normalizeObservation({ ...base, tags: { sample: null } })).toBeNull();
    expect(normalizeObservation({ ...base, tags: { '': 'bad-key' } })).toBeNull();
  });

  it('returns only the canonical observation schema and preserves valid provenance/tags', () => {
    const base = makeObservation('steps', 1_000, { timezoneOffsetMinutes: -300 });
    const input = {
      ...base,
      undeclaredSecret: 'must not survive normalization',
      tags: { sourceFlag: true, sampleIndex: 2, label: 'walking' },
      provenance: {
        ...base.provenance,
        applicationId: 'com.example.health',
        device: 'Watch',
        externalVersion: 2,
        undeclaredProvenanceSecret: 'must not survive normalization',
      },
    };
    const normalized = normalizeObservation(input)!;
    expect(normalized.timezoneOffsetMinutes).toBe(-300);
    expect(normalized.tags).toEqual({ sourceFlag: true, sampleIndex: 2, label: 'walking' });
    expect(normalized.provenance.applicationId).toBe('com.example.health');
    expect(normalized.provenance.device).toBe('Watch');
    expect(normalized.provenance.externalVersion).toBe(2);
    expect(normalized).not.toHaveProperty('undeclaredSecret');
    expect(normalized.provenance).not.toHaveProperty('undeclaredProvenanceSecret');
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
    expect(merged.deleted).toBe(1);
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
