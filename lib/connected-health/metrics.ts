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
  return (unit || '').toLowerCase().replace(/[\s_]/g, '').replace('·', '/');
}

export function convertToCanonical(metric: ConnectedMetric, value: number, originalUnit?: string): { value: number; unit: CanonicalUnit } | null {
  if (!Number.isFinite(value)) return null;
  const definition = metricDefinitions[metric];
  const source = token(originalUnit);
  let normalized = value;

  if (definition.unit === 'minute') {
    if (['s', 'sec', 'second', 'seconds'].includes(source)) normalized = value / 60;
    else if (['h', 'hr', 'hour', 'hours'].includes(source)) normalized = value * 60;
  } else if (definition.unit === 'km') {
    if (['m', 'meter', 'meters', 'metre', 'metres'].includes(source)) normalized = value / 1_000;
    else if (['mi', 'mile', 'miles'].includes(source)) normalized = value * 1.609344;
  } else if (definition.unit === 'kcal') {
    if (['kj', 'kilojoule', 'kilojoules'].includes(source)) normalized = value / 4.184;
  } else if (definition.unit === 'ml') {
    if (['l', 'liter', 'liters', 'litre', 'litres'].includes(source)) normalized = value * 1_000;
    else if (['flozus', 'floz', 'fluidounce', 'fluidounces'].includes(source)) normalized = value * 29.5735295625;
  } else if (definition.unit === 'g') {
    if (['kg', 'kilogram', 'kilograms'].includes(source)) normalized = value * 1_000;
    else if (['mg', 'milligram', 'milligrams'].includes(source)) normalized = value / 1_000;
  }

  if (!Number.isFinite(normalized) || normalized < 0 || (!definition.allowZero && normalized === 0)) return null;
  return { value: normalized, unit: definition.unit };
}

export function metricLabel(metric: ConnectedMetric) {
  return metricDefinitions[metric].label;
}
