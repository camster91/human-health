import { HumanHealthExport, store, validateTrainingExport } from '../storage';
import { createConnectedJsonEnvelope, parseConnectedJson } from './import/canonical-json';
import { healthRepository } from './repository';
import { HealthRepositoryExport } from './types';

export type FullHealthArchive = {
  format: 'human-health-full-export';
  schemaVersion: 1;
  exportedAt: string;
  training: HumanHealthExport;
  connected: HealthRepositoryExport;
};

export async function createFullHealthArchive(): Promise<FullHealthArchive> {
  return {
    format: 'human-health-full-export',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    training: store.exportData(),
    connected: await healthRepository.exportData(),
  };
}

export async function createConnectedHealthJson() {
  return createConnectedJsonEnvelope(await healthRepository.exportData());
}

export function parseFullHealthArchive(text: string): FullHealthArchive {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Human Health archive is not valid JSON.'); }
  const archive = value as Partial<FullHealthArchive>;
  if (archive.format !== 'human-health-full-export' || archive.schemaVersion !== 1 || !archive.training || !archive.connected) throw new Error('Unsupported Human Health full archive.');
  return {
    format: 'human-health-full-export',
    schemaVersion: 1,
    exportedAt: typeof archive.exportedAt === 'string' ? archive.exportedAt : new Date().toISOString(),
    training: validateTrainingExport(archive.training),
    connected: parseConnectedJson(JSON.stringify(archive.connected)),
  };
}

export async function importFullHealthArchive(text: string, mode: 'merge' | 'replace' = 'merge') {
  // Validate the complete archive before mutating either storage backend.
  const archive = parseFullHealthArchive(text);
  const trainingBackup = store.exportData();
  const connectedBackup = await healthRepository.exportData();
  try {
    store.importData(archive.training, mode);
    await healthRepository.importData(archive.connected, mode);
    return archive;
  } catch (error) {
    // Best-effort rollback keeps the two local stores from intentionally diverging.
    let rollbackError: unknown = null;
    try { store.importData(trainingBackup, 'replace'); } catch (failure) { rollbackError = failure; }
    try { await healthRepository.importData(connectedBackup, 'replace'); } catch (failure) { rollbackError ||= failure; }
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
  try {
    if (!store.clearAll()) throw new Error(store.getMutationError() || 'Training data could not be fully deleted.');
    await healthRepository.clearAll();
  } catch (error) {
    // Destructive all-data deletion should either complete across both local stores or
    // restore the prior snapshots as far as the browser storage backends allow.
    let rollbackError: unknown = null;
    try { store.importData(trainingBackup, 'replace'); } catch (failure) { rollbackError = failure; }
    try { await healthRepository.importData(connectedBackup, 'replace'); } catch (failure) { rollbackError ||= failure; }
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
