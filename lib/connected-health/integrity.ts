import type { HealthObservation, HealthSourceState } from './types';

export type ConnectedHealthRelationshipError = {
  observationId?: string;
  sourceId: string;
  message: string;
};

/**
 * Cross-check observations against their source metadata. Individual rows can be
 * structurally valid while the combined connected-health dataset is not: orphaned
 * observations, provider mismatches, or unsupported metrics must not be treated as
 * trusted coaching/export/integration evidence.
 */
export function connectedHealthRelationshipErrors(
  observations: readonly HealthObservation[],
  sources: readonly HealthSourceState[],
): ConnectedHealthRelationshipError[] {
  const errors: ConnectedHealthRelationshipError[] = [];
  const sourceMap = new Map<string, HealthSourceState>();

  for (const source of sources) {
    if (sourceMap.has(source.id)) {
      errors.push({ sourceId: source.id, message: `Connected-health source ${source.id} appears more than once.` });
      continue;
    }
    sourceMap.set(source.id, source);
  }

  for (const observation of observations) {
    const source = sourceMap.get(observation.sourceId);
    if (!source) {
      errors.push({
        observationId: observation.id,
        sourceId: observation.sourceId,
        message: `Connected-health observation ${observation.id} references missing source ${observation.sourceId}.`,
      });
      continue;
    }
    if (observation.provenance.provider !== source.provider) {
      errors.push({
        observationId: observation.id,
        sourceId: observation.sourceId,
        message: `Connected-health observation ${observation.id} provider ${observation.provenance.provider} does not match source ${source.id} provider ${source.provider}.`,
      });
    }
    if (!source.supportedMetrics.includes(observation.metric)) {
      errors.push({
        observationId: observation.id,
        sourceId: observation.sourceId,
        message: `Connected-health observation ${observation.id} metric ${observation.metric} is not supported by source ${source.id}.`,
      });
    }
  }

  return errors;
}

export function assertConnectedHealthRelationships(
  observations: readonly HealthObservation[],
  sources: readonly HealthSourceState[],
) {
  const errors = connectedHealthRelationshipErrors(observations, sources);
  if (errors.length) throw new Error(`Connected-health observation/source relationship integrity failed: ${errors.map(error => error.message).join(' | ')}`);
}
