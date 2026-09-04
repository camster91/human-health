import { CanonicalUnit, ConnectedMetric } from './types';

export type MetricDefinition = {
  metric: ConnectedMetric;
  label: string;
  unit: CanonicalUnit;
  category: 'movement' | 'sleep' | 'cardio' | 'nutrition';
  defaultFreshMs: number;
  allowZero: boolean;
};

const hour = 3_600_000;
const day = 24 * hour;

export const metricDefinitions: Record<ConnectedMetric, MetricDefinition> = {
  steps: { metric: 'steps', label: 'Steps', unit: 'count', category: 'movement', defaultFreshMs: 36 * hour, allowZero: true },
  'sleep-duration': { metric: 'sleep-duration', label: 'Sleep', unit: 'minute', category: 'sleep', defaultFreshMs: 48 * hour, allowZero: false },
  'sleep-stage': { metric: 'sleep-stage', label: 'Sleep stage', unit: 'minute', category: 'sleep', defaultFreshMs: 48 * hour, allowZero: false },
  'heart-rate': { metric: 'heart-rate', label: 'Heart rate', unit: 'bpm', category: 'cardio', defaultFreshMs: 24 * hour, allowZero: false },
  'resting-heart-rate': { metric: 'resting-heart-rate', label: 'Resting heart rate', unit: 'bpm', category: 'cardio', defaultFreshMs: 72 * hour, allowZero: false },
  'cardio-fitness': { metric: 'cardio-fitness', label: 'Cardio fitness', unit: 'ml/kg/min', category: 'cardio', defaultFreshMs: 45 * day, allowZero: false },
  distance: { metric: 'distance', label: 'Distance', unit: 'km', category: 'movement', defaultFreshMs: 7 * day, allowZero: true },
  'active-energy': { metric: 'active-energy', label: 'Active energy', unit: 'kcal', category: 'movement', defaultFreshMs: 36 * hour, allowZero: true },
  'workout-duration': { metric: 'workout-duration', label: 'Workout duration', unit: 'minute', category: 'cardio', defaultFreshMs: 14 * day, allowZero: false },
  water: { metric: 'water', label: 'Water', unit: 'ml', category: 'nutrition', defaultFreshMs: 36 * hour, allowZero: true },
  protein: { metric: 'protein', label: 'Protein', unit: 'g', category: 'nutrition', defaultFreshMs: 36 * hour, allowZero: true },
  fibre: { metric: 'fibre', label: 'Fibre', unit: 'g', category: 'nutrition', defaultFreshMs: 36 * hour, allowZero: true },
  'fruit-vegetable-servings': { metric: 'fruit-vegetable-servings', label: 'Fruit and vegetables', unit: 'serving', category: 'nutrition', defaultFreshMs: 36 * hour, allowZero: true },
  'meal-quality': { metric: 'meal-quality', label: 'Meal quality', unit: 'score', category: 'nutrition', defaultFreshMs: 36 * hour, allowZero: false },
};

function token(unit?: string) {
  return (unit || '').toLowerCase().replace(/[\s_]/g, '').replaceAll('·', '/');
}

function isOneOf(value: string, allowed: string[]) {
  return allowed.includes(value);
}

/**
 * Normalize only units that are explicitly understood. A missing unit is accepted as
 * already canonical because native bridge contracts can provide canonical values, but
 * an unknown non-empty unit is rejected rather than silently reinterpreted.
 */
export function convertToCanonical(metric: ConnectedMetric, value: number, originalUnit?: string): { value: number; unit: CanonicalUnit } | null {
  if (!Number.isFinite(value)) return null;
  const definition = metricDefinitions[metric];
  const source = token(originalUnit);
  let normalized = value;
  let understood = source === '';

  if (definition.unit === 'minute') {
    if (isOneOf(source, ['min', 'mins', 'minute', 'minutes'])) understood = true;
    else if (isOneOf(source, ['s', 'sec', 'secs', 'second', 'seconds'])) { normalized = value / 60; understood = true; }
    else if (isOneOf(source, ['h', 'hr', 'hrs', 'hour', 'hours'])) { normalized = value * 60; understood = true; }
  } else if (definition.unit === 'km') {
    if (isOneOf(source, ['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres'])) understood = true;
    else if (isOneOf(source, ['m', 'meter', 'meters', 'metre', 'metres'])) { normalized = value / 1_000; understood = true; }
    else if (isOneOf(source, ['mi', 'mile', 'miles'])) { normalized = value * 1.609344; understood = true; }
  } else if (definition.unit === 'kcal') {
    if (isOneOf(source, ['kcal', 'kilocalorie', 'kilocalories'])) understood = true;
    else if (isOneOf(source, ['kj', 'kilojoule', 'kilojoules'])) { normalized = value / 4.184; understood = true; }
  } else if (definition.unit === 'ml') {
    if (isOneOf(source, ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'])) understood = true;
    else if (isOneOf(source, ['l', 'liter', 'liters', 'litre', 'litres'])) { normalized = value * 1_000; understood = true; }
    else if (isOneOf(source, ['flozus', 'floz', 'fluidounce', 'fluidounces'])) { normalized = value * 29.5735295625; understood = true; }
  } else if (definition.unit === 'g') {
    if (isOneOf(source, ['g', 'gram', 'grams'])) understood = true;
    else if (isOneOf(source, ['kg', 'kilogram', 'kilograms'])) { normalized = value * 1_000; understood = true; }
    else if (isOneOf(source, ['mg', 'milligram', 'milligrams'])) { normalized = value / 1_000; understood = true; }
  } else if (definition.unit === 'count') {
    understood ||= isOneOf(source, ['count', 'counts', 'step', 'steps']);
  } else if (definition.unit === 'bpm') {
    understood ||= isOneOf(source, ['bpm', 'count/min', 'counts/min', 'beat/min', 'beats/min', '1/min']);
  } else if (definition.unit === 'ml/kg/min') {
    understood ||= isOneOf(source, ['ml/kg/min', 'ml/min/kg', 'ml/(kg*min)', 'ml/kg/minute']);
  } else if (definition.unit === 'serving') {
    understood ||= isOneOf(source, ['serving', 'servings']);
  } else if (definition.unit === 'score') {
    understood ||= source === 'score';
  }

  if (!understood || !Number.isFinite(normalized) || normalized < 0 || (!definition.allowZero && normalized === 0)) return null;
  return { value: normalized, unit: definition.unit };
}

export function metricLabel(metric: ConnectedMetric) {
  return metricDefinitions[metric].label;
}
