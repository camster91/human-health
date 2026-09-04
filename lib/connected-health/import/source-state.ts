import { healthRepository } from '../repository';
import { HealthObservation, HealthSourceState } from '../types';

export function sourceStatesFromObservations(observations: HealthObservation[], previous: HealthSourceState[] = []) {
  const existing = new Map(previous.map(source => [source.id, source]));
  const groups = new Map<string, HealthObservation[]>();
  observations.forEach(item => groups.set(item.sourceId, [...(groups.get(item.sourceId) || []), item]));
  return [...groups.entries()].map(([sourceId, values]) => {
    const prior = existing.get(sourceId);
    const latestImport = values.map(item => item.provenance.importedAt).sort().at(-1) || new Date().toISOString();
    const metrics = [...new Set([...(prior?.supportedMetrics || []), ...values.map(item => item.metric)])];
    return {
      id: sourceId,
      provider: values[0].provenance.provider,
      displayName: values[0].provenance.sourceName,
      status: 'current' as const,
      supportedMetrics: metrics,
      grantedMetrics: metrics,
      staleAfterMs: prior?.staleAfterMs || 365 * 24 * 3_600_000,
      lastAttemptAt: latestImport,
      lastSuccessAt: latestImport,
      recordCount: prior?.recordCount || 0,
    };
  });
}

export async function saveImportedSourceStates(observations: HealthObservation[]) {
  const previous = await healthRepository.listSources();
  const states = sourceStatesFromObservations(observations, previous);
  const saved: HealthSourceState[] = [];
  for (const state of states) {
    const actualCount = (await healthRepository.listObservations({ sourceId: state.id })).length;
    const next = { ...state, recordCount: actualCount };
    await healthRepository.saveSource(next);
    saved.push(next);
  }
  return saved;
}
