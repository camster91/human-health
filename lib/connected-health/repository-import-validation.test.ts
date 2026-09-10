import { describe, expect, it, beforeEach, vi } from 'vitest';
import { healthRepository } from './repository';
import { makeObservation, makeSource } from './test-helpers';
import { defaultConnectedHealthPreferences } from './types';

vi.mock('./repository', async () => {
  const actual = await vi.importActual('./repository');
  return {
    ...actual,
    healthRepository: {
      ...((actual as any).healthRepository || {}),
      importData: (actual as any).healthRepository.importData,
    },
  };
});

describe('connected-health repository import validation', () => {
  it('rejects import when exportedAt is missing', async () => {
    const payload = {
      schemaVersion: 1 as const,
      observations: [],
      sources: [],
      preferences: defaultConnectedHealthPreferences,
    };
    
    await expect(healthRepository.importData(payload as any, 'replace')).rejects.toThrow('exportedAt is missing or invalid');
  });

  it('rejects import when exportedAt is invalid', async () => {
    const payload = {
      schemaVersion: 1 as const,
      exportedAt: 'not-a-date',
      observations: [],
      sources: [],
      preferences: defaultConnectedHealthPreferences,
    };
    
    await expect(healthRepository.importData(payload, 'replace')).rejects.toThrow('exportedAt is missing or invalid');
  });

  it('rejects import when exportedAt is empty string', async () => {
    const payload = {
      schemaVersion: 1 as const,
      exportedAt: '',
      observations: [],
      sources: [],
      preferences: defaultConnectedHealthPreferences,
    };
    
    await expect(healthRepository.importData(payload, 'replace')).rejects.toThrow('exportedAt is missing or invalid');
  });

  it('rejects import when exportedAt is null', async () => {
    const payload = {
      schemaVersion: 1 as const,
      exportedAt: null as any,
      observations: [],
      sources: [],
      preferences: defaultConnectedHealthPreferences,
    };
    
    await expect(healthRepository.importData(payload, 'replace')).rejects.toThrow('exportedAt is missing or invalid');
  });

  it('rejects import with invalid observations before any mutation', async () => {
    const valid = makeObservation('steps', 1000, { externalId: 'valid-1' });
    const invalid = { ...valid, startTime: 'not-a-date', provenance: { ...valid.provenance, externalId: 'invalid-1' } };
    
    const payload = {
      schemaVersion: 1 as const,
      exportedAt: '2026-09-10T12:00:00Z',
      observations: [valid, invalid],
      sources: [makeSource('test-source')],
      preferences: defaultConnectedHealthPreferences,
    };
    
    await expect(healthRepository.importData(payload, 'replace')).rejects.toThrow('1 connected-health observations were invalid');
  });
});
