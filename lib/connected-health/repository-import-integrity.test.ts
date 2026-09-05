import { describe, expect, it } from 'vitest';
import { assertConnectedHealthRelationships } from './integrity';
import { parseConnectedSourceState } from './import/canonical-json';
import { mergeObservationCollections } from './merge';
import { makeObservation, makeSource } from './test-helpers';

describe('connected-health repository import integrity', () => {
  it('rejects a merged source replacement that would invalidate existing observations', () => {
    const currentObservation = makeObservation('steps', 1_000, {
      sourceId: 'watch',
      provenance: {
        provider: 'health-connect', ingestionMethod: 'native-sync', sourceName: 'Watch', originalType: 'StepsRecord', originalUnit: 'count', externalId: 'steps-1', importedAt: '2026-09-03T12:00:00Z',
      },
    });
    const currentSource = parseConnectedSourceState(makeSource('watch', { provider: 'health-connect', supportedMetrics: ['steps'], grantedMetrics: ['steps'] }));
    const incomingSource = parseConnectedSourceState(makeSource('watch', { provider: 'apple-health', supportedMetrics: ['steps'], grantedMetrics: ['steps'] }));
    const merged = mergeObservationCollections([currentObservation], []);

    expect(() => assertConnectedHealthRelationships(merged.observations, [incomingSource])).toThrow('does not match source');
    expect(() => assertConnectedHealthRelationships(merged.observations, [currentSource])).not.toThrow();
  });

  it('rebuilds source state without propagating undeclared imported properties', () => {
    const parsed = parseConnectedSourceState({
      ...makeSource('watch', { provider: 'health-connect', supportedMetrics: ['steps'], grantedMetrics: ['steps'] }),
      secretToken: 'must-not-survive',
      nested: { arbitrary: true },
    });

    expect(parsed).not.toHaveProperty('secretToken');
    expect(parsed).not.toHaveProperty('nested');
    expect(parsed.id).toBe('watch');
    expect(parsed.provider).toBe('health-connect');
  });
});
