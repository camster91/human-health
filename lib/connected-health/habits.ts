import { metricDefinitions } from './metrics';
import { observationId, stableHash } from './merge';
import { ConnectedHealthPreferences, ConnectedMetric, HealthObservation } from './types';

export const habitMetrics: ConnectedMetric[] = ['water', 'protein', 'fibre', 'fruit-vegetable-servings', 'meal-quality'];

export function createManualObservation(metric: ConnectedMetric, value: number, at = new Date(), tags?: Record<string, string | number | boolean>): HealthObservation {
  if (!habitMetrics.includes(metric)) throw new Error(`${metric} is not a supported manual habit metric.`);
  const unit = metricDefinitions[metric].unit;
  const recordedAt = at.toISOString();
  const externalId = `manual:${metric}:${recordedAt}:${stableHash(JSON.stringify(tags || {}))}`;
  return {
    id: observationId('manual:habits', externalId),
    sourceId: 'manual:habits',
    metric,
    value,
    unit,
    startTime: recordedAt,
    recordedAt,
    quality: 'direct',
    provenance: {
      provider: 'manual',
      ingestionMethod: 'manual',
      sourceName: 'Manual habit log',
      originalType: metric,
      originalUnit: unit,
      externalId,
      importedAt: recordedAt,
    },
    tags,
  };
}

export function habitTarget(metric: ConnectedMetric, preferences: ConnectedHealthPreferences) {
  if (metric === 'water') return preferences.waterTargetMl;
  if (metric === 'protein') return preferences.proteinTargetG;
  if (metric === 'fibre') return preferences.fibreTargetG;
  if (metric === 'fruit-vegetable-servings') return preferences.fruitVegetableTarget;
  return 5;
}
