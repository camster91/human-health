import { mergeObservationCollections, normalizeConnectedPreferences, normalizeSourceState } from '../merge';
import { ConnectedHealthPreferences, HealthObservation, HealthRepositoryExport, HealthSourceState, connectedMetrics, defaultConnectedHealthPreferences } from '../types';

export type ConnectedJsonEnvelope = {
  format: 'human-health-connected-export';
  schemaVersion: 1;
  exportedAt: string;
  data: HealthRepositoryExport;
};

const providers = new Set(['health-connect', 'apple-health', 'manual', 'human-health-import']);
const statuses = new Set(['not-connected', 'unavailable', 'permission-required', 'syncing', 'current', 'partial', 'stale', 'failed']);
const habitMetrics = new Set(defaultConnectedHealthPreferences.enabledHabits);

export function parseConnectedSourceState(value: unknown): HealthSourceState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Connected-health archive contains an invalid source state.');
  const source = value as Partial<HealthSourceState>;
  if (typeof source.id !== 'string' || !source.id.trim()) throw new Error('Connected-health archive source is missing an ID.');
  if (typeof source.displayName !== 'string' || !source.displayName.trim()) throw new Error(`Connected-health archive source ${source.id} is missing a display name.`);
  if (!providers.has(String(source.provider))) throw new Error(`Connected-health archive source ${source.id} has an unsupported provider.`);
  if (!statuses.has(String(source.status))) throw new Error(`Connected-health archive source ${source.id} has an unsupported status.`);
  if (!Array.isArray(source.supportedMetrics) || !Array.isArray(source.grantedMetrics)) throw new Error(`Connected-health archive source ${source.id} has invalid metric permissions.`);
  if (!source.supportedMetrics.every(metric => connectedMetrics.includes(metric)) || !source.grantedMetrics.every(metric => connectedMetrics.includes(metric) && source.supportedMetrics!.includes(metric))) throw new Error(`Connected-health archive source ${source.id} contains unsupported or inconsistent metrics.`);
  if (!Number.isFinite(source.staleAfterMs) || Number(source.staleAfterMs) <= 0) throw new Error(`Connected-health archive source ${source.id} has an invalid freshness window.`);
  for (const [label, candidate] of [['last attempt', source.lastAttemptAt], ['last success', source.lastSuccessAt]] as const) {
    if (candidate !== undefined && (!candidate || typeof candidate !== 'string' || !Number.isFinite(Date.parse(candidate)))) throw new Error(`Connected-health archive source ${source.id} has an invalid ${label} timestamp.`);
  }
  if (source.recordCount !== undefined && (!Number.isFinite(source.recordCount) || source.recordCount < 0)) throw new Error(`Connected-health archive source ${source.id} has an invalid record count.`);
  if (source.cursor !== undefined && (typeof source.cursor !== 'string' || !source.cursor)) throw new Error(`Connected-health archive source ${source.id} has an invalid cursor.`);
  if (source.error !== undefined && typeof source.error !== 'string') throw new Error(`Connected-health archive source ${source.id} has an invalid error field.`);
  if (source.partialReason !== undefined && typeof source.partialReason !== 'string') throw new Error(`Connected-health archive source ${source.id} has an invalid partial-reason field.`);
  return normalizeSourceState(source as HealthSourceState);
}

function boundedNumber(input: Record<string, unknown>, key: string, fallback: number, min: number, max: number) {
  if (!(key in input)) return fallback;
  const value = input[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Connected-health preferences contain an invalid ${key} value.`);
  return value;
}

export function parseConnectedPreferences(value: unknown): ConnectedHealthPreferences {
  if (value === undefined || value === null) return { ...defaultConnectedHealthPreferences, enabledHabits: [...defaultConnectedHealthPreferences.enabledHabits], primarySourceByMetric: {} };
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Connected-health preferences are invalid.');
  const input = value as Record<string, unknown>;

  if ('useFreshSleepForReadiness' in input && typeof input.useFreshSleepForReadiness !== 'boolean') throw new Error('Connected-health preferences contain an invalid useFreshSleepForReadiness value.');

  const enabledHabits = 'enabledHabits' in input ? input.enabledHabits : defaultConnectedHealthPreferences.enabledHabits;
  if (!Array.isArray(enabledHabits) || !enabledHabits.every(metric => typeof metric === 'string' && habitMetrics.has(metric as never))) throw new Error('Connected-health preferences contain invalid enabled habit metrics.');

  const primary = 'primarySourceByMetric' in input ? input.primarySourceByMetric : {};
  if (!primary || typeof primary !== 'object' || Array.isArray(primary)) throw new Error('Connected-health preferences contain an invalid primary-source map.');
  for (const [metric, source] of Object.entries(primary as Record<string, unknown>)) {
    if (!connectedMetrics.includes(metric as typeof connectedMetrics[number]) || typeof source !== 'string' || !source.trim()) throw new Error('Connected-health preferences contain an invalid primary-source mapping.');
  }

  return normalizeConnectedPreferences({
    useFreshSleepForReadiness: 'useFreshSleepForReadiness' in input ? input.useFreshSleepForReadiness as boolean : defaultConnectedHealthPreferences.useFreshSleepForReadiness,
    stepTarget: boundedNumber(input, 'stepTarget', defaultConnectedHealthPreferences.stepTarget, 0, 100_000),
    waterTargetMl: boundedNumber(input, 'waterTargetMl', defaultConnectedHealthPreferences.waterTargetMl, 0, 10_000),
    proteinTargetG: boundedNumber(input, 'proteinTargetG', defaultConnectedHealthPreferences.proteinTargetG, 0, 500),
    fibreTargetG: boundedNumber(input, 'fibreTargetG', defaultConnectedHealthPreferences.fibreTargetG, 0, 100),
    fruitVegetableTarget: boundedNumber(input, 'fruitVegetableTarget', defaultConnectedHealthPreferences.fruitVegetableTarget, 0, 30),
    enabledHabits: enabledHabits as ConnectedHealthPreferences['enabledHabits'],
    primarySourceByMetric: primary as ConnectedHealthPreferences['primarySourceByMetric'],
  });
}

export function createConnectedJsonEnvelope(data: HealthRepositoryExport): ConnectedJsonEnvelope {
  return { format: 'human-health-connected-export', schemaVersion: 1, exportedAt: new Date().toISOString(), data };
}

export function parseConnectedJson(text: string): HealthRepositoryExport {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Connected-health JSON is not valid JSON.'); }
  const candidate = value as Partial<ConnectedJsonEnvelope & HealthRepositoryExport>;
  const data = candidate.format === 'human-health-connected-export' ? candidate.data : candidate;
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.observations) || !Array.isArray(data.sources)) throw new Error('Unsupported connected-health JSON format.');
  const merged = mergeObservationCollections([], data.observations as HealthObservation[]);
  if (merged.rejected) throw new Error(`${merged.rejected} connected-health observations were invalid.`);
  const sources = data.sources.map(parseConnectedSourceState);
  return {
    schemaVersion: 1,
    exportedAt: typeof data.exportedAt === 'string' && Number.isFinite(Date.parse(data.exportedAt)) ? new Date(data.exportedAt).toISOString() : new Date().toISOString(),
    observations: merged.observations,
    sources,
    preferences: parseConnectedPreferences(data.preferences),
  };
}
