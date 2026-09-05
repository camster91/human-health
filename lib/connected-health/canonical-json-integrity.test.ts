import { describe, expect, it } from 'vitest';
import { parseConnectedJson, parseConnectedPreferences } from './import/canonical-json';
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
});
