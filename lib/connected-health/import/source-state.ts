import { healthRepository } from '../repository';
import { ConnectedMetric, HealthObservation, HealthProvider, HealthSourceState } from '../types';

export type ImportedSourceSummary = {
  sourceId: string;
  provider: HealthProvider;
  displayName: string;
  importedAt: string;
  metrics: ConnectedMetric[];
  count: number;
};

export function sourceSummariesFromObservations(observations: HealthObservation[]): ImportedSourceSummary[] {
  const groups = new Map<string, ImportedSourceSummary>();
  for (const item of observations) {
    const current = groups.get(item.sourceId);
    const metrics = new Set([...(current?.metrics || []), item.metric]);
    groups.set(item.sourceId, {
      sourceId: item.sourceId,
      provider: item.provenance.provider,
      displayName: item.provenance.sourceName,
      importedAt: current && current.importedAt > item.provenance.importedAt ? current.importedAt : item.provenance.importedAt,
      metrics: [...metrics],
      count: (current?.count || 0) + 1,
    });
  }
  return [...groups.values()];
}

export function sourceStatesFromSummaries(summaries: ImportedSourceSummary[], previous: HealthSourceState[] = []) {
  const existing = new Map(previous.map(source => [source.id, source]));
  return summaries.map(summary => {
    const prior = existing.get(summary.sourceId);
    const metrics = [...new Set([...(prior?.supportedMetrics || []), ...summary.metrics])];
    return {
      id: summary.sourceId,
      provider: summary.provider,
      displayName: summary.displayName,
      status: 'current' as const,
      supportedMetrics: metrics,
      grantedMetrics: metrics,
      staleAfterMs: prior?.staleAfterMs || 365 * 24 * 3_600_000,
      lastAttemptAt: summary.importedAt,
      lastSuccessAt: summary.importedAt,
      recordCount: prior?.recordCount || 0,
    };
  });
}

export function sourceStatesFromObservations(observations: HealthObservation[], previous: HealthSourceState[] = []) {
  return sourceStatesFromSummaries(sourceSummariesFromObservations(observations), previous);
}

export async function saveImportedSourceSummaries(summaries: ImportedSourceSummary[]) {
  const previous = await healthRepository.listSources();
  const states = sourceStatesFromSummaries(summaries, previous);
  const saved: HealthSourceState[] = [];
  for (const state of states) {
    const actualCount = (await healthRepository.listObservations({ sourceId: state.id })).length;
    const next = { ...state, recordCount: actualCount };
    await healthRepository.saveSource(next);
    saved.push(next);
  }
  return saved;
}

export async function saveImportedSourceStates(observations: HealthObservation[]) {
  return saveImportedSourceSummaries(sourceSummariesFromObservations(observations));
}
