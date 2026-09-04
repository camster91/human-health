import { convertToCanonical } from './metrics';
import { ConnectedMetric, HealthObservation, HealthProvider, NativeBridgeRecord } from './types';
import { observationId } from './merge';

const healthConnectTypes: Record<string, ConnectedMetric> = {
  StepsRecord: 'steps',
  SleepSessionRecord: 'sleep-duration',
  SleepStageRecord: 'sleep-stage',
  HeartRateRecord: 'heart-rate',
  RestingHeartRateRecord: 'resting-heart-rate',
  Vo2MaxRecord: 'cardio-fitness',
  DistanceRecord: 'distance',
  ActiveCaloriesBurnedRecord: 'active-energy',
  HydrationRecord: 'water',
  ExerciseSessionRecord: 'workout-duration',
};

const appleTypes: Record<string, ConnectedMetric> = {
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep-stage',
  HKQuantityTypeIdentifierHeartRate: 'heart-rate',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting-heart-rate',
  HKQuantityTypeIdentifierVO2Max: 'cardio-fitness',
  HKQuantityTypeIdentifierDistanceWalkingRunning: 'distance',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'active-energy',
  HKQuantityTypeIdentifierDietaryWater: 'water',
  HKQuantityTypeIdentifierDietaryProtein: 'protein',
  HKQuantityTypeIdentifierDietaryFiber: 'fibre',
  HKWorkoutTypeIdentifier: 'workout-duration',
};

function durationMinutes(record: NativeBridgeRecord) {
  const start = Date.parse(record.startTime);
  const end = Date.parse(record.endTime || record.recordedAt || record.startTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 60_000 : undefined;
}

function cleanTags(metadata?: NativeBridgeRecord['metadata']) {
  if (!metadata) return undefined;
  const values = Object.entries(metadata).filter(([, value]) => value !== null) as [string, string | number | boolean][];
  return values.length ? Object.fromEntries(values) : undefined;
}

function buildObservation(provider: HealthProvider, sourceId: string, record: NativeBridgeRecord, metric: ConnectedMetric, value: number, unit?: string, suffix = '', extraTags?: Record<string, string | number | boolean>): HealthObservation | null {
  const normalized = convertToCanonical(metric, value, unit);
  if (!normalized) return null;
  const importedAt = new Date().toISOString();
  const externalId = `${record.id}${suffix}`;
  const tags = { ...(cleanTags(record.metadata) || {}), ...(extraTags || {}) };
  return {
    id: observationId(sourceId, externalId),
    sourceId,
    metric,
    value: normalized.value,
    unit: normalized.unit,
    startTime: record.startTime,
    endTime: record.endTime,
    recordedAt: record.recordedAt || record.endTime || record.startTime,
    timezoneOffsetMinutes: record.timezoneOffsetMinutes,
    quality: 'direct',
    provenance: {
      provider,
      ingestionMethod: 'native-sync',
      sourceName: record.sourceName || (provider === 'health-connect' ? 'Health Connect' : 'Apple Health'),
      applicationId: record.dataOrigin,
      device: record.device,
      originalType: record.type,
      originalUnit: unit,
      externalId,
      externalVersion: record.version,
      importedAt,
    },
    tags: Object.keys(tags).length ? tags : undefined,
  };
}

export function mapNativeRecord(provider: Extract<HealthProvider, 'health-connect' | 'apple-health'>, sourceId: string, record: NativeBridgeRecord): HealthObservation[] {
  const directMetric = record.metric || (provider === 'health-connect' ? healthConnectTypes[record.type] : appleTypes[record.type]);
  const observations: HealthObservation[] = [];

  if ((record.type === 'HeartRateRecord' || record.type === 'HKQuantityTypeIdentifierHeartRate') && record.samples?.length) {
    record.samples.forEach(sample => {
      const sampleUnit = sample.unit || record.unit;
      const sampleKey = `${sample.time}:${sample.value}:${sampleUnit || ''}`;
      const mapped = buildObservation(provider, sourceId, { ...record, startTime: sample.time, endTime: undefined, recordedAt: sample.time }, 'heart-rate', sample.value, sampleUnit, `:sample:${sampleKey}`);
      if (mapped) observations.push(mapped);
    });
    return observations;
  }

  if (record.type === 'NutritionRecord') {
    const nutrientMap: [ConnectedMetric, string, string][] = [['water', 'water', 'ml'], ['protein', 'protein', 'g'], ['fibre', 'fibre', 'g']];
    nutrientMap.forEach(([metric, key, fallbackUnit]) => {
      const value = Number(record.metadata?.[key]);
      if (!Number.isFinite(value)) return;
      const unit = String(record.metadata?.[`${key}Unit`] || fallbackUnit);
      const mapped = buildObservation(provider, sourceId, record, metric, value, unit, `:${key}`);
      if (mapped) observations.push(mapped);
    });
    return observations;
  }

  if (!directMetric) return observations;
  const durationMetric = directMetric === 'sleep-duration' || directMetric === 'sleep-stage' || directMetric === 'workout-duration';
  const value = typeof record.value === 'number' ? record.value : durationMetric ? durationMinutes(record) : undefined;
  if (typeof value !== 'number') return observations;
  const stage = directMetric === 'sleep-stage' ? String(record.metadata?.stage || record.metadata?.value || 'unknown') : undefined;
  const mapped = buildObservation(provider, sourceId, record, directMetric, value, record.unit || (durationMetric ? 'minute' : undefined), '', stage ? { stage } : undefined);
  if (mapped) observations.push(mapped);
  return observations;
}
