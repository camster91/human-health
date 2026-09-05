import { describe, expect, it } from 'vitest';
import { normalizeStoredObservationRows, storedRowBelongsToSource } from './repository';
import { makeObservation } from './test-helpers';

describe('connected-health persisted-row integrity', () => {
  it('normalizes valid stored observations before returning them to product logic', () => {
    const valid = makeObservation('steps', 1234, { sourceId: 'watch', externalId: 'steps-1' });
    const result = normalizeStoredObservationRows([{ ...valid, id: 'untrusted-import-id' }]);

    expect(result.invalidCount).toBe(0);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].sourceId).toBe('watch');
    expect(result.observations[0].id).not.toBe('untrusted-import-id');
  });

  it('quarantines malformed provenance, timestamps, and unknown metrics', () => {
    const valid = makeObservation('steps', 1234, { sourceId: 'watch', externalId: 'steps-1' });
    const rows = [
      { ...valid, provenance: undefined },
      { ...valid, startTime: 'not-a-date', provenance: { ...valid.provenance, externalId: 'bad-time' } },
      { ...valid, metric: 'diagnosis-score', provenance: { ...valid.provenance, externalId: 'bad-metric' } },
    ];
    const result = normalizeStoredObservationRows(rows);

    expect(result.observations).toEqual([]);
    expect(result.invalidCount).toBe(3);
    expect(result.invalidSourceIds).toEqual(['watch']);
  });

  it('treats an invalid row without source ownership as globally unsafe', () => {
    const result = normalizeStoredObservationRows([{ id: 'broken', metric: 'steps' }], 'watch');
    expect(result.observations).toEqual([]);
    expect(result.invalidCount).toBe(1);
    expect(result.invalidSourceIds).toEqual([]);
  });

  it('scopes known invalid rows to their source when a source-specific read is requested', () => {
    const valid = makeObservation('steps', 1234, { sourceId: 'watch', externalId: 'steps-1' });
    const otherCorrupt = { ...valid, id: 'phone:phone-corrupt', sourceId: 'phone', startTime: 'invalid', provenance: { ...valid.provenance, externalId: 'phone-corrupt' } };
    const result = normalizeStoredObservationRows([valid, otherCorrupt], 'watch');

    expect(result.invalidCount).toBe(0);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].sourceId).toBe('watch');
  });

  it('can attribute corrupt rows by explicit sourceId or canonical id prefix for deletion', () => {
    expect(storedRowBelongsToSource({ id: 'watch:abc', sourceId: 'watch' }, 'watch')).toBe(true);
    expect(storedRowBelongsToSource({ id: 'watch:abc' }, 'watch')).toBe(true);
    expect(storedRowBelongsToSource({ id: 'phone:abc', sourceId: 'phone' }, 'watch')).toBe(false);
  });
});
