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
  const archive = parseFullHealthArchive(text);
  const trainingBackup = store.exportData();
  const connectedBackup = await healthRepository.exportData();
  try {
    store.importData(archive.training, mode);
    await healthRepository.importData(archive.connected, mode);
    return archive;
  } catch (error) {
    store.importData(trainingBackup, 'replace');
    await healthRepository.importData(connectedBackup, 'replace');
    throw error;
  }
}

export async function clearAllHumanHealthData() {
  store.clearAll();
  await healthRepository.clearAll();
}

export function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
