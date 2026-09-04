import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import { createConnectedJsonEnvelope, parseConnectedJson } from './import/canonical-json';
import { createManualObservation } from './habits';
import { parseFullHealthArchive, runCompleteDeletion } from './portability';
import { defaultConnectedHealthPreferences } from './types';
import { makeSource } from './test-helpers';

function trainingExport() {
  return {
    schemaVersion: 2 as const,
    exportedAt: '2026-09-03T12:00:00Z',
    activeWorkout: null,
    restTimer: null,
    history: [],
    activity: [],
    readiness: [],
    skills: {},
    assessments: [],
    progressions: {},
    skillAssessments: [],
    preferences: defaultPreferences,
    scheduleEvents: [],
  };
}

function connectedExport(metric: 'water' | 'protein' = 'water') {
  const observation = createManualObservation(metric, metric === 'water' ? 250 : 30, new Date('2026-09-03T12:00:00Z'));
  return {
    schemaVersion: 1 as const,
    exportedAt: '2026-09-03T12:00:00Z',
    observations: [observation],
    sources: [makeSource('manual:habits', { provider: 'manual', supportedMetrics: [metric], grantedMetrics: [metric] })],
    preferences: defaultConnectedHealthPreferences,
  };
}

describe('connected and full archive parsing', () => {
  it('round-trips a validated connected-health envelope', () => {
    const parsed = parseConnectedJson(JSON.stringify(createConnectedJsonEnvelope(connectedExport('water'))));
    expect(parsed.observations).toHaveLength(1);
    expect(parsed.observations[0].metric).toBe('water');
  });

  it('accepts legacy v1 full archives and initializes an empty Phase 5 platform section', () => {
    const archive = {
      format: 'human-health-full-export' as const,
      schemaVersion: 1 as const,
      exportedAt: '2026-09-03T12:00:00Z',
      training: trainingExport(),
      connected: connectedExport('protein'),
    };
    const parsed = parseFullHealthArchive(JSON.stringify(archive));
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.connected.observations).toHaveLength(1);
    expect(parsed.platform).toEqual({ schemaVersion: 1, records: [], reminders: [] });
  });

  it('validates Phase 5 platform data before any full-archive mutation', () => {
    const archive = {
      format: 'human-health-full-export' as const,
      schemaVersion: 2 as const,
      exportedAt: '2026-09-03T12:00:00Z',
      training: trainingExport(),
      connected: connectedExport(),
      platform: {
        schemaVersion: 1 as const,
        records: [{ id: 'r1', title: 'Dental cleaning', category: 'dental' as const, occurredAt: '2026-09-01T12:00:00Z', source: 'manual' as const, createdAt: '2026-09-01T12:00:00Z' }],
        reminders: [],
      },
    };
    expect(parseFullHealthArchive(JSON.stringify(archive)).platform.records).toHaveLength(1);
    expect(() => parseFullHealthArchive(JSON.stringify({ ...archive, platform: { schemaVersion: 99, records: [], reminders: [] } }))).toThrow('Unsupported platform archive version');
    expect(() => parseFullHealthArchive(JSON.stringify({ ...archive, training: { schemaVersion: 99 } }))).toThrow('Unsupported training archive version');
  });

  it('rejects malformed or future connected archives before writing data', () => {
    expect(() => parseConnectedJson('{bad json')).toThrow('not valid JSON');
    expect(() => parseConnectedJson(JSON.stringify({ schemaVersion: 2, observations: [], sources: [] }))).toThrow('Unsupported');
  });

  it('rejects malformed source metadata instead of silently coercing it', () => {
    const observation = createManualObservation('water', 250, new Date('2026-09-03T12:00:00Z'));
    const base = { schemaVersion: 1, exportedAt: '2026-09-03T12:00:00Z', observations: [observation], preferences: defaultConnectedHealthPreferences };
    expect(() => parseConnectedJson(JSON.stringify({ ...base, sources: [{ ...makeSource('bad-provider'), provider: 'mystery-provider' }] }))).toThrow('unsupported provider');
    expect(() => parseConnectedJson(JSON.stringify({ ...base, sources: [{ ...makeSource('bad-status'), status: 'maybe-current' }] }))).toThrow('unsupported status');
    expect(() => parseConnectedJson(JSON.stringify({ ...base, sources: [{ ...makeSource('bad-freshness'), staleAfterMs: 0 }] }))).toThrow('invalid freshness window');
    expect(() => parseConnectedJson(JSON.stringify({ ...base, sources: [{ ...makeSource('bad-metric'), supportedMetrics: ['mystery-metric'], grantedMetrics: [] }] }))).toThrow('unsupported or inconsistent metrics');
    expect(() => parseConnectedJson(JSON.stringify({ ...base, sources: [{ ...makeSource('bad-grant', { supportedMetrics: ['steps'] }), grantedMetrics: ['water'] }] }))).toThrow('unsupported or inconsistent metrics');
    expect(() => parseConnectedJson(JSON.stringify({ ...base, sources: [{ ...makeSource('bad-date'), lastSuccessAt: 'not-a-date' }] }))).toThrow('invalid last success timestamp');
  });
});

describe('privacy-directed complete deletion', () => {
  it('attempts every local domain even when an earlier domain fails', async () => {
    const calls: string[] = [];
    await expect(runCompleteDeletion({
      clearTraining: () => { calls.push('training'); return false; },
      trainingError: () => 'training storage unavailable',
      clearConnected: async () => { calls.push('connected'); },
      clearPlatform: () => { calls.push('platform'); return true; },
    })).rejects.toThrow('training storage unavailable');
    expect(calls).toEqual(['training', 'connected', 'platform']);
  });

  it('does not restore successfully deleted domains after a partial failure', async () => {
    const calls: string[] = [];
    await expect(runCompleteDeletion({
      clearTraining: () => { calls.push('delete-training'); return true; },
      clearConnected: async () => { calls.push('delete-connected'); throw new Error('IndexedDB deletion failed'); },
      clearPlatform: () => { calls.push('delete-platform'); return true; },
    })).rejects.toThrow('Successfully deleted domains were not restored');
    expect(calls).toEqual(['delete-training', 'delete-connected', 'delete-platform']);
  });

  it('reports all domain failures so a retry can target remaining data', async () => {
    await expect(runCompleteDeletion({
      clearTraining: () => false,
      trainingError: () => 'training failed',
      clearConnected: async () => { throw new Error('connected failed'); },
      clearPlatform: () => false,
      platformError: () => 'platform failed',
    })).rejects.toThrow(/training failed.*connected failed.*platform failed/);
  });

  it('completes without a backup/export precondition when every clear succeeds', async () => {
    await expect(runCompleteDeletion({
      clearTraining: () => true,
      clearConnected: async () => {},
      clearPlatform: () => true,
    })).resolves.toBeUndefined();
  });
});
