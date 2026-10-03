import { describe, expect, it, vi } from 'vitest';
import { HealthSyncRepository, connectAdapter, syncAdapter } from './sync';
import { ConnectedMetric, HealthDataAdapter, HealthObservation, HealthSourceState, HealthSyncBatch } from './types';
import { makeObservation } from './test-helpers';

class MemoryRepository implements HealthSyncRepository {
  source: HealthSourceState | null = null;
  observations: HealthObservation[] = [];
  saved: HealthSourceState[] = [];
  deletedSources: string[] = [];
  async getSource() { return this.source; }
  async saveSource(source: HealthSourceState) { this.source = source; this.saved.push(source); }
  async upsertBatch(sourceId: string, batch: HealthSyncBatch) {
    const deleted = new Set(batch.deletedExternalIds);
    this.observations = this.observations.filter(item => item.sourceId !== sourceId || !deleted.has(item.provenance.externalId));
    batch.observations.forEach(incoming => {
      const index = this.observations.findIndex(item => item.id === incoming.id);
      if (index >= 0) this.observations[index] = incoming;
      else this.observations.push(incoming);
    });
    return { accepted: batch.observations.length, rejected: 0, deleted: deleted.size };
  }
  async listObservations(query: { sourceId?: string } = {}) { return this.observations.filter(item => !query.sourceId || item.sourceId === query.sourceId); }
  async deleteSource(sourceId: string) { this.deletedSources.push(sourceId); this.observations = this.observations.filter(item => item.sourceId !== sourceId); this.source = null; }
}

function adapter(read: HealthDataAdapter['read'], availability: HealthDataAdapter['availability'] = async () => ({ available: true, permissionRequired: false, grantedMetrics: ['steps'] })) : HealthDataAdapter {
  return {
    sourceId: 'native:test',
    provider: 'health-connect',
    displayName: 'Test Health',
    supportedMetrics: ['steps'],
    availability,
    requestPermissions: async (metrics: ConnectedMetric[]) => ({ available: true, permissionRequired: false, grantedMetrics: metrics }),
    read,
  };
}

describe('connected-health sync state machine', () => {
  it('continues with cursors, upserts batches and becomes current', async () => {
    const repository = new MemoryRepository();
    const cursors: (string | undefined)[] = [];
    const value = makeObservation('steps', 1_000, { sourceId: 'native:test', externalId: 'steps-1' });
    const source = adapter(async request => {
      cursors.push(request.cursor);
      return request.cursor ? { observations: [], deletedExternalIds: [], complete: true } : { observations: [value], deletedExternalIds: [], nextCursor: 'cursor-1', complete: false };
    });
    const state = await syncAdapter(source, ['steps'], { startTime: '2026-09-01T00:00:00Z', endTime: '2026-09-03T00:00:00Z' }, repository);
    expect(cursors).toEqual([undefined, 'cursor-1']);
    expect(state.status).toBe('current');
    expect(state.partialReason).toBeUndefined();
    expect(state.cursor).toBe('cursor-1');
    expect(state.recordCount).toBe(1);
  });

  it('marks a complete sync partial when observations are rejected, preserving accepted data and deletions', async () => {
    const repository = new MemoryRepository();
    const value = makeObservation('steps', 1_000, { sourceId: 'native:test', externalId: 'accepted' });
    repository.observations = [makeObservation('steps', 500, { sourceId: 'native:test', externalId: 'deleted' })];
    const upsertBatch = repository.upsertBatch.bind(repository);
    vi.spyOn(repository, 'upsertBatch').mockImplementation(async (sourceId, batch) => {
      const result = await upsertBatch(sourceId, { ...batch, observations: batch.observations.slice(0, 1) });
      return { ...result, rejected: 1 };
    });
    const state = await syncAdapter(adapter(async () => ({ observations: [value, value], deletedExternalIds: ['deleted'], complete: true })), ['steps'], {}, repository);
    expect(state.status).toBe('partial');
    expect(state.partialReason).toBe('1 observations rejected.');
    expect(state.recordCount).toBe(1);
    expect(repository.observations).toEqual([value]);
    expect(repository.source).toEqual(state);
  });

  it('accumulates rejected counts across batches in one partial reason', async () => {
    const repository = new MemoryRepository();
    vi.spyOn(repository, 'upsertBatch')
      .mockResolvedValueOnce({ accepted: 0, rejected: 2, deleted: 0 })
      .mockResolvedValueOnce({ accepted: 0, rejected: 3, deleted: 0 });
    const source = adapter(async request => ({ observations: [], deletedExternalIds: [], nextCursor: request.cursor ? undefined : 'next', complete: !!request.cursor }));
    const state = await syncAdapter(source, ['steps'], {}, repository);
    expect(repository.upsertBatch).toHaveBeenCalledTimes(2);
    expect(state.status).toBe('partial');
    expect(state.partialReason).toBe('5 observations rejected.');
  });

  it('reports a repository write error as failed even after rejected observations', async () => {
    const repository = new MemoryRepository();
    vi.spyOn(repository, 'upsertBatch')
      .mockResolvedValueOnce({ accepted: 0, rejected: 2, deleted: 0 })
      .mockRejectedValueOnce(new Error('repository write failed'));
    const source = adapter(async request => ({ observations: [], deletedExternalIds: [], nextCursor: request.cursor ? undefined : 'next', complete: !!request.cursor }));
    const state = await syncAdapter(source, ['steps'], {}, repository);
    expect(state.status).toBe('failed');
    expect(state.error).toBe('repository write failed');
    expect(repository.source).toEqual(state);
  });

  it('preserves successful data and reports partial sync without a usable next cursor', async () => {
    const repository = new MemoryRepository();
    const value = makeObservation('steps', 2_000, { sourceId: 'native:test', externalId: 'steps-partial' });
    const state = await syncAdapter(adapter(async () => ({ observations: [value], deletedExternalIds: [], complete: false })), ['steps'], { maxBatches: 3 }, repository);
    expect(repository.observations).toHaveLength(1);
    expect(state.status).toBe('partial');
    expect(state.partialReason).toContain('without a continuation cursor');
  });

  it('stops repeated cursors and records provider failures', async () => {
    const repeatedRepository = new MemoryRepository();
    repeatedRepository.source = { id: 'native:test', provider: 'health-connect', displayName: 'Test Health', status: 'partial', supportedMetrics: ['steps'], grantedMetrics: ['steps'], staleAfterMs: 1_000, cursor: 'same' };
    const repeated = await syncAdapter(adapter(async () => ({ observations: [], deletedExternalIds: [], nextCursor: 'same', complete: false })), ['steps'], {}, repeatedRepository);
    expect(repeated.status).toBe('partial');
    expect(repeated.partialReason).toContain('same continuation cursor');

    const failedRepository = new MemoryRepository();
    const failed = await syncAdapter(adapter(async () => { throw new Error('provider offline'); }), ['steps'], {}, failedRepository);
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('provider offline');
  });

  it('does not request permissions when the native adapter is unavailable', async () => {
    const repository = new MemoryRepository();
    let requested = false;
    const source = adapter(async () => ({ observations: [], deletedExternalIds: [], complete: true }), async () => ({ available: false, permissionRequired: false, grantedMetrics: [], reason: 'native host missing' }));
    source.requestPermissions = async () => { requested = true; return { available: false, permissionRequired: false, grantedMetrics: [] }; };
    const state = await connectAdapter(source, ['steps'], repository);
    expect(requested).toBe(false);
    expect(state.status).toBe('unavailable');
  });
});
