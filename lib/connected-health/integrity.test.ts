import { describe, expect, it } from 'vitest';
import { assertConnectedHealthRelationships, connectedHealthRelationshipErrors } from './integrity';
import { makeObservation, makeSource } from './test-helpers';

describe('connected-health observation/source relationship integrity', () => {
  it('accepts observations whose source, provider and supported metrics agree', () => {
    const source = makeSource('watch', { provider: 'health-connect', supportedMetrics: ['steps', 'heart-rate'], grantedMetrics: ['steps'] });
    const observation = makeObservation('steps', 1_000, {
      sourceId: 'watch',
      provenance: {
        provider: 'health-connect', ingestionMethod: 'native-sync', sourceName: 'Watch', originalType: 'StepsRecord', originalUnit: 'count', externalId: 'steps-1', importedAt: '2026-09-03T12:00:00Z',
      },
    });
    expect(connectedHealthRelationshipErrors([observation], [source])).toEqual([]);
    expect(() => assertConnectedHealthRelationships([observation], [source])).not.toThrow();
  });

  it('rejects orphaned observations', () => {
    const observation = makeObservation('steps', 1_000, { sourceId: 'missing' });
    expect(() => assertConnectedHealthRelationships([observation], [])).toThrow('references missing source');
  });

  it('rejects duplicate observation identities instead of silently choosing one', () => {
    const source = makeSource('watch');
    const observation = makeObservation('steps', 1_000, { sourceId: 'watch', externalId: 'same' });
    expect(() => assertConnectedHealthRelationships([observation, { ...observation }], [source])).toThrow('appears more than once');
  });

  it('rejects observation/source provider mismatches', () => {
    const source = makeSource('watch', { provider: 'health-connect', supportedMetrics: ['steps'], grantedMetrics: ['steps'] });
    const observation = makeObservation('steps', 1_000, { sourceId: 'watch' });
    expect(() => assertConnectedHealthRelationships([observation], [source])).toThrow('does not match source');
  });

  it('rejects observations whose metric is not supported by the source', () => {
    const source = makeSource('watch', { supportedMetrics: ['heart-rate'], grantedMetrics: ['heart-rate'] });
    const observation = makeObservation('steps', 1_000, { sourceId: 'watch' });
    expect(() => assertConnectedHealthRelationships([observation], [source])).toThrow('is not supported by source');
  });

  it('rejects duplicate source identities instead of silently choosing one', () => {
    const first = makeSource('watch');
    const second = makeSource('watch', { displayName: 'Duplicate watch' });
    expect(() => assertConnectedHealthRelationships([], [first, second])).toThrow('appears more than once');
  });

  it('does not require a currently granted metric for retained historical observations', () => {
    const source = makeSource('watch', { supportedMetrics: ['steps'], grantedMetrics: [], status: 'not-connected' });
    const observation = makeObservation('steps', 1_000, { sourceId: 'watch' });
    expect(() => assertConnectedHealthRelationships([observation], [source])).not.toThrow();
  });
});
