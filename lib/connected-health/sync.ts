import { healthRepository } from './repository';
import { ConnectedMetric, HealthDataAdapter, HealthSourceState } from './types';

const defaultWindowMs = 90 * 24 * 3_600_000;

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

export async function refreshAdapterState(adapter: HealthDataAdapter) {
  const previous = await healthRepository.getSource(adapter.sourceId);
  const availability = await adapter.availability();
  const status = !availability.available ? 'unavailable' : availability.permissionRequired ? 'permission-required' : previous?.lastSuccessAt ? 'current' : 'not-connected';
  const next: HealthSourceState = { ...baseState(adapter, previous), status, grantedMetrics: availability.grantedMetrics, error: availability.available ? undefined : availability.reason };
  await healthRepository.saveSource(next);
  return next;
}

export async function connectAdapter(adapter: HealthDataAdapter, metrics: ConnectedMetric[] = adapter.supportedMetrics) {
  const previous = await healthRepository.getSource(adapter.sourceId);
  const availability = await adapter.availability();
  if (!availability.available) {
    const state = { ...baseState(adapter, previous), status: 'unavailable' as const, error: availability.reason };
    await healthRepository.saveSource(state);
    return state;
  }
  const permission = await adapter.requestPermissions(metrics);
  const state = { ...baseState(adapter, previous), status: permission.grantedMetrics.length ? 'not-connected' as const : 'permission-required' as const, grantedMetrics: permission.grantedMetrics, error: permission.reason };
  await healthRepository.saveSource(state);
  return permission.grantedMetrics.length ? syncAdapter(adapter, permission.grantedMetrics) : state;
}

export async function syncAdapter(adapter: HealthDataAdapter, metrics?: ConnectedMetric[], options: { startTime?: string; endTime?: string; maxBatches?: number } = {}) {
  const previous = await healthRepository.getSource(adapter.sourceId);
  const availability = await adapter.availability();
  if (!availability.available) {
    const state = { ...baseState(adapter, previous), status: 'unavailable' as const, error: availability.reason };
    await healthRepository.saveSource(state);
    return state;
  }
  const granted = (metrics || availability.grantedMetrics || previous?.grantedMetrics || []).filter(metric => adapter.supportedMetrics.includes(metric));
  if (!granted.length) {
    const state = { ...baseState(adapter, previous), status: 'permission-required' as const, grantedMetrics: [], error: 'No connected-health permissions are available.' };
    await healthRepository.saveSource(state);
    return state;
  }

  const attemptAt = new Date().toISOString();
  await healthRepository.saveSource({ ...baseState(adapter, previous), status: 'syncing', grantedMetrics: granted, lastAttemptAt: attemptAt, error: undefined, partialReason: undefined });
  let cursor = previous?.cursor;
  let batches = 0;
  let complete = false;
  const warnings: string[] = [];
  try {
    while (!complete && batches < (options.maxBatches || 100)) {
      const batch = await adapter.read({
        metrics: granted,
        startTime: options.startTime || new Date(Date.now() - defaultWindowMs).toISOString(),
        endTime: options.endTime || new Date().toISOString(),
        cursor,
      });
      await healthRepository.upsertBatch(adapter.sourceId, batch);
      warnings.push(...(batch.warnings || []));
      complete = batch.complete;
      if (!complete && !batch.nextCursor) {
        warnings.push('Provider returned an incomplete batch without a continuation cursor.');
        break;
      }
      cursor = batch.nextCursor || cursor;
      batches++;
    }
    const count = (await healthRepository.listObservations({ sourceId: adapter.sourceId })).length;
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
    await healthRepository.saveSource(next);
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
    await healthRepository.saveSource(next);
    return next;
  }
}

export async function disconnectAdapter(adapter: HealthDataAdapter, deleteImportedData = false) {
  await adapter.disconnect?.();
  if (deleteImportedData) {
    await healthRepository.deleteSource(adapter.sourceId);
    return null;
  }
  const previous = await healthRepository.getSource(adapter.sourceId);
  const next = { ...baseState(adapter, previous), status: 'not-connected' as const, grantedMetrics: [], cursor: undefined, error: undefined, partialReason: undefined };
  await healthRepository.saveSource(next);
  return next;
}
