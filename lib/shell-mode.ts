/**
 * Guide-first shell selection (#148).
 *
 * During migration the legacy shell and the Guide-first shell must coexist so
 * migration is incremental, comparable, and reversible. This module is the
 * single migration gate.
 *
 * Precedence:
 *   1. `?shell=legacy` / `?shell=guide` query param  (internal QA, per-visit)
 *   2. persisted preference                          (user/QA choice)
 *   3. default `guide`
 *
 * This flag is temporary. #157 removes it once the legacy shell is retired, so
 * the repository does not ship two permanent product experiences.
 */
export type ShellMode = 'guide' | 'legacy';

export const SHELL_STORAGE_KEY = 'human-health:shell';
export const DEFAULT_SHELL_MODE: ShellMode = 'guide';

export function isShellMode(value: unknown): value is ShellMode {
  return value === 'guide' || value === 'legacy';
}

/**
 * Resolve the active shell. Reads the query param first, then storage.
 * Never throws: an unavailable or corrupt store falls back to the default.
 */
export function resolveShellMode(input?: { search?: string; stored?: string | null }): ShellMode {
  if (input?.search) {
    const match = /[?&]shell=([^&]*)/.exec(input.search);
    if (match) {
      const value = decodeURIComponent(match[1]);
      if (isShellMode(value)) return value;
    }
  }
  if (isShellMode(input?.stored)) return input.stored;
  return DEFAULT_SHELL_MODE;
}

/** Read the persisted shell mode from a Storage-like object. */
export function readStoredShellMode(storage?: { getItem(key: string): string | null } | null): ShellMode | null {
  try {
    const raw = storage?.getItem(SHELL_STORAGE_KEY) ?? null;
    return isShellMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Persist the shell mode. Returns false when storage is unavailable. */
export function persistShellMode(mode: ShellMode, storage?: { setItem(key: string, value: string): void } | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SHELL_STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
