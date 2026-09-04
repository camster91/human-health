import { healthRepository } from '../repository';
import { HealthObservation, HealthSourceState } from '../types';

export function sourceStatesFromObservations(observations: HealthObservation[], previous: HealthSourceState[] = []) {
  const existing = new Map(previous.map(source => [source.id, source]));
  const groups = new Map<string, HealthObservation[]>();
  observations.forEach(item => groups.set(item.sourceId, [...(groups.get(item.sourceId) || []), item]));
  return [...groups.entries()].map(([sourceId, values]) => {
    const prior = existing.get(sourceId);
    const latestImport = values.map(item => item.provenance.importedAt).sort().at(-1) || new Date().toISOString();
    return {
      id: sourceId,
      provider: values[0].provenance.provider,
      displayName: values[0].provenance.sourceName,
      status: 'current' as const,
      supportedMetrics: [...new Set(values.map(item => item.metric))],
      grantedMetrics: [...new Set(values.map(item => item.metric))],
      staleAfterMs: prior?.staleAfterMs || 365 * 24 * 3_600_000,
      lastAttemptAt: latestImport,
      lastSuccessAt: latestImport,
      recordCount: (prior?.recordCount || 0) + values.length,
    };
  });
}

export async function saveImportedSourceStates(observations: HealthObservation[]) {
  const previous = await healthRepository.listSources();
  const states = sourceStatesFromObservations(observations, previous);
  await Promise.all(states.map(state => healthRepository.saveSource(state)));
  return states;
}
