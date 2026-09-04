import { mergeObservationCollections, normalizeConnectedPreferences, normalizeSourceState } from '../merge';
import { HealthObservation, HealthRepositoryExport } from '../types';

export type ConnectedJsonEnvelope = {
  format: 'human-health-connected-export';
  schemaVersion: 1;
  exportedAt: string;
  data: HealthRepositoryExport;
};

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
  return {
    schemaVersion: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    observations: merged.observations,
    sources: data.sources.map(normalizeSourceState),
    preferences: normalizeConnectedPreferences(data.preferences),
  };
}
