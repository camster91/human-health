import { describe, expect, it, vi } from 'vitest';
import { runCompleteDeletion, type CompleteDeletionOperations } from './portability';

describe('runCompleteDeletion — complete data deletion regression tests (issue #88)', () => {
  it('attempts all domains even if one fails, reporting all failures', async () => {
    const operations: CompleteDeletionOperations = {
      clearTraining: () => false,
      trainingError: () => 'training storage is locked',
      clearConnected: async () => { throw new Error('database access denied'); },
      clearPlatform: () => true,
      platformError: () => null,
    };

    await expect(runCompleteDeletion(operations)).rejects.toThrow('Delete-all was incomplete');
    await expect(runCompleteDeletion(operations)).rejects.toThrow('training: training storage is locked');
    await expect(runCompleteDeletion(operations)).rejects.toThrow('connected health: database access denied');
  });

  it('succeeds when all domains clear successfully', async () => {
    const operations: CompleteDeletionOperations = {
      clearTraining: () => true,
      trainingError: () => null,
      clearConnected: async () => {},
      clearPlatform: () => true,
      platformError: () => null,
    };

    await expect(runCompleteDeletion(operations)).resolves.toBeUndefined();
  });

  it('calls clearCaches when provided', async () => {
    const clearCaches = vi.fn(async () => {});
    const operations: CompleteDeletionOperations = {
      clearTraining: () => true,
      clearConnected: async () => {},
      clearPlatform: () => true,
      clearCaches,
    };

    await runCompleteDeletion(operations);
    expect(clearCaches).toHaveBeenCalledTimes(1);
  });

  it('continues to other domains even if cache clearing fails', async () => {
    const operations: CompleteDeletionOperations = {
      clearTraining: () => true,
      clearConnected: async () => {},
      clearPlatform: () => true,
      clearCaches: async () => { throw new Error('cache API unavailable'); },
    };

    await expect(runCompleteDeletion(operations)).rejects.toThrow('Delete-all was incomplete');
    await expect(runCompleteDeletion(operations)).rejects.toThrow('service worker caches: cache API unavailable');
  });

  it('does not call clearCaches when omitted', async () => {
    const operations: CompleteDeletionOperations = {
      clearTraining: () => true,
      clearConnected: async () => {},
      clearPlatform: () => true,
    };

    await expect(runCompleteDeletion(operations)).resolves.toBeUndefined();
  });

  it('reports generic fallback when clearTraining fails without error message', async () => {
    const operations: CompleteDeletionOperations = {
      clearTraining: () => false,
      trainingError: () => null,
      clearConnected: async () => {},
      clearPlatform: () => true,
    };

    await expect(runCompleteDeletion(operations)).rejects.toThrow('training: local training data could not be fully deleted');
  });

  it('reports generic fallback when clearPlatform fails without error message', async () => {
    const operations: CompleteDeletionOperations = {
      clearTraining: () => true,
      clearConnected: async () => {},
      clearPlatform: () => false,
      platformError: () => null,
    };

    await expect(runCompleteDeletion(operations)).rejects.toThrow('preventive/platform: preventive/platform data could not be fully deleted');
  });

  it('never rolls back successfully deleted domains', async () => {
    const trainingCleared = vi.fn(() => true);
    const platformCleared = vi.fn(() => true);
    const operations: CompleteDeletionOperations = {
      clearTraining: trainingCleared,
      clearConnected: async () => { throw new Error('database error'); },
      clearPlatform: platformCleared,
    };

    await expect(runCompleteDeletion(operations)).rejects.toThrow('connected health: database error');
    expect(trainingCleared).toHaveBeenCalledTimes(1);
    expect(platformCleared).toHaveBeenCalledTimes(1);
  });
});
