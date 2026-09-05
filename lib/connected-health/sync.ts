import { healthRepository } from './repository';
import { ConnectedMetric, HealthDataAdapter, HealthObservation, HealthSourceState, HealthSyncBatch } from './types';

const defaultWindowMs = 90 * 24 * 3_600_000;

export interface HealthSyncRepository {
  getSource(id: string): Promise<HealthSourceState | null>;
  saveSource(source: HealthSourceState): Promise<void>;
  upsertBatch(sourceId: string, batch: HealthSyncBatch): Promise<{ accepted: number; rejected: number; deleted: number }>;
  listObservations(query?: { metrics?: ConnectedMetric[]; sourceId?: string; startTime?: string; endTime?: string }): Promise<HealthObservation[]>;
  deleteSource(sourceId: string): Promise<void>;
}

function baseState(adapter: HealthDataAdapter, previous?: HealthSourceState | null): HealthSourceState {
  return {
    id: adapter.sourceId,
    provider: adapter.provider,
    displayName: adapter.displayName,
    status: previous?.status || 'not-connected',
    supportedMetrics: adapter.supportedMetrics,
    grantedMetrics: previous?.grantedMetrics || [],
    staleAfterMs: previous?.staleAfterMs || 48 * 3_600_000,
    lastAttemptAt: previous?.lastAttemptAt,
    lastSuccessAt: previous?.lastSuccessAt,
    cursor: previous?.cursor,
    error: previous?.error,
    partialReason: previous?.partialReason,
    recordCount: previous?.recordCount,
  };
}

export async function refreshAdapterState(adapter: HealthDataAdapter, repository: HealthSyncRepository = healthRepository) {
  const previous = await repository.getSource(adapter.sourceId);
  const availability = await adapter.availability();
  const status = !availability.available ? 'unavailable' : availability.permissionRequired ? 'permission-required' : previous?.lastSuccessAt ? 'current' : 'not-connected';
  const next: HealthSourceState = { ...baseState(adapter, previous), status, grantedMetrics: availability.grantedMetrics, error: availability.available ? undefined : availability.reason };
  await repository.saveSource(next);
  return next;
}

export async function connectAdapter(adapter: HealthDataAdapter, metrics: ConnectedMetric[] = adapter.supportedMetrics, repository: HealthSyncRepository = healthRepository) {
  const previous = await repository.getSource(adapter.sourceId);
  const availability = await adapter.availability();
  if (!availability.available) {
    const state = { ...baseState(adapter, previous), status: 'unavailable' as const, error: availability.reason };
    await repository.saveSource(state);
    return state;
  }
  const requested = metrics.filter(metric => adapter.supportedMetrics.includes(metric));
  const permission = await adapter.requestPermissions(requested);
  const state = { ...baseState(adapter, previous), status: permission.grantedMetrics.length ? 'not-connected' as const : 'permission-required' as const, grantedMetrics: permission.grantedMetrics, error: permission.reason };
  await repository.saveSource(state);
  return permission.grantedMetrics.length ? syncAdapter(adapter, permission.grantedMetrics, {}, repository) : state;
}

export async function syncAdapter(
  adapter: HealthDataAdapter,
  metrics?: ConnectedMetric[],
  options: { startTime?: string; endTime?: string; maxBatches?: number } = {},
  repository: HealthSyncRepository = healthRepository,
) {
  const previous = await repository.getSource(adapter.sourceId);
  const availability = await adapter.availability();
  if (!availability.available) {
    const state = { ...baseState(adapter, previous), status: 'unavailable' as const, error: availability.reason };
    await repository.saveSource(state);
    return state;
  }
  const granted = (metrics || availability.grantedMetrics || previous?.grantedMetrics || []).filter(metric => adapter.supportedMetrics.includes(metric));
  if (!granted.length) {
    const state = { ...baseState(adapter, previous), status: 'permission-required' as const, grantedMetrics: [], error: 'No connected-health permissions are available.' };
    await repository.saveSource(state);
    return state;
  }

  const attemptAt = new Date().toISOString();
  await repository.saveSource({ ...baseState(adapter, previous), status: 'syncing', grantedMetrics: granted, lastAttemptAt: attemptAt, error: undefined, partialReason: undefined });
  let cursor = previous?.cursor;
  let batches = 0;
  let complete = false;
  let rejectedObservations = 0;
  const warnings: string[] = [];
  const maxBatches = Math.max(1, Math.min(1_000, options.maxBatches || 100));
  try {
    while (!complete && batches < maxBatches) {
      const priorCursor = cursor;
      const batch = await adapter.read({
        metrics: granted,
        startTime: options.startTime || new Date(Date.now() - defaultWindowMs).toISOString(),
        endTime: options.endTime || new Date().toISOString(),
        cursor,
      });
      const result = await repository.upsertBatch(adapter.sourceId, batch);
      rejectedObservations += result.rejected;
      warnings.push(...(batch.warnings || []));
      complete = batch.complete;
      batches++;
      if (!complete && !batch.nextCursor) {
        warnings.push('Provider returned an incomplete batch without a continuation cursor.');
        break;
      }
      if (!complete && batch.nextCursor === priorCursor) {
        warnings.push('Provider repeated the same continuation cursor; sync stopped to avoid an infinite loop.');
        break;
      }
      cursor = batch.nextCursor || cursor;
    }
    if (!complete && batches >= maxBatches) warnings.push(`Sync stopped after the configured ${maxBatches} batch limit.`);
    if (rejectedObservations > 0) warnings.push(`${rejectedObservations} provider observation${rejectedObservations === 1 ? ' was' : 's were'} rejected by connected-health validation.`);
    const count = (await repository.listObservations({ sourceId: adapter.sourceId })).length;
    const partial = !complete || warnings.length > 0;
    const next: HealthSourceState = {
      ...baseState(adapter, previous),
      status: partial ? 'partial' : 'current',
      grantedMetrics: granted,
      lastAttemptAt: attemptAt,
      lastSuccessAt: new Date().toISOString(),
      cursor,
      recordCount: count,
      error: undefined,
      partialReason: warnings.join(' ') || undefined,
    };
    await repository.saveSource(next);
    return next;
  } catch (error) {
    const next: HealthSourceState = {
      ...baseState(adapter, previous),
      status: 'failed',
      grantedMetrics: granted,
      lastAttemptAt: attemptAt,
      cursor,
      error: error instanceof Error ? error.message : 'Connected-health sync failed.',
    };
    await repository.saveSource(next);
    return next;
  }
}

export async function disconnectAdapter(adapter: HealthDataAdapter, deleteImportedData = false, repository: HealthSyncRepository = healthRepository) {
  if (deleteImportedData) {
    return deleteConnectedHealthSource(adapter.sourceId, adapter, repository);
  }
  await adapter.disconnect?.();
  const previous = await repository.getSource(adapter.sourceId);
  const next = { ...baseState(adapter, previous), status: 'not-connected' as const, grantedMetrics: [], cursor: undefined, error: undefined, partialReason: undefined };
  await repository.saveSource(next);
  return next;
}

export type DeleteConnectedHealthSourceResult = {
  localDeleted: true;
  disconnectWarning?: string;
};

/**
 * Delete local connected-health data independently of a best-effort native/provider
 * disconnect. A provider failure must never prevent an explicit local deletion.
 */
export async function deleteConnectedHealthSource(
  sourceId: string,
  adapter?: HealthDataAdapter,
  repository: HealthSyncRepository = healthRepository,
): Promise<DeleteConnectedHealthSourceResult> {
  let disconnectWarning: string | undefined;
  if (adapter?.disconnect) {
    try {
      await adapter.disconnect();
    } catch (error) {
      disconnectWarning = error instanceof Error ? error.message : 'Native/provider disconnect failed.';
    }
  }

  try {
    await repository.deleteSource(sourceId);
  } catch (error) {
    const localMessage = error instanceof Error ? error.message : 'Local connected-health source deletion failed.';
    if (disconnectWarning) throw new Error(`${localMessage} Native/provider disconnect also failed: ${disconnectWarning}`);
    throw error instanceof Error ? error : new Error(localMessage);
  }

  return { localDeleted: true, disconnectWarning };
}
