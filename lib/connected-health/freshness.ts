import { metricDefinitions } from './metrics';
import { ConnectedMetric, HealthObservation, HealthSourceState, ObservationFreshness } from './types';

export function observationFreshness(observation: HealthObservation, now = new Date()): ObservationFreshness {
  const recorded = Date.parse(observation.recordedAt || observation.endTime || observation.startTime);
  if (!Number.isFinite(recorded)) return 'invalid';
  const age = now.getTime() - recorded;
  if (age < -5 * 60_000) return 'future';
  return age <= metricDefinitions[observation.metric].defaultFreshMs ? 'current' : 'stale';
}

export function sourceFreshness(source: HealthSourceState, now = new Date()) {
  if (source.status === 'unavailable' || source.status === 'not-connected' || source.status === 'permission-required' || source.status === 'syncing' || source.status === 'failed' || source.status === 'partial') return source.status;
  if (!source.lastSuccessAt) return 'stale' as const;
  return now.getTime() - Date.parse(source.lastSuccessAt) <= source.staleAfterMs ? 'current' as const : 'stale' as const;
}

export function observationsForMetric(observations: HealthObservation[], metric: ConnectedMetric, options: { sourceId?: string; currentOnly?: boolean; now?: Date } = {}) {
  const now = options.now || new Date();
  return observations
    .filter(item => item.metric === metric && (!options.sourceId || item.sourceId === options.sourceId) && (!options.currentOnly || observationFreshness(item, now) === 'current'))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
}

export function chooseSourceForMetric(observations: HealthObservation[], sources: HealthSourceState[], metric: ConnectedMetric, preferredSourceId?: string, now = new Date()) {
  const candidates = sources
    .filter(source => observations.some(item => item.sourceId === source.id && item.metric === metric))
    .sort((a, b) => {
      if (a.id === preferredSourceId) return -1;
      if (b.id === preferredSourceId) return 1;
      const rank = { current: 0, partial: 1, stale: 2, syncing: 3, failed: 4, 'permission-required': 5, unavailable: 6, 'not-connected': 7 } as const;
      const stateDifference = rank[sourceFreshness(a, now)] - rank[sourceFreshness(b, now)];
      if (stateDifference) return stateDifference;
      return Date.parse(b.lastSuccessAt || '1970-01-01') - Date.parse(a.lastSuccessAt || '1970-01-01');
    });
  return candidates[0] || null;
}
