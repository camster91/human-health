import { deviceLocalDayKey } from './local-day';
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

export type HabitCoverage = {
  metric: ConnectedMetric;
  sourceId?: string;
  daysWithData: number;
  daysMeetingTarget: number;
  currentStreak: number;
  average: number | null;
  note: string;
};

export function habitCoverage(observations: HealthObservation[], metric: ConnectedMetric, target: number, options: { sourceId?: string; now?: Date; days?: number } = {}): HabitCoverage {
  const now = options.now || new Date();
  const days = Math.max(1, Math.min(31, Math.floor(options.days || 7)));
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const selected = observations.filter(item => item.metric === metric && (!options.sourceId || item.sourceId === options.sourceId) && Date.parse(item.startTime) >= cutoff.getTime() && Date.parse(item.startTime) <= now.getTime());
  const groups = new Map<string, number[]>();
  selected.forEach(item => {
    const key = deviceLocalDayKey(item.startTime);
    if (key) groups.set(key, [...(groups.get(key) || []), item.value]);
  });
  const daily = new Map<string, number>();
  for (const [key, values] of groups) daily.set(key, metric === 'meal-quality' ? values.reduce((sum, value) => sum + value, 0) / values.length : values.reduce((sum, value) => sum + value, 0));
  const dayValues: { key: string; value: number | null }[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(cutoff);
    date.setDate(cutoff.getDate() + offset);
    const key = deviceLocalDayKey(date);
    dayValues.push({ key, value: daily.get(key) ?? null });
  }
  const values = dayValues.flatMap(day => day.value === null ? [] : [day.value]);
  const daysMeetingTarget = target > 0 ? values.filter(value => value >= target).length : 0;
  let currentStreak = 0;
  if (target > 0) {
    for (let index = dayValues.length - 1; index >= 0; index--) {
      if ((dayValues[index].value ?? Number.NEGATIVE_INFINITY) >= target) currentStreak++;
      else break;
    }
  }
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return {
    metric,
    sourceId: options.sourceId,
    daysWithData: values.length,
    daysMeetingTarget,
    currentStreak,
    average,
    note: target <= 0
      ? 'This habit target is disabled.'
      : values.length === 0
        ? `No ${metricDefinitions[metric].label.toLowerCase()} entries are recorded in the last ${days} device-local days.`
        : `${daysMeetingTarget}/${days} device-local days met the target from the selected source; current streak ${currentStreak} day${currentStreak === 1 ? '' : 's'}. Missing days remain missing rather than being counted as zero.`,
  };
}
