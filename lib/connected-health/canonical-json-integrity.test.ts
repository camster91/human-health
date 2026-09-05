import { describe, expect, it } from 'vitest';
import { parseConnectedJson, parseConnectedPreferences, parseConnectedSourceState } from './import/canonical-json';
import { makeObservation, makeSource } from './test-helpers';
import { defaultConnectedHealthPreferences } from './types';

function emptyConnectedExport(exportedAt: unknown = '2026-09-03T12:00:00Z') {
  return {
    schemaVersion: 1,
    exportedAt,
    observations: [],
    sources: [],
    preferences: defaultConnectedHealthPreferences,
  };
}

describe('connected archive truthfulness', () => {
  it('preserves a valid archive timestamp instead of inventing a new one', () => {
    expect(parseConnectedJson(JSON.stringify(emptyConnectedExport())).exportedAt).toBe('2026-09-03T12:00:00.000Z');
  });

  it('rejects missing or invalid archive timestamps', () => {
    const missing = emptyConnectedExport();
    delete (missing as { exportedAt?: unknown }).exportedAt;
    expect(() => parseConnectedJson(JSON.stringify(missing))).toThrow('invalid exportedAt');
    expect(() => parseConnectedJson(JSON.stringify(emptyConnectedExport('not-a-date')))).toThrow('invalid exportedAt');
  });

  it('allows omitted legacy preference fields but not invalid explicit values', () => {
    expect(parseConnectedPreferences({}).stepTarget).toBe(defaultConnectedHealthPreferences.stepTarget);
    expect(() => parseConnectedPreferences({ stepTarget: '8000' })).toThrow('stepTarget');
  });

  it('rejects fractional or unsafe source record counts instead of silently coercing them', () => {
    expect(() => parseConnectedSourceState({ ...makeSource('watch'), recordCount: 1.5 })).toThrow('record count');
    expect(() => parseConnectedSourceState({ ...makeSource('watch'), recordCount: Number.MAX_SAFE_INTEGER + 1 })).toThrow('record count');
  });

  it('rejects orphaned observations and duplicate source identities in archives', () => {
    const orphan = makeObservation('steps', 1_000, { sourceId: 'missing' });
    expect(() => parseConnectedJson(JSON.stringify({ ...emptyConnectedExport(), observations: [orphan] }))).toThrow('references missing source');

    const source = makeSource('watch');
    expect(() => parseConnectedJson(JSON.stringify({ ...emptyConnectedExport(), sources: [source, { ...source }] }))).toThrow('appears more than once');
  });

  it('rejects duplicate canonical observation identities instead of collapsing them silently', () => {
    const source = makeSource('watch');
    const observation = makeObservation('steps', 1_000, { sourceId: 'watch', externalId: 'same-record' });
    expect(() => parseConnectedJson(JSON.stringify({ ...emptyConnectedExport(), sources: [source], observations: [observation, { ...observation }] }))).toThrow('duplicate observation identities');
  });

  it('rejects provider and supported-metric mismatches between observations and source metadata', () => {
    const source = makeSource('watch', { provider: 'health-connect', supportedMetrics: ['heart-rate'], grantedMetrics: ['heart-rate'] });
    const wrongMetric = makeObservation('steps', 1_000, {
      sourceId: 'watch',
      provenance: { provider: 'health-connect', ingestionMethod: 'native-sync', sourceName: 'Watch', originalType: 'StepsRecord', originalUnit: 'count', externalId: 'steps', importedAt: '2026-09-03T12:00:00Z' },
    });
    expect(() => parseConnectedJson(JSON.stringify({ ...emptyConnectedExport(), sources: [source], observations: [wrongMetric] }))).toThrow('is not supported by source');

    const wrongProviderSource = makeSource('watch', { provider: 'apple-health', supportedMetrics: ['steps'], grantedMetrics: ['steps'] });
    expect(() => parseConnectedJson(JSON.stringify({ ...emptyConnectedExport(), sources: [wrongProviderSource], observations: [wrongMetric] }))).toThrow('does not match source');
  });
});
