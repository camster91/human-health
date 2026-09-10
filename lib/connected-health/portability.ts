import { createEmptyPlatformData, platformStore, validatePlatformData, type PlatformLocalData } from '../platform/storage';
import { HumanHealthExport, store, validateTrainingExport } from '../storage';
import { createConnectedJsonEnvelope, parseConnectedJson } from './import/canonical-json';
import { healthRepository } from './repository';
import { HealthRepositoryExport } from './types';

export type FullHealthArchive = {
  format: 'human-health-full-export';
  schemaVersion: 2;
  exportedAt: string;
  training: HumanHealthExport;
  connected: HealthRepositoryExport;
  platform: PlatformLocalData;
};

function readablePlatformSnapshot() {
  const platform = platformStore.exportData();
  const error = platformStore.getMutationError();
  if (error) throw new Error(`Platform health data cannot be safely included in a complete archive: ${error}`);
  return platform;
}

export async function createFullHealthArchive(): Promise<FullHealthArchive> {
  const platform = readablePlatformSnapshot();
  return {
    format: 'human-health-full-export', schemaVersion: 2, exportedAt: new Date().toISOString(),
    training: store.exportData(), connected: await healthRepository.exportData(), platform,
  };
}

export async function createConnectedHealthJson() { return createConnectedJsonEnvelope(await healthRepository.exportData()); }

export function parseFullHealthArchive(text: string): FullHealthArchive {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Human Health archive is not valid JSON.'); }
  const archive = value as { format?: unknown; schemaVersion?: unknown; exportedAt?: unknown; training?: unknown; connected?: unknown; platform?: unknown };
  if (archive.format !== 'human-health-full-export' || (archive.schemaVersion !== 1 && archive.schemaVersion !== 2) || !archive.training || !archive.connected) throw new Error('Unsupported Human Health full archive.');
  
  const exportedAt = typeof archive.exportedAt === 'string' ? archive.exportedAt : undefined;
  if (!exportedAt || !Number.isFinite(Date.parse(exportedAt))) {
    throw new Error('Full archive exportedAt is missing or invalid. This archive cannot be trusted for import.');
  }
  
  return {
    format: 'human-health-full-export', schemaVersion: 2,
    exportedAt: new Date(exportedAt).toISOString(),
    training: validateTrainingExport(archive.training),
    connected: parseConnectedJson(JSON.stringify(archive.connected)),
    platform: archive.schemaVersion === 2 ? validatePlatformData(archive.platform) : createEmptyPlatformData(),
  };
}

export async function importFullHealthArchive(text: string, mode: 'merge' | 'replace' = 'merge') {
  const archive = parseFullHealthArchive(text);
  const trainingBackup = store.exportData();
  const connectedBackup = await healthRepository.exportData();
  const platformBackup = readablePlatformSnapshot();
  try {
    store.importData(archive.training, mode);
    await healthRepository.importData(archive.connected, mode);
    platformStore.importData(archive.platform, mode);
    return archive;
  } catch (error) {
    let rollbackError: unknown = null;
    try { store.importData(trainingBackup, 'replace'); } catch (failure) { rollbackError = failure; }
    try { await healthRepository.importData(connectedBackup, 'replace'); } catch (failure) { rollbackError ||= failure; }
    try { platformStore.importData(platformBackup, 'replace'); } catch (failure) { rollbackError ||= failure; }
    if (rollbackError) {
      const original = error instanceof Error ? error.message : 'Archive import failed.';
      const rollback = rollbackError instanceof Error ? rollbackError.message : 'Rollback failed.';
      throw new Error(`${original} Automatic rollback also failed: ${rollback}`);
    }
    throw error;
  }
}

/**
 * Complete local data deletion operations contract (issue #88).
 * 
 * Domain inventory — every Human Health persistence mechanism:
 * 
 * 1. Training data (storage.ts localStorage):
 *    - human-health:active, history, activity, readiness, skills, assessments
 *    - human-health:progressions, skill-assessments, rest-timer, rest-until (legacy)
 *    - human-health:preferences, schedule-events, finalization-journal
 *    - human-health:fuel-checks, soft-habit-completions, mind-checks, weekly-reflections
 *    - human-health:connected-sleep-context
 * 
 * 2. Connected health (repository.ts IndexedDB):
 *    - Database: human-health-connected
 *      - Store: observations (health metrics)
 *      - Store: sources (Apple Health, etc.)
 *      - Store: meta (preferences)
 * 
 * 3. Platform/preventive health (platform/storage.ts localStorage):
 *    - human-health:platform:v1 (preventive care records and reminders)
 * 
 * 4. Service worker caches (sw.js):
 *    - human-health-v* (app shell for offline access; no user data)
 */
export type CompleteDeletionOperations = {
  clearTraining(): boolean | Promise<boolean>;
  trainingError?(): string | null;
  clearConnected(): void | Promise<void>;
  clearPlatform(): boolean | Promise<boolean>;
  platformError?(): string | null;
  clearCaches?(): void | Promise<void>;
};

/**
 * A user-requested delete-all is privacy-directed: attempt every domain even if
 * another domain fails. Successfully deleted data is never recreated merely to
 * make the operation transactional. Partial failures are reported truthfully so
 * the user can retry the remaining cleanup.
 */
export async function runCompleteDeletion(operations: CompleteDeletionOperations) {
  const failures: string[] = [];

  try {
    if (!(await operations.clearTraining())) failures.push(`training: ${operations.trainingError?.() || 'local training data could not be fully deleted'}`);
  } catch (error) {
    failures.push(`training: ${error instanceof Error ? error.message : 'local training data deletion failed'}`);
  }

  try {
    await operations.clearConnected();
  } catch (error) {
    failures.push(`connected health: ${error instanceof Error ? error.message : 'connected-health data deletion failed'}`);
  }

  try {
    if (!(await operations.clearPlatform())) failures.push(`preventive/platform: ${operations.platformError?.() || 'preventive/platform data could not be fully deleted'}`);
  } catch (error) {
    failures.push(`preventive/platform: ${error instanceof Error ? error.message : 'preventive/platform data deletion failed'}`);
  }

  if (operations.clearCaches) {
    try {
      await operations.clearCaches();
    } catch (error) {
      failures.push(`service worker caches: ${error instanceof Error ? error.message : 'cache deletion failed'}`);
    }
  }

  if (failures.length) {
    throw new Error(`Delete-all was incomplete. ${failures.join(' | ')}. Successfully deleted domains were not restored; retry delete-all after resolving the reported storage failure.`);
  }
}

async function clearServiceWorkerCaches() {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  const humanHealthCaches = keys.filter(key => key.startsWith('human-health-'));
  await Promise.all(humanHealthCaches.map(key => caches.delete(key)));
}

export async function clearAllHumanHealthData() {
  // Do not require a readable/exportable backup before honoring deletion.
  // Corrupt connected-health or platform rows must remain deletable.
  await runCompleteDeletion({
    clearTraining: () => store.clearAll(),
    trainingError: () => store.getMutationError(),
    clearConnected: () => healthRepository.clearAll(),
    clearPlatform: () => platformStore.clear(),
    platformError: () => platformStore.getMutationError(),
    clearCaches: clearServiceWorkerCaches,
  });
}

export function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
