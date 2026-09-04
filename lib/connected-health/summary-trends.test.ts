import { describe, expect, it } from 'vitest';
import { connectedSleepReadiness, summarizeConnectedHealth } from './summary';
import { connectedHealthTrends, metricTrend } from './trends';
import { defaultConnectedHealthPreferences } from './types';
import { makeObservation, makeSource } from './test-helpers';

describe('connected-health summaries', () => {
  const now = new Date('2026-09-03T18:00:00Z');

  it('uses one selected source rather than adding duplicated provider totals', () => {
    const observations = [
      makeObservation('steps', 2_000, { sourceId: 'watch', startTime: '2026-09-03T10:00:00Z', recordedAt: '2026-09-03T10:00:00Z' }),
      makeObservation('steps', 3_000, { sourceId: 'watch', startTime: '2026-09-03T12:00:00Z', recordedAt: '2026-09-03T12:00:00Z' }),
      makeObservation('steps', 9_000, { sourceId: 'phone', startTime: '2026-09-03T12:00:00Z', recordedAt: '2026-09-03T12:00:00Z' }),
    ];
    const sources = [makeSource('watch', { displayName: 'Watch', lastSuccessAt: '2026-09-03T12:00:00Z' }), makeSource('phone', { displayName: 'Phone', lastSuccessAt: '2026-09-03T12:00:00Z' })];
    const preferences = { ...defaultConnectedHealthPreferences, primarySourceByMetric: { steps: 'watch' } };
    const summary = summarizeConnectedHealth(observations, sources, preferences, now);
    expect(summary.stepsToday.value).toBe(5_000);
    expect(summary.stepsToday.sourceName).toBe('Watch');
  });

  it('summarizes detailed sleep stages without double-counting a general asleep record', () => {
    const observations = [
      makeObservation('sleep-stage', 480, { sourceId: 'sleep', startTime: '2026-09-02T22:00:00Z', endTime: '2026-09-03T06:00:00Z', recordedAt: '2026-09-03T06:00:00Z', tags: { stage: 'asleep' } }),
      makeObservation('sleep-stage', 240, { sourceId: 'sleep', startTime: '2026-09-02T22:00:00Z', endTime: '2026-09-03T02:00:00Z', recordedAt: '2026-09-03T02:00:00Z', tags: { stage: 'core' } }),
      makeObservation('sleep-stage', 120, { sourceId: 'sleep', startTime: '2026-09-03T02:00:00Z', endTime: '2026-09-03T04:00:00Z', recordedAt: '2026-09-03T04:00:00Z', tags: { stage: 'deep' } }),
      makeObservation('sleep-stage', 120, { sourceId: 'sleep', startTime: '2026-09-03T04:00:00Z', endTime: '2026-09-03T06:00:00Z', recordedAt: '2026-09-03T06:00:00Z', tags: { stage: 'rem' } }),
    ];
    const source = makeSource('sleep', { displayName: 'Sleep source', supportedMetrics: ['sleep-stage'], grantedMetrics: ['sleep-stage'], lastSuccessAt: '2026-09-03T06:00:00Z' });
    const summary = summarizeConnectedHealth(observations, [source], defaultConnectedHealthPreferences, now);
    expect(summary.sleepLastNight.value).toBe(480);
    expect(connectedSleepReadiness(summary, true)).toEqual({ sleepHours: 8, sleep: 'good' });
  });

  it('does not use stale connected sleep to generate readiness context', () => {
    const observation = makeObservation('sleep-duration', 480, { sourceId: 'sleep', startTime: '2026-08-01T22:00:00Z', endTime: '2026-08-02T06:00:00Z', recordedAt: '2026-08-02T06:00:00Z' });
    const source = makeSource('sleep', { supportedMetrics: ['sleep-duration'], grantedMetrics: ['sleep-duration'], lastSuccessAt: '2026-08-02T06:00:00Z' });
    const summary = summarizeConnectedHealth([observation], [source], defaultConnectedHealthPreferences, now);
    expect(summary.sleepLastNight.status).toBe('stale');
    expect(connectedSleepReadiness(summary, true)).toEqual({});
  });

  it('averages multiple meal-quality logs rather than adding scores', () => {
    const observations = [makeObservation('meal-quality', 3, { sourceId: 'manual', startTime: '2026-09-03T12:00:00Z' }), makeObservation('meal-quality', 5, { sourceId: 'manual', startTime: '2026-09-03T17:00:00Z' })];
    const source = makeSource('manual', { supportedMetrics: ['meal-quality'], grantedMetrics: ['meal-quality'], lastSuccessAt: '2026-09-03T17:00:00Z' });
    expect(summarizeConnectedHealth(observations, [source], defaultConnectedHealthPreferences, now).mealQualityToday.value).toBe(4);
  });

  it('links heart-rate samples to the latest workout interval without medical interpretation', () => {
    const observations = [
      makeObservation('workout-duration', 45, { sourceId: 'watch', startTime: '2026-09-03T12:00:00Z', endTime: '2026-09-03T12:45:00Z', recordedAt: '2026-09-03T12:45:00Z' }),
      makeObservation('heart-rate', 100, { sourceId: 'watch', startTime: '2026-09-03T12:05:00Z', recordedAt: '2026-09-03T12:05:00Z' }),
      makeObservation('heart-rate', 140, { sourceId: 'watch', startTime: '2026-09-03T12:20:00Z', recordedAt: '2026-09-03T12:20:00Z' }),
      makeObservation('heart-rate', 120, { sourceId: 'watch', startTime: '2026-09-03T12:40:00Z', recordedAt: '2026-09-03T12:40:00Z' }),
      makeObservation('heart-rate', 70, { sourceId: 'watch', startTime: '2026-09-03T13:30:00Z', recordedAt: '2026-09-03T13:30:00Z' }),
    ];
    const source = makeSource('watch', { displayName: 'Watch', supportedMetrics: ['heart-rate', 'workout-duration'], grantedMetrics: ['heart-rate', 'workout-duration'], lastSuccessAt: '2026-09-03T13:30:00Z' });
    const workout = summarizeConnectedHealth(observations, [source], defaultConnectedHealthPreferences, now).workoutHeartRate;
    expect(workout.sampleCount).toBe(3);
    expect(workout.average).toBe(120);
    expect(workout.minimum).toBe(100);
    expect(workout.maximum).toBe(140);
    expect(workout.note).toContain('not a medical interpretation');
  });
});

describe('connected-health trends', () => {
  it('compares recent and preceding windows from one source', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    const observations = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now.getTime() - index * 86_400_000);
      return makeObservation('steps', index < 7 ? 10_000 : 8_000, { sourceId: 'watch', startTime: date.toISOString(), recordedAt: date.toISOString(), externalId: `steps-${index}` });
    });
    const source = makeSource('watch', { lastSuccessAt: now.toISOString(), staleAfterMs: 48 * 3_600_000 });
    const trend = metricTrend(observations, [source], defaultConnectedHealthPreferences, 'steps', { now });
    expect(trend.currentAverage).toBeGreaterThan(trend.previousAverage || 0);
    expect(trend.direction).toBe('up');
    expect(connectedHealthTrends(observations, [source], defaultConnectedHealthPreferences, now)).toHaveLength(4);
  });
});
