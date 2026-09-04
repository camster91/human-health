import { convertToCanonical, metricDefinitions } from './metrics';
import { observationId, stableHash } from './merge';
import { ConnectedHealthPreferences, ConnectedMetric, HealthObservation } from './types';

export const habitMetrics: ConnectedMetric[] = ['water', 'protein', 'fibre', 'fruit-vegetable-servings', 'meal-quality'];

export function createManualObservation(metric: ConnectedMetric, value: number, at = new Date(), tags?: Record<string, string | number | boolean>): HealthObservation {
  if (!habitMetrics.includes(metric)) throw new Error(`${metric} is not a supported manual habit metric.`);
  const unit = metricDefinitions[metric].unit;
  const normalized = convertToCanonical(metric, Number(value), unit);
  if (!normalized) throw new Error(`${metricDefinitions[metric].label} must be a valid non-negative value.`);
  if (metric === 'meal-quality' && (normalized.value < 1 || normalized.value > 5)) throw new Error('Meal quality must be between 1 and 5.');
  if (metric === 'fruit-vegetable-servings' && normalized.value > 30) throw new Error('Fruit and vegetable servings must be 30 or fewer for one entry.');
  if ((metric === 'protein' || metric === 'fibre') && normalized.value > 500) throw new Error(`${metricDefinitions[metric].label} entry is too large to record safely.`);
  if (metric === 'water' && normalized.value > 10_000) throw new Error('Water entry must be 10,000 mL or less.');
  if (!Number.isFinite(at.getTime())) throw new Error('Habit timestamp is invalid.');
  const recordedAt = at.toISOString();
  const externalId = `manual:${metric}:${recordedAt}:${stableHash(JSON.stringify(tags || {}))}`;
  return {
    id: observationId('manual:habits', externalId),
    sourceId: 'manual:habits',
    metric,
    value: normalized.value,
    unit: normalized.unit,
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
