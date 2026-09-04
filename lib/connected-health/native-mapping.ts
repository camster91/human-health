import { convertToCanonical } from './metrics';
import { ConnectedMetric, HealthObservation, HealthProvider, NativeBridgeRecord } from './types';
import { observationId } from './merge';

const healthConnectTypes: Record<string, ConnectedMetric> = {
  StepsRecord: 'steps',
  SleepSessionRecord: 'sleep-duration',
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

function buildObservation(provider: HealthProvider, sourceId: string, record: NativeBridgeRecord, metric: ConnectedMetric, value: number, unit?: string, suffix = ''): HealthObservation | null {
  const normalized = convertToCanonical(metric, value, unit);
  if (!normalized) return null;
  const importedAt = new Date().toISOString();
  const externalId = `${record.id}${suffix}`;
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
    tags: record.metadata || undefined,
  };
}

export function mapNativeRecord(provider: Extract<HealthProvider, 'health-connect' | 'apple-health'>, sourceId: string, record: NativeBridgeRecord): HealthObservation[] {
  const directMetric = record.metric || (provider === 'health-connect' ? healthConnectTypes[record.type] : appleTypes[record.type]);
  const observations: HealthObservation[] = [];

  if (record.type === 'HeartRateRecord' && record.samples?.length) {
    record.samples.forEach((sample, index) => {
      const mapped = buildObservation(provider, sourceId, { ...record, startTime: sample.time, endTime: undefined, recordedAt: sample.time }, 'heart-rate', sample.value, sample.unit || record.unit, `:sample:${index}:${sample.time}`);
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
  const value = typeof record.value === 'number' ? record.value : directMetric === 'sleep-duration' || directMetric === 'workout-duration' ? durationMinutes(record) : undefined;
  if (typeof value !== 'number') return observations;
  const mapped = buildObservation(provider, sourceId, record, directMetric, value, record.unit || (directMetric.endsWith('duration') ? 'minute' : undefined));
  if (mapped) observations.push(mapped);
  return observations;
}
