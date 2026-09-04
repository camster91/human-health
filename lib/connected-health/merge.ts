import { ConnectedHealthPreferences, HealthObservation, HealthSourceState, defaultConnectedHealthPreferences } from './types';
import { convertToCanonical } from './metrics';

export function stableHash(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function observationId(sourceId: string, externalId: string) {
  return `${sourceId}:${stableHash(externalId)}`;
}

export function normalizeObservation(observation: HealthObservation): HealthObservation | null {
  const normalized = convertToCanonical(observation.metric, observation.value, observation.unit || observation.provenance.originalUnit);
  const start = Date.parse(observation.startTime);
  const end = observation.endTime ? Date.parse(observation.endTime) : start;
  const recorded = Date.parse(observation.recordedAt);
  if (!normalized || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(recorded) || end < start) return null;
  if (!observation.sourceId || !observation.provenance.externalId || !observation.provenance.sourceName) return null;
  return {
    ...observation,
    id: observation.id || observationId(observation.sourceId, observation.provenance.externalId),
    value: normalized.value,
    unit: normalized.unit,
    startTime: new Date(start).toISOString(),
    endTime: observation.endTime ? new Date(end).toISOString() : undefined,
    recordedAt: new Date(recorded).toISOString(),
    provenance: { ...observation.provenance, importedAt: new Date(observation.provenance.importedAt).toISOString() },
  };
}

function newer(current: HealthObservation, candidate: HealthObservation) {
  const currentVersion = current.provenance.externalVersion;
  const candidateVersion = candidate.provenance.externalVersion;
  if (typeof currentVersion === 'number' || typeof candidateVersion === 'number') return (candidateVersion ?? 0) >= (currentVersion ?? 0);
  return Date.parse(candidate.provenance.importedAt) >= Date.parse(current.provenance.importedAt);
}

export function mergeObservationCollections(existing: HealthObservation[], incoming: HealthObservation[], deletedExternalIds: string[] = [], sourceId?: string) {
  const map = new Map<string, HealthObservation>();
  for (const item of existing) {
    const normalized = normalizeObservation(item);
    if (normalized) map.set(normalized.id, normalized);
  }
  const deleted = new Set(deletedExternalIds);
  if (deleted.size) {
    for (const [id, item] of map) {
      if ((!sourceId || item.sourceId === sourceId) && deleted.has(item.provenance.externalId)) map.delete(id);
    }
  }
  let accepted = 0;
  let rejected = 0;
  for (const item of incoming) {
    const normalized = normalizeObservation(item);
    if (!normalized) { rejected++; continue; }
    const current = map.get(normalized.id);
    if (!current || newer(current, normalized)) {
      map.set(normalized.id, normalized);
      accepted++;
    }
  }
  const observations = [...map.values()].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || a.id.localeCompare(b.id));
  return { observations, accepted, rejected, deleted: existing.length + accepted - observations.length };
}

export function normalizeSourceState(value: HealthSourceState): HealthSourceState {
  return {
    ...value,
    supportedMetrics: [...new Set(value.supportedMetrics)],
    grantedMetrics: [...new Set(value.grantedMetrics.filter(metric => value.supportedMetrics.includes(metric)))],
    staleAfterMs: Number.isFinite(value.staleAfterMs) && value.staleAfterMs > 0 ? value.staleAfterMs : 48 * 3_600_000,
  };
}

export function normalizeConnectedPreferences(value?: Partial<ConnectedHealthPreferences> | null): ConnectedHealthPreferences {
  const input = value || {};
  const number = (candidate: unknown, fallback: number, min: number, max: number) => Number.isFinite(Number(candidate)) ? Math.max(min, Math.min(max, Number(candidate))) : fallback;
  const enabled = Array.isArray(input.enabledHabits) ? [...new Set(input.enabledHabits.filter(metric => defaultConnectedHealthPreferences.enabledHabits.includes(metric)))] : defaultConnectedHealthPreferences.enabledHabits;
  const primary = input.primarySourceByMetric && typeof input.primarySourceByMetric === 'object' ? Object.fromEntries(Object.entries(input.primarySourceByMetric).filter(([, source]) => typeof source === 'string' && source.length > 0)) : {};
  return {
    useFreshSleepForReadiness: typeof input.useFreshSleepForReadiness === 'boolean' ? input.useFreshSleepForReadiness : true,
    stepTarget: number(input.stepTarget, 8_000, 0, 100_000),
    waterTargetMl: number(input.waterTargetMl, 2_000, 0, 10_000),
    proteinTargetG: number(input.proteinTargetG, 100, 0, 500),
    fibreTargetG: number(input.fibreTargetG, 25, 0, 100),
    fruitVegetableTarget: number(input.fruitVegetableTarget, 5, 0, 30),
    enabledHabits: enabled,
    primarySourceByMetric: primary,
  };
}
