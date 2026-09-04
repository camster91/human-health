import { describe, expect, it } from 'vitest';
import { deleteConnectedHealthSource, type HealthSyncRepository } from './sync';
import type { HealthDataAdapter } from './types';

function adapter(disconnect: () => Promise<void>): HealthDataAdapter {
  return {
    sourceId: 'native:test',
    provider: 'health-connect',
    displayName: 'Test health source',
    supportedMetrics: [],
    availability: async () => ({ available: true, permissionRequired: false, grantedMetrics: [] }),
    requestPermissions: async () => ({ available: true, permissionRequired: false, grantedMetrics: [] }),
    read: async () => ({ observations: [], deletedExternalIds: [], complete: true }),
    disconnect,
  };
}

function repository(deleteSource: (sourceId: string) => Promise<void>): HealthSyncRepository {
  return {
    getSource: async () => null,
    saveSource: async () => {},
    upsertBatch: async () => ({ accepted: 0, rejected: 0, deleted: 0 }),
    listObservations: async () => [],
    deleteSource,
  };
}

describe('connected-health source deletion', () => {
  it('deletes local data after a successful native disconnect', async () => {
    const calls: string[] = [];
    const result = await deleteConnectedHealthSource(
      'native:test',
      adapter(async () => { calls.push('disconnect'); }),
      repository(async sourceId => { calls.push(`delete:${sourceId}`); }),
    );

    expect(calls).toEqual(['disconnect', 'delete:native:test']);
    expect(result).toEqual({ localDeleted: true, disconnectWarning: undefined });
  });

  it('still deletes local data when native disconnect fails', async () => {
    const calls: string[] = [];
    const result = await deleteConnectedHealthSource(
      'native:test',
      adapter(async () => { calls.push('disconnect'); throw new Error('bridge unavailable'); }),
      repository(async sourceId => { calls.push(`delete:${sourceId}`); }),
    );

    expect(calls).toEqual(['disconnect', 'delete:native:test']);
    expect(result.localDeleted).toBe(true);
    expect(result.disconnectWarning).toBe('bridge unavailable');
  });

  it('surfaces local deletion failure as the primary failure', async () => {
    await expect(deleteConnectedHealthSource(
      'native:test',
      adapter(async () => {}),
      repository(async () => { throw new Error('IndexedDB deletion failed'); }),
    )).rejects.toThrow('IndexedDB deletion failed');
  });

  it('reports both failures when native disconnect and local deletion fail', async () => {
    await expect(deleteConnectedHealthSource(
      'native:test',
      adapter(async () => { throw new Error('native failure'); }),
      repository(async () => { throw new Error('local failure'); }),
    )).rejects.toThrow('local failure Native/provider disconnect also failed: native failure');
  });

  it('deletes imported/manual source data without requiring an adapter', async () => {
    let deleted = '';
    const result = await deleteConnectedHealthSource('import:file', undefined, repository(async sourceId => { deleted = sourceId; }));
    expect(deleted).toBe('import:file');
    expect(result.localDeleted).toBe(true);
    expect(result.disconnectWarning).toBeUndefined();
  });
});
