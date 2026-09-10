import { mergeObservationCollections, normalizeConnectedPreferences, normalizeSourceState } from '../merge';
import { HealthObservation, HealthRepositoryExport, HealthSourceState, connectedMetrics } from '../types';

export type ConnectedJsonEnvelope = {
  format: 'human-health-connected-export';
  schemaVersion: 1;
  exportedAt: string;
  data: HealthRepositoryExport;
};

const providers = new Set(['health-connect', 'apple-health', 'manual', 'human-health-import']);
const statuses = new Set(['not-connected', 'unavailable', 'permission-required', 'syncing', 'current', 'partial', 'stale', 'failed']);

function parseSourceState(value: unknown): HealthSourceState {
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
    if (candidate !== undefined && (!candidate || !Number.isFinite(Date.parse(candidate)))) throw new Error(`Connected-health archive source ${source.id} has an invalid ${label} timestamp.`);
  }
  if (source.recordCount !== undefined && (!Number.isFinite(source.recordCount) || source.recordCount < 0)) throw new Error(`Connected-health archive source ${source.id} has an invalid record count.`);
  return normalizeSourceState(source as HealthSourceState);
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
  
  const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : undefined;
  if (!exportedAt || !Number.isFinite(Date.parse(exportedAt))) {
    throw new Error('Connected-health archive exportedAt is missing or invalid. This archive cannot be trusted for import.');
  }
  
  const merged = mergeObservationCollections([], data.observations as HealthObservation[]);
  if (merged.rejected) throw new Error(`${merged.rejected} connected-health observations were invalid.`);
  const sources = data.sources.map(parseSourceState);
  return {
    schemaVersion: 1,
    exportedAt: new Date(exportedAt).toISOString(),
    observations: merged.observations,
    sources,
    preferences: normalizeConnectedPreferences(data.preferences),
  };
}
