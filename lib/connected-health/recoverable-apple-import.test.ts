import { describe, expect, it } from 'vitest';
import { importAppleHealthXmlRecoverably } from './import/recoverable-apple-import';
import type { HealthObservation, HealthSourceState } from './types';

function observation(sourceId: string, externalId: string, value: number): HealthObservation {
  const at = '2026-09-04T12:00:00.000Z';
  return {
    id: `${sourceId}:${externalId}`,
    sourceId,
    metric: 'steps',
    value,
    unit: 'count',
    startTime: at,
    recordedAt: at,
    quality: 'direct',
    provenance: {
      provider: 'apple-health',
      ingestionMethod: 'file-import',
      sourceName: 'Apple Watch',
      originalType: 'HKQuantityTypeIdentifierStepCount',
      originalUnit: 'count',
      externalId,
      importedAt: at,
    },
  };
}

function source(id: string, count: number): HealthSourceState {
  return {
    id,
    provider: 'apple-health',
    displayName: 'Apple Watch',
    status: 'current',
    supportedMetrics: ['steps'],
    grantedMetrics: ['steps'],
    staleAfterMs: 365 * 24 * 3_600_000,
    lastSuccessAt: '2026-09-04T12:00:00.000Z',
    recordCount: count,
  };
}

describe('recoverable streamed Apple Health import', () => {
  it('restores the exact touched source state after a late parser failure', async () => {
    const sourceId = 'import:apple:test';
    const priorObservation = observation(sourceId, 'prior', 1000);
    const priorSource = source(sourceId, 1);
    let observations = [priorObservation];
    let currentSource: HealthSourceState | null = priorSource;

    const repository = {
      async listObservations(query: { sourceId?: string }) {
        return observations.filter(item => !query.sourceId || item.sourceId === query.sourceId);
      },
      async getSource(id: string) { return id === sourceId ? currentSource : null; },
      async upsertBatch(id: string, batch: { observations: HealthObservation[] }) {
        observations = [...observations.filter(item => item.sourceId !== id || !batch.observations.some(next => next.provenance.externalId === item.provenance.externalId)), ...batch.observations];
      },
      async deleteSource(id: string) {
        observations = observations.filter(item => item.sourceId !== id);
        if (id === sourceId) currentSource = null;
      },
      async saveSource(next: HealthSourceState) { currentSource = next; },
    };

    const parser = async (_file: File, onBatch: (items: HealthObservation[]) => Promise<void> | void) => {
      await onBatch([observation(sourceId, 'new', 2000)]);
      throw new Error('late XML parse failure');
    };

    await expect(importAppleHealthXmlRecoverably({} as File, { repository, parser: parser as never, saveSummaries: async () => {} }))
      .rejects.toThrow('rolled back to their pre-import source state');

    expect(observations).toEqual([priorObservation]);
    expect(currentSource).toEqual(priorSource);
  });

  it('rolls back committed batches when source-summary persistence fails', async () => {
    const sourceId = 'import:apple:new-source';
    let observations: HealthObservation[] = [];
    let currentSource: HealthSourceState | null = null;

    const repository = {
      async listObservations(query: { sourceId?: string }) { return observations.filter(item => !query.sourceId || item.sourceId === query.sourceId); },
      async getSource() { return currentSource; },
      async upsertBatch(_id: string, batch: { observations: HealthObservation[] }) { observations = [...observations, ...batch.observations]; },
      async deleteSource(id: string) { observations = observations.filter(item => item.sourceId !== id); currentSource = null; },
      async saveSource(next: HealthSourceState) { currentSource = next; },
    };

    const imported = observation(sourceId, 'new', 3000);
    const parser = async (_file: File, onBatch: (items: HealthObservation[]) => Promise<void> | void) => {
      await onBatch([imported]);
      return {
        observations: [], importedCount: 1, parsedTags: 1, skippedTags: 0, unsupportedTypes: {}, warnings: [],
        sourceSummaries: [{ sourceId, provider: 'apple-health' as const, displayName: 'Apple Watch', importedAt: imported.provenance.importedAt, metrics: ['steps' as const], count: 1 }],
      };
    };

    await expect(importAppleHealthXmlRecoverably({} as File, {
      repository,
      parser: parser as never,
      saveSummaries: async () => { throw new Error('source summary write failed'); },
    })).rejects.toThrow('rolled back to their pre-import source state');

    expect(observations).toEqual([]);
    expect(currentSource).toBeNull();
  });
});
