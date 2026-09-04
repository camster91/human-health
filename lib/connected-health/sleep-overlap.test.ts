import { describe, expect, it } from 'vitest';
import { summarizeConnectedHealth } from './summary';
import { defaultConnectedHealthPreferences } from './types';
import { makeObservation, makeSource } from './test-helpers';

describe('connected sleep overlap accounting', () => {
  it('merges overlapping asleep-stage intervals instead of double-counting them', () => {
    const observations = [
      makeObservation('sleep-stage', 240, { sourceId: 'sleep', startTime: '2026-09-02T22:00:00Z', endTime: '2026-09-03T02:00:00Z', recordedAt: '2026-09-03T02:00:00Z', tags: { stage: 'core' } }),
      makeObservation('sleep-stage', 180, { sourceId: 'sleep', startTime: '2026-09-03T01:00:00Z', endTime: '2026-09-03T04:00:00Z', recordedAt: '2026-09-03T04:00:00Z', tags: { stage: 'deep' } }),
      makeObservation('sleep-stage', 120, { sourceId: 'sleep', startTime: '2026-09-03T04:00:00Z', endTime: '2026-09-03T06:00:00Z', recordedAt: '2026-09-03T06:00:00Z', tags: { stage: 'rem' } }),
    ];
    const source = makeSource('sleep', { displayName: 'Sleep source', supportedMetrics: ['sleep-stage'], grantedMetrics: ['sleep-stage'], lastSuccessAt: '2026-09-03T06:00:00Z' });
    const summary = summarizeConnectedHealth(observations, [source], defaultConnectedHealthPreferences, new Date('2026-09-03T12:00:00Z'));
    expect(summary.sleepLastNight.value).toBe(480);
    expect(summary.sleepLastNight.note).toContain('Overlapping intervals are merged');
  });
});
