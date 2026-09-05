import {
  ConnectedHealthPreferences,
  ConnectedMetric,
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
const MAX_TIMEZONE_OFFSET_MINUTES = 14 * 60;
const MAX_TAGS = 200;
const MAX_TAG_KEY_LENGTH = 200;
const MAX_TAG_STRING_LENGTH = 4_000;

function optionalString(value: unknown) {
  return value === undefined ? undefined : typeof value === 'string' ? value : null;
}

function validTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTags(value: unknown): Record<string, string | number | boolean> | undefined | null {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_TAGS) return null;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, tag] of entries) {
    if (!key.trim() || key.length > MAX_TAG_KEY_LENGTH) return null;
    if (typeof tag === 'number') {
      if (!Number.isFinite(tag)) return null;
      result[key] = tag;
      continue;
    }
    if (typeof tag === 'string') {
      if (tag.length > MAX_TAG_STRING_LENGTH) return null;
      result[key] = tag;
      continue;
    }
    if (typeof tag === 'boolean') {
      result[key] = tag;
      continue;
    }
    return null;
  }
  return Object.keys(result).length ? result : undefined;
}

/**
 * Convert an untrusted stored/imported observation into the exact canonical
 * HealthObservation schema. Malformed input returns null and undeclared fields
 * are intentionally not copied into trusted storage/export/integration data.
 */
export function normalizeObservation(value: unknown): HealthObservation | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const observation = value as Partial<HealthObservation> & Record<string, unknown>;
    if (!connectedMetrics.includes(observation.metric as ConnectedMetric)) return null;
    if (!observation.provenance || typeof observation.provenance !== 'object' || Array.isArray(observation.provenance)) return null;
    const provenance = observation.provenance as Partial<HealthObservation['provenance']> & Record<string, unknown>;

    if (!providers.includes(provenance.provider as HealthProvider)
      || !ingestionMethods.includes(provenance.ingestionMethod as typeof ingestionMethods[number])
      || !qualities.includes(observation.quality as typeof qualities[number])) return null;

    if (typeof observation.value !== 'number' || !Number.isFinite(observation.value)) return null;
    if (observation.unit !== undefined && typeof observation.unit !== 'string') return null;
    if (provenance.originalUnit !== undefined && typeof provenance.originalUnit !== 'string') return null;

    const start = validTimestamp(observation.startTime);
    const end = observation.endTime === undefined ? start : validTimestamp(observation.endTime);
    const recorded = validTimestamp(observation.recordedAt);
    const imported = validTimestamp(provenance.importedAt);
    if (start === null || end === null || recorded === null || imported === null || end < start) return null;

    if (typeof observation.sourceId !== 'string' || !observation.sourceId.trim()
      || typeof provenance.externalId !== 'string' || !provenance.externalId.trim()
      || typeof provenance.sourceName !== 'string' || !provenance.sourceName.trim()
      || typeof provenance.originalType !== 'string' || !provenance.originalType.trim()) return null;

    const applicationId = optionalString(provenance.applicationId);
    const device = optionalString(provenance.device);
    if (applicationId === null || device === null) return null;

    if (provenance.externalVersion !== undefined
      && (typeof provenance.externalVersion !== 'number'
        || !Number.isSafeInteger(provenance.externalVersion)
        || provenance.externalVersion < 0)) return null;

    if (observation.timezoneOffsetMinutes !== undefined
      && (typeof observation.timezoneOffsetMinutes !== 'number'
        || !Number.isInteger(observation.timezoneOffsetMinutes)
        || Math.abs(observation.timezoneOffsetMinutes) > MAX_TIMEZONE_OFFSET_MINUTES)) return null;

    const tags = normalizeTags(observation.tags);
    if (tags === null) return null;

    const normalized = convertToCanonical(
      observation.metric as ConnectedMetric,
      observation.value,
      observation.unit || provenance.originalUnit,
    );
    if (!normalized) return null;

    const canonicalProvenance: HealthObservation['provenance'] = {
      provider: provenance.provider as HealthProvider,
      ingestionMethod: provenance.ingestionMethod as HealthObservation['provenance']['ingestionMethod'],
      sourceName: provenance.sourceName,
      originalType: provenance.originalType,
      externalId: provenance.externalId,
      importedAt: new Date(imported).toISOString(),
    };
    if (applicationId !== undefined) canonicalProvenance.applicationId = applicationId;
    if (device !== undefined) canonicalProvenance.device = device;
    if (provenance.originalUnit !== undefined) canonicalProvenance.originalUnit = provenance.originalUnit;
    if (provenance.externalVersion !== undefined) canonicalProvenance.externalVersion = provenance.externalVersion;

    const canonical: HealthObservation = {
      // Never trust an imported ID. Ownership is derived from sourceId + provider externalId.
      id: observationId(observation.sourceId, provenance.externalId),
      sourceId: observation.sourceId,
      metric: observation.metric as ConnectedMetric,
      value: normalized.value,
      unit: normalized.unit,
      startTime: new Date(start).toISOString(),
      recordedAt: new Date(recorded).toISOString(),
      quality: observation.quality as HealthObservation['quality'],
      provenance: canonicalProvenance,
    };
    if (observation.endTime !== undefined) canonical.endTime = new Date(end).toISOString();
    if (observation.timezoneOffsetMinutes !== undefined) canonical.timezoneOffsetMinutes = observation.timezoneOffsetMinutes;
    if (tags) canonical.tags = tags;
    return canonical;
  } catch {
    // This is an untrusted storage/import boundary. Malformed records must fail closed,
    // never escape as an exception that bypasses repository integrity accounting.
    return null;
  }
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
