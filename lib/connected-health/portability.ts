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

export async function createFullHealthArchive(): Promise<FullHealthArchive> {
  return {
    format: 'human-health-full-export',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    training: store.exportData(),
    connected: await healthRepository.exportData(),
    platform: platformStore.exportData(),
  };
}

export async function createConnectedHealthJson() {
  return createConnectedJsonEnvelope(await healthRepository.exportData());
}

export function parseFullHealthArchive(text: string): FullHealthArchive {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Human Health archive is not valid JSON.'); }
  const archive = value as {
    format?: unknown;
    schemaVersion?: unknown;
    exportedAt?: unknown;
    training?: unknown;
    connected?: unknown;
    platform?: unknown;
  };
  if (archive.format !== 'human-health-full-export' || (archive.schemaVersion !== 1 && archive.schemaVersion !== 2) || !archive.training || !archive.connected) {
    throw new Error('Unsupported Human Health full archive.');
  }
  return {
    format: 'human-health-full-export',
    schemaVersion: 2,
    exportedAt: typeof archive.exportedAt === 'string' ? archive.exportedAt : new Date().toISOString(),
    training: validateTrainingExport(archive.training),
    connected: parseConnectedJson(JSON.stringify(archive.connected)),
    // Version 1 archives predate Phase 5 and therefore legitimately contain no
    // preventive/platform data. They import as an empty platform section.
    platform: archive.schemaVersion === 2 ? validatePlatformData(archive.platform) : createEmptyPlatformData(),
  };
}

export async function importFullHealthArchive(text: string, mode: 'merge' | 'replace' = 'merge') {
  // Validate every local backend before mutating any of them.
  const archive = parseFullHealthArchive(text);
  const trainingBackup = store.exportData();
  const connectedBackup = await healthRepository.exportData();
  const platformBackup = platformStore.exportData();
  try {
    store.importData(archive.training, mode);
    await healthRepository.importData(archive.connected, mode);
    platformStore.importData(archive.platform, mode);
    return archive;
  } catch (error) {
    // Best-effort rollback keeps the local stores from intentionally diverging.
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

export async function clearAllHumanHealthData() {
  const trainingBackup = store.exportData();
  const connectedBackup = await healthRepository.exportData();
  const platformBackup = platformStore.exportData();
  try {
    if (!store.clearAll()) throw new Error(store.getMutationError() || 'Training data could not be fully deleted.');
    await healthRepository.clearAll();
    if (!platformStore.clear()) throw new Error(platformStore.getMutationError() || 'Preventive/platform data could not be fully deleted.');
  } catch (error) {
    // Destructive all-data deletion should either complete across every local
    // store or restore the prior snapshots as far as the browser allows.
    let rollbackError: unknown = null;
    try { store.importData(trainingBackup, 'replace'); } catch (failure) { rollbackError = failure; }
    try { await healthRepository.importData(connectedBackup, 'replace'); } catch (failure) { rollbackError ||= failure; }
    try { platformStore.importData(platformBackup, 'replace'); } catch (failure) { rollbackError ||= failure; }
    if (rollbackError) {
      const original = error instanceof Error ? error.message : 'Local data deletion failed.';
      const rollback = rollbackError instanceof Error ? rollbackError.message : 'Rollback failed.';
      throw new Error(`${original} Automatic rollback also failed: ${rollback}`);
    }
    throw error;
  }
}

export function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
