import { ReadinessInput } from '../whole-person';
import { chooseSourceForMetric, observationFreshness, observationsForMetric, sourceFreshness } from './freshness';
import { metricDefinitions } from './metrics';
import { ConnectedHealthPreferences, ConnectedMetric, HealthObservation, HealthSourceState, ObservationFreshness } from './types';

export type ConnectedMetricSummary = {
  metric: ConnectedMetric;
  label: string;
  value: number | null;
  unit: string;
  status: 'current' | 'stale' | 'partial' | 'failed' | 'insufficient';
  sourceId?: string;
  sourceName?: string;
  recordedAt?: string;
  note: string;
};

export type ConnectedHealthSummary = {
  generatedAt: string;
  stepsToday: ConnectedMetricSummary;
  sleepLastNight: ConnectedMetricSummary;
  restingHeartRate: ConnectedMetricSummary;
  heartRate: ConnectedMetricSummary;
  cardioFitness: ConnectedMetricSummary;
  distanceToday: ConnectedMetricSummary;
  activeEnergyToday: ConnectedMetricSummary;
  waterToday: ConnectedMetricSummary;
  proteinToday: ConnectedMetricSummary;
  fibreToday: ConnectedMetricSummary;
  fruitVegetablesToday: ConnectedMetricSummary;
  mealQualityToday: ConnectedMetricSummary;
};

function sameLocalDay(value: string, target: Date) {
  const date = new Date(value);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
}

function statusFor(source: HealthSourceState | null, freshness: ObservationFreshness | null, now: Date) {
  if (!source || !freshness) return 'insufficient' as const;
  const state = sourceFreshness(source, now);
  if (state === 'failed') return 'failed' as const;
  if (state === 'partial') return 'partial' as const;
  if (state === 'stale' || freshness === 'stale') return 'stale' as const;
  if (freshness === 'current') return 'current' as const;
  return 'insufficient' as const;
}

function empty(metric: ConnectedMetric, note = 'No usable observation is available.'): ConnectedMetricSummary {
  return { metric, label: metricDefinitions[metric].label, value: null, unit: metricDefinitions[metric].unit, status: 'insufficient', note };
}

function sourceFor(observations: HealthObservation[], sources: HealthSourceState[], metric: ConnectedMetric, preferences: ConnectedHealthPreferences, now: Date) {
  return chooseSourceForMetric(observations, sources, metric, preferences.primarySourceByMetric[metric], now);
}

function dailyAggregate(metric: ConnectedMetric, observations: HealthObservation[], sources: HealthSourceState[], preferences: ConnectedHealthPreferences, now: Date, mode: 'sum' | 'average' = 'sum') {
  const source = sourceFor(observations, sources, metric, preferences, now);
  if (!source) return empty(metric);
  const values = observationsForMetric(observations, metric, { sourceId: source.id }).filter(item => sameLocalDay(item.startTime, now));
  if (!values.length) return empty(metric, `No ${metricDefinitions[metric].label.toLowerCase()} observation exists for today from ${source.displayName}.`);
  const latest = values[0];
  const sum = values.reduce((total, item) => total + item.value, 0);
  return {
    metric,
    label: metricDefinitions[metric].label,
    value: mode === 'average' ? sum / values.length : sum,
    unit: latest.unit,
    status: statusFor(source, observationFreshness(latest, now), now),
    sourceId: source.id,
    sourceName: source.displayName,
    recordedAt: latest.recordedAt,
    note: `Uses ${values.length} observation${values.length === 1 ? '' : 's'} from one selected source; other providers are not added automatically to avoid duplicate totals.`,
  };
}

function latestValue(metric: ConnectedMetric, observations: HealthObservation[], sources: HealthSourceState[], preferences: ConnectedHealthPreferences, now: Date) {
  const source = sourceFor(observations, sources, metric, preferences, now);
  if (!source) return empty(metric);
  const value = observationsForMetric(observations, metric, { sourceId: source.id })[0];
  if (!value) return empty(metric);
  return {
    metric,
    label: metricDefinitions[metric].label,
    value: value.value,
    unit: value.unit,
    status: statusFor(source, observationFreshness(value, now), now),
    sourceId: source.id,
    sourceName: source.displayName,
    recordedAt: value.recordedAt,
    note: `Latest direct observation from ${source.displayName}. This trend is descriptive, not diagnostic.`,
  };
}

function sleepSummary(observations: HealthObservation[], sources: HealthSourceState[], preferences: ConnectedHealthPreferences, now: Date) {
  const source = sourceFor(observations, sources, 'sleep-duration', preferences, now) || sourceFor(observations, sources, 'sleep-stage', preferences, now);
  if (!source) return empty('sleep-duration');
  const sessions = observationsForMetric(observations, 'sleep-duration', { sourceId: source.id });
  const latestSession = sessions[0];
  if (latestSession) return { metric: 'sleep-duration' as const, label: 'Sleep', value: latestSession.value, unit: latestSession.unit, status: statusFor(source, observationFreshness(latestSession, now), now), sourceId: source.id, sourceName: source.displayName, recordedAt: latestSession.recordedAt, note: `Latest sleep session from ${source.displayName}.` };

  const stages = observationsForMetric(observations, 'sleep-stage', { sourceId: source.id });
  const latest = stages[0];
  if (!latest) return empty('sleep-duration');
  const anchor = Date.parse(latest.endTime || latest.startTime);
  const nearby = stages.filter(item => Math.abs(anchor - Date.parse(item.endTime || item.startTime)) <= 14 * 3_600_000);
  const detailed = nearby.filter(item => ['core', 'deep', 'rem'].includes(String(item.tags?.stage || 'unknown')));
  const included = detailed.length ? detailed : nearby.filter(item => ['asleep'].includes(String(item.tags?.stage || 'unknown')));
  if (!included.length) return empty('sleep-duration', 'Sleep-stage observations exist, but no asleep stages could be summarized.');
  return {
    metric: 'sleep-duration',
    label: 'Sleep',
    value: included.reduce((sum, item) => sum + item.value, 0),
    unit: 'minute',
    status: statusFor(source, observationFreshness(latest, now), now),
    sourceId: source.id,
    sourceName: source.displayName,
    recordedAt: latest.recordedAt,
    note: `Summed ${included.length} non-overlapping asleep-stage record${included.length === 1 ? '' : 's'} near the latest sleep period; awake and in-bed-only records are excluded.`,
  };
}

export function summarizeConnectedHealth(observations: HealthObservation[], sources: HealthSourceState[], preferences: ConnectedHealthPreferences, now = new Date()): ConnectedHealthSummary {
  return {
    generatedAt: now.toISOString(),
    stepsToday: dailyAggregate('steps', observations, sources, preferences, now),
    sleepLastNight: sleepSummary(observations, sources, preferences, now),
    restingHeartRate: latestValue('resting-heart-rate', observations, sources, preferences, now),
    heartRate: latestValue('heart-rate', observations, sources, preferences, now),
    cardioFitness: latestValue('cardio-fitness', observations, sources, preferences, now),
    distanceToday: dailyAggregate('distance', observations, sources, preferences, now),
    activeEnergyToday: dailyAggregate('active-energy', observations, sources, preferences, now),
    waterToday: dailyAggregate('water', observations, sources, preferences, now),
    proteinToday: dailyAggregate('protein', observations, sources, preferences, now),
    fibreToday: dailyAggregate('fibre', observations, sources, preferences, now),
    fruitVegetablesToday: dailyAggregate('fruit-vegetable-servings', observations, sources, preferences, now),
    mealQualityToday: dailyAggregate('meal-quality', observations, sources, preferences, now, 'average'),
  };
}

export function connectedSleepReadiness(summary: ConnectedHealthSummary, enabled = true): ReadinessInput {
  if (!enabled || summary.sleepLastNight.status !== 'current' || summary.sleepLastNight.value === null) return {};
  const hours = summary.sleepLastNight.unit === 'minute' ? summary.sleepLastNight.value / 60 : summary.sleepLastNight.value;
  return { sleepHours: Number(hours.toFixed(2)), sleep: hours < 6 ? 'poor' : hours < 7 ? 'okay' : 'good' };
}
