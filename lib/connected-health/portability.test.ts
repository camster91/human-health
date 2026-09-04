import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import { createConnectedJsonEnvelope, parseConnectedJson } from './import/canonical-json';
import { createManualObservation } from './habits';
import { parseFullHealthArchive } from './portability';
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

describe('connected and full archive parsing', () => {
  it('round-trips a validated connected-health envelope', () => {
    const observation = createManualObservation('water', 250, new Date('2026-09-03T12:00:00Z'));
    const connected = { schemaVersion: 1 as const, exportedAt: '2026-09-03T12:00:00Z', observations: [observation], sources: [makeSource('manual:habits', { provider: 'manual', supportedMetrics: ['water'], grantedMetrics: ['water'] })], preferences: defaultConnectedHealthPreferences };
    const parsed = parseConnectedJson(JSON.stringify(createConnectedJsonEnvelope(connected)));
    expect(parsed.observations).toHaveLength(1);
    expect(parsed.observations[0].metric).toBe('water');
  });

  it('validates both training and connected sections before a full import', () => {
    const observation = createManualObservation('protein', 30, new Date('2026-09-03T12:00:00Z'));
    const archive = {
      format: 'human-health-full-export' as const,
      schemaVersion: 1 as const,
      exportedAt: '2026-09-03T12:00:00Z',
      training: trainingExport(),
      connected: { schemaVersion: 1 as const, exportedAt: '2026-09-03T12:00:00Z', observations: [observation], sources: [makeSource('manual:habits', { provider: 'manual', supportedMetrics: ['protein'], grantedMetrics: ['protein'] })], preferences: defaultConnectedHealthPreferences },
    };
    expect(parseFullHealthArchive(JSON.stringify(archive)).connected.observations).toHaveLength(1);
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
