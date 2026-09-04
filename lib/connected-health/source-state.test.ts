import { describe, expect, it } from 'vitest';
import { sourceStatesFromObservations } from './import/source-state';
import { makeObservation, makeSource } from './test-helpers';

describe('imported source state', () => {
  it('unions previously supported metrics and keeps provider sources separate', () => {
    const previous = makeSource('apple-export', { provider: 'apple-health', supportedMetrics: ['steps'], grantedMetrics: ['steps'], recordCount: 10 });
    const observations = [
      makeObservation('sleep-duration', 480, { sourceId: 'apple-export', externalId: 'sleep-1', provenance: { provider: 'apple-health', ingestionMethod: 'file-import', sourceName: 'Apple export', originalType: 'sleep', originalUnit: 'minute', externalId: 'sleep-1', importedAt: '2026-09-03T12:00:00Z' } }),
      makeObservation('steps', 2_000, { sourceId: 'phone-export', externalId: 'steps-1', provenance: { provider: 'apple-health', ingestionMethod: 'file-import', sourceName: 'Phone export', originalType: 'steps', originalUnit: 'count', externalId: 'steps-1', importedAt: '2026-09-03T12:00:00Z' } }),
    ];
    const states = sourceStatesFromObservations(observations, [previous]);
    expect(states).toHaveLength(2);
    expect(states.find(state => state.id === 'apple-export')?.supportedMetrics.sort()).toEqual(['sleep-duration', 'steps']);
    expect(states.find(state => state.id === 'phone-export')?.displayName).toBe('Phone export');
  });
});
