import { chooseSourceForMetric, observationFreshness, sourceFreshness } from './freshness';
import { metricDefinitions } from './metrics';
import { ConnectedHealthPreferences, ConnectedMetric, HealthObservation, HealthSourceState } from './types';

export type MetricTrend = {
  metric: ConnectedMetric;
  label: string;
  sourceId?: string;
  sourceName?: string;
  unit: string;
  currentAverage: number | null;
  previousAverage: number | null;
  changePercent: number | null;
  direction: 'up' | 'down' | 'stable' | 'insufficient';
  status: 'current' | 'stale' | 'partial' | 'failed' | 'insufficient';
  days: number;
  sampleDays: number;
  note: string;
};

const additiveMetrics = new Set<ConnectedMetric>(['steps', 'sleep-duration', 'sleep-stage', 'distance', 'active-energy', 'workout-duration', 'water', 'protein', 'fibre', 'fruit-vegetable-servings']);

function dayKey(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function dailyValues(observations: HealthObservation[], metric: ConnectedMetric) {
  const groups = new Map<string, number[]>();
  observations.forEach(observation => {
    const key = dayKey(observation.endTime || observation.startTime);
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), observation.value]);
  });
  return [...groups.entries()].map(([date, values]) => ({
    date,
    value: additiveMetrics.has(metric) ? values.reduce((sum, value) => sum + value, 0) : average(values) || 0,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function trendStatus(source: HealthSourceState, latest: HealthObservation | undefined, now: Date) {
  const sourceState = sourceFreshness(source, now);
  if (sourceState === 'failed') return 'failed' as const;
  if (sourceState === 'partial') return 'partial' as const;
  if (sourceState === 'stale' || (latest && observationFreshness(latest, now) === 'stale')) return 'stale' as const;
  return latest ? 'current' as const : 'insufficient' as const;
}

export function metricTrend(
  observations: HealthObservation[],
  sources: HealthSourceState[],
  preferences: ConnectedHealthPreferences,
  metric: ConnectedMetric,
  options: { days?: number; now?: Date } = {},
): MetricTrend {
  const days = Math.max(2, Math.min(90, Math.floor(options.days || 7)));
  const now = options.now || new Date();
  const source = chooseSourceForMetric(observations, sources, metric, preferences.primarySourceByMetric[metric], now);
  const empty: MetricTrend = {
    metric,
    label: metricDefinitions[metric].label,
    unit: metricDefinitions[metric].unit,
    currentAverage: null,
    previousAverage: null,
    changePercent: null,
    direction: 'insufficient',
    status: 'insufficient',
    days,
    sampleDays: 0,
    note: 'No single source has enough comparable data for this trend.',
  };
  if (!source) return empty;

  const start = new Date(now.getTime() - days * 2 * 86_400_000);
  const selected = observations
    .filter(item => {
      if (item.metric !== metric || item.sourceId !== source.id) return false;
      const at = Date.parse(item.endTime || item.startTime);
      if (!Number.isFinite(at) || at < start.getTime() || at > now.getTime()) return false;
      const freshness = observationFreshness(item, now);
      return freshness !== 'future' && freshness !== 'invalid';
    })
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const daily = dailyValues(selected, metric);
  const currentStart = new Date(now.getTime() - days * 86_400_000);
  const current = daily.filter(item => Date.parse(`${item.date}T23:59:59`) >= currentStart.getTime()).map(item => item.value);
  const previous = daily.filter(item => {
    const time = Date.parse(`${item.date}T23:59:59`);
    return time < currentStart.getTime() && time >= start.getTime();
  }).map(item => item.value);
  const currentAverage = average(current);
  const previousAverage = average(previous);
  const changePercent = currentAverage !== null && previousAverage !== null && previousAverage !== 0 ? (currentAverage - previousAverage) / Math.abs(previousAverage) * 100 : null;
  const direction = changePercent === null ? 'insufficient' : Math.abs(changePercent) < 2 ? 'stable' : changePercent > 0 ? 'up' : 'down';
  const latest = selected.at(-1);
  return {
    ...empty,
    sourceId: source.id,
    sourceName: source.displayName,
    currentAverage,
    previousAverage,
    changePercent,
    direction,
    status: trendStatus(source, latest, now),
    sampleDays: current.length,
    note: changePercent === null
      ? `${source.displayName} has ${current.length} current-window day${current.length === 1 ? '' : 's'}, but a comparable prior window is not yet available.`
      : `${days}-day average compared with the preceding ${days} days from ${source.displayName}. Direction is descriptive and is not a diagnosis.`,
  };
}

export function connectedHealthTrends(observations: HealthObservation[], sources: HealthSourceState[], preferences: ConnectedHealthPreferences, now = new Date()) {
  return [
    metricTrend(observations, sources, preferences, 'steps', { now }),
    metricTrend(observations, sources, preferences, 'sleep-duration', { now }),
    metricTrend(observations, sources, preferences, 'resting-heart-rate', { now }),
    metricTrend(observations, sources, preferences, 'cardio-fitness', { days: 28, now }),
  ];
}
