/**
 * Tests for the shell migration gate (#148).
 *
 * The gate must be deterministic and must never throw on a corrupt or
 * unavailable store, because it runs during first paint.
 */
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_SHELL_MODE,
  isShellMode,
  persistShellMode,
  readStoredShellMode,
  resolveShellMode,
  SHELL_STORAGE_KEY,
} from './shell-mode';

describe('isShellMode', () => {
  test('accepts the two real modes', () => {
    expect(isShellMode('guide')).toBe(true);
    expect(isShellMode('legacy')).toBe(true);
  });

  test('rejects anything else', () => {
    expect(isShellMode('')).toBe(false);
    expect(isShellMode(null)).toBe(false);
    expect(isShellMode(undefined)).toBe(false);
    expect(isShellMode('GUIDE')).toBe(false);
    expect(isShellMode(0)).toBe(false);
  });
});

describe('resolveShellMode', () => {
  test('defaults to guide', () => {
    expect(resolveShellMode()).toBe(DEFAULT_SHELL_MODE);
    expect(resolveShellMode({})).toBe('guide');
  });

  test('query param wins over storage', () => {
    expect(resolveShellMode({ search: '?shell=legacy', stored: 'guide' })).toBe('legacy');
    expect(resolveShellMode({ search: '?shell=guide', stored: 'legacy' })).toBe('guide');
  });

  test('finds the param when it is not first', () => {
    expect(resolveShellMode({ search: '?tab=body&shell=legacy' })).toBe('legacy');
  });

  test('ignores an invalid query param and falls back to storage', () => {
    expect(resolveShellMode({ search: '?shell=nonsense', stored: 'legacy' })).toBe('legacy');
    expect(resolveShellMode({ search: '?shell=nonsense' })).toBe('guide');
  });

  test('ignores an invalid stored value', () => {
    expect(resolveShellMode({ stored: 'garbage' })).toBe('guide');
  });
});

describe('storage helpers', () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return {
      data,
      getItem: (key: string) => (key in data ? data[key] : null),
      setItem: (key: string, value: string) => { data[key] = value; },
    };
  }

  test('reads a valid stored mode', () => {
    expect(readStoredShellMode(fakeStorage({ [SHELL_STORAGE_KEY]: 'legacy' }))).toBe('legacy');
  });

  test('returns null for a missing or invalid stored mode', () => {
    expect(readStoredShellMode(fakeStorage())).toBeNull();
    expect(readStoredShellMode(fakeStorage({ [SHELL_STORAGE_KEY]: 'nope' }))).toBeNull();
  });

  test('never throws when storage is unavailable or throws', () => {
    expect(readStoredShellMode(null)).toBeNull();
    expect(readStoredShellMode({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
    expect(persistShellMode('legacy', null)).toBe(false);
    expect(persistShellMode('legacy', { setItem: () => { throw new Error('quota'); } })).toBe(false);
  });

  test('persists then reads back', () => {
    const storage = fakeStorage();
    expect(persistShellMode('legacy', storage)).toBe(true);
    expect(readStoredShellMode(storage)).toBe('legacy');
  });
});
