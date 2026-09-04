import {
  ConnectedHealthPreferences,
  HealthObservation,
  HealthProvider,
  HealthSourceState,
  HealthSourceStatus,
  connectedMetrics,
  defaultConnectedHealthPreferences,
} from './types';
import { convertToCanonical } from './metrics';

/** Deterministic 64-bit FNV-1a hash; compact, synchronous, and substantially safer than the previous 32-bit key. */
export function stableHash(input: string) {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index++) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36).padStart(13, '0');
}

export function observationId(sourceId: string, externalId: string) {
  return `${sourceId}:${stableHash(`${sourceId}\u0000${externalId}`)}`;
}

const providers: HealthProvider[] = ['health-connect', 'apple-health', 'manual', 'human-health-import'];
const statuses: HealthSourceStatus[] = ['not-connected', 'unavailable', 'permission-required', 'syncing', 'current', 'partial', 'stale', 'failed'];
const ingestionMethods = ['native-sync', 'file-import', 'manual', 'archive-import'] as const;
const qualities = ['direct', 'derived'] as const;

export function normalizeObservation(observation: HealthObservation): HealthObservation | null {
  if (!observation || typeof observation !== 'object' || !connectedMetrics.includes(observation.metric)) return null;
  const provenance = observation.provenance;
  if (!provenance || typeof provenance !== 'object') return null;
  if (!providers.includes(provenance.provider) || !ingestionMethods.includes(provenance.ingestionMethod) || !qualities.includes(observation.quality)) return null;
  const normalized = convertToCanonical(observation.metric, Number(observation.value), observation.unit || provenance.originalUnit);
  const start = Date.parse(observation.startTime);
  const end = observation.endTime ? Date.parse(observation.endTime) : start;
  const recorded = Date.parse(observation.recordedAt);
  const imported = Date.parse(provenance.importedAt);
  if (!normalized || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(recorded) || !Number.isFinite(imported) || end < start) return null;
  if (typeof observation.sourceId !== 'string' || !observation.sourceId.trim() || typeof provenance.externalId !== 'string' || !provenance.externalId.trim() || typeof provenance.sourceName !== 'string' || !provenance.sourceName.trim() || typeof provenance.originalType !== 'string' || !provenance.originalType.trim()) return null;
  const tags = observation.tags && typeof observation.tags === 'object'
    ? Object.fromEntries(Object.entries(observation.tags).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))) as Record<string, string | number | boolean>
    : undefined;
  return {
    ...observation,
    // Never trust an imported ID. Ownership is always derived from sourceId + provider externalId.
    id: observationId(observation.sourceId, provenance.externalId),
    value: normalized.value,
    unit: normalized.unit,
    startTime: new Date(start).toISOString(),
    endTime: observation.endTime ? new Date(end).toISOString() : undefined,
    recordedAt: new Date(recorded).toISOString(),
    provenance: { ...provenance, importedAt: new Date(imported).toISOString() },
    tags: tags && Object.keys(tags).length ? tags : undefined,
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
  const deleted = new Set(deletedExternalIds.filter(value => typeof value === 'string' && value.length > 0));
  let deletedCount = 0;
  if (deleted.size) {
    for (const [id, item] of map) {
      if ((!sourceId || item.sourceId === sourceId) && (deleted.has(item.provenance.externalId) || [...deleted].some(externalId => item.provenance.externalId.startsWith(`${externalId}:`)))) {
        map.delete(id);
        deletedCount++;
      }
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
  return { observations, accepted, rejected, deleted: deletedCount };
}

export function normalizeSourceState(value: HealthSourceState): HealthSourceState {
  const supportedMetrics = Array.isArray(value?.supportedMetrics) ? [...new Set(value.supportedMetrics.filter(metric => connectedMetrics.includes(metric)))] : [];
  const grantedMetrics = Array.isArray(value?.grantedMetrics) ? [...new Set(value.grantedMetrics.filter(metric => supportedMetrics.includes(metric)))] : [];
  const provider = providers.includes(value?.provider) ? value.provider : 'human-health-import';
  const status = statuses.includes(value?.status) ? value.status : 'failed';
  const sourceId = typeof value?.id === 'string' && value.id.trim() ? value.id : `invalid:${stableHash(JSON.stringify(value || {}))}`;
  const validDate = (candidate?: string) => candidate && Number.isFinite(Date.parse(candidate)) ? new Date(candidate).toISOString() : undefined;
  return {
    ...value,
    id: sourceId,
    provider,
    displayName: typeof value?.displayName === 'string' && value.displayName.trim() ? value.displayName : 'Unknown source',
    status,
    supportedMetrics,
    grantedMetrics,
    staleAfterMs: Number.isFinite(value?.staleAfterMs) && value.staleAfterMs > 0 ? value.staleAfterMs : 48 * 3_600_000,
    lastAttemptAt: validDate(value?.lastAttemptAt),
    lastSuccessAt: validDate(value?.lastSuccessAt),
    cursor: typeof value?.cursor === 'string' && value.cursor ? value.cursor : undefined,
    error: typeof value?.error === 'string' && value.error ? value.error : status === 'failed' ? 'Source state was invalid or failed.' : undefined,
    partialReason: typeof value?.partialReason === 'string' && value.partialReason ? value.partialReason : undefined,
    recordCount: Number.isFinite(value?.recordCount) && Number(value.recordCount) >= 0 ? Math.floor(Number(value.recordCount)) : undefined,
  };
}

export function normalizeConnectedPreferences(value?: Partial<ConnectedHealthPreferences> | null): ConnectedHealthPreferences {
  const input = value || {};
  const number = (candidate: unknown, fallback: number, min: number, max: number) => Number.isFinite(Number(candidate)) ? Math.max(min, Math.min(max, Number(candidate))) : fallback;
  const enabled = Array.isArray(input.enabledHabits) ? [...new Set(input.enabledHabits.filter(metric => defaultConnectedHealthPreferences.enabledHabits.includes(metric)))] : defaultConnectedHealthPreferences.enabledHabits;
  const primary = input.primarySourceByMetric && typeof input.primarySourceByMetric === 'object'
    ? Object.fromEntries(Object.entries(input.primarySourceByMetric).filter(([metric, source]) => connectedMetrics.includes(metric as typeof connectedMetrics[number]) && typeof source === 'string' && source.length > 0))
    : {};
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
