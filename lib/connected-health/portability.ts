import { createEmptyPlatformData, platformStore, validatePlatformData, type PlatformLocalData } from '../platform/storage';
import { HumanHealthExport, store, validateTrainingExport } from '../storage';
import { preflightTrainingStorage } from '../training-storage-preflight';
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
  if (error) throw new Error(`Phase 5 platform data cannot be safely included in a complete archive: ${error}`);
  return platform;
}

export async function createFullHealthArchive(): Promise<FullHealthArchive> {
  const preflight = preflightTrainingStorage({ blockPendingFinalization: true });
  if (preflight.errors.length) throw new Error(`Complete training export refused: ${preflight.errors.join(' | ')}`);
  const platform = readablePlatformSnapshot();
  return {
    format: 'human-health-full-export', schemaVersion: 2, exportedAt: new Date().toISOString(),
    training: store.exportCompleteData(), connected: await healthRepository.exportData(), platform,
  };
}

export async function createConnectedHealthJson() { return createConnectedJsonEnvelope(await healthRepository.exportData()); }

function parseFullArchiveExportedAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Human Health full archive has an invalid exportedAt timestamp.');
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error('Human Health full archive has an invalid exportedAt timestamp.');
  return new Date(parsed).toISOString();
}

export function parseFullHealthArchive(text: string): FullHealthArchive {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Human Health archive is not valid JSON.'); }
  const archive = value as { format?: unknown; schemaVersion?: unknown; exportedAt?: unknown; training?: unknown; connected?: unknown; platform?: unknown };
  if (archive.format !== 'human-health-full-export' || (archive.schemaVersion !== 1 && archive.schemaVersion !== 2) || !archive.training || !archive.connected) throw new Error('Unsupported Human Health full archive.');
  return {
    format: 'human-health-full-export', schemaVersion: 2,
    exportedAt: parseFullArchiveExportedAt(archive.exportedAt),
    training: validateTrainingExport(archive.training),
    connected: parseConnectedJson(JSON.stringify(archive.connected)),
    platform: archive.schemaVersion === 2 ? validatePlatformData(archive.platform) : createEmptyPlatformData(),
  };
}

export type FullArchiveMutationOperations = {
  importTraining(): void | Promise<void>;
  importConnected(): void | Promise<void>;
  importPlatform(): void | Promise<void>;
  restoreTraining(): boolean | Promise<boolean>;
  trainingRollbackError?(): string | null;
  restoreConnected(): void | Promise<void>;
  restorePlatform(): boolean | Promise<boolean>;
  platformRollbackError?(): string | null;
};

/**
 * Apply the three persisted archive domains in order. After a mutation failure,
 * restore only domains whose import step was actually attempted: an attempted
 * write may have partially mutated before throwing, while untouched later
 * domains must never be rewritten merely because an earlier domain failed.
 * Rollback failures remain distinct from the original import failure.
 */
export async function runFullArchiveMutation(operations: FullArchiveMutationOperations) {
  let attemptedTraining = false;
  let attemptedConnected = false;
  let attemptedPlatform = false;

  try {
    attemptedTraining = true;
    await operations.importTraining();
    attemptedConnected = true;
    await operations.importConnected();
    attemptedPlatform = true;
    await operations.importPlatform();
  } catch (error) {
    const rollbackFailures: string[] = [];

    if (attemptedTraining) {
      try {
        if (!(await operations.restoreTraining())) rollbackFailures.push(`training: ${operations.trainingRollbackError?.() || 'rollback failed'}`);
      } catch (failure) { rollbackFailures.push(`training: ${failure instanceof Error ? failure.message : 'rollback failed'}`); }
    }

    if (attemptedConnected) {
      try { await operations.restoreConnected(); }
      catch (failure) { rollbackFailures.push(`connected health: ${failure instanceof Error ? failure.message : 'rollback failed'}`); }
    }

    if (attemptedPlatform) {
      try {
        if (!(await operations.restorePlatform())) rollbackFailures.push(`preventive/platform: ${operations.platformRollbackError?.() || 'rollback failed'}`);
      } catch (failure) { rollbackFailures.push(`preventive/platform: ${failure instanceof Error ? failure.message : 'rollback failed'}`); }
    }

    if (rollbackFailures.length) {
      const original = error instanceof Error ? error.message : 'Archive import failed.';
      throw new Error(`${original} Automatic rollback also failed: ${rollbackFailures.join(' | ')}`);
    }
    throw error;
  }
}

export async function importFullHealthArchive(text: string, mode: 'merge' | 'replace' = 'merge') {
  const archive = parseFullHealthArchive(text);
  // Preserve exact raw local state before mutation. Recovery snapshots are not
  // user-facing exports and therefore may contain legacy/corrupt bytes/rows that
  // normal complete export correctly refuses to treat as trusted health data.
  // If any raw snapshot cannot be captured, fail before mutating another domain.
  const trainingBackup = store.captureRecoverySnapshot();
  const connectedBackup = await healthRepository.captureRecoverySnapshot();
  const platformBackup = platformStore.captureRecoverySnapshot();

  await runFullArchiveMutation({
    importTraining: () => { store.importData(archive.training, mode); },
    importConnected: () => healthRepository.importData(archive.connected, mode).then(() => undefined),
    importPlatform: () => { platformStore.importData(archive.platform, mode); },
    restoreTraining: () => store.restoreRecoverySnapshot(trainingBackup),
    trainingRollbackError: () => store.getMutationError(),
    restoreConnected: () => healthRepository.restoreRecoverySnapshot(connectedBackup),
    restorePlatform: () => platformStore.restoreRecoverySnapshot(platformBackup),
    platformRollbackError: () => platformStore.getMutationError(),
  });
  return archive;
}

export type CompleteDeletionOperations = {
  clearTraining(): boolean | Promise<boolean>;
  trainingError?(): string | null;
  clearConnected(): void | Promise<void>;
  clearPlatform(): boolean | Promise<boolean>;
  platformError?(): string | null;
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

  if (failures.length) {
    throw new Error(`Delete-all was incomplete. ${failures.join(' | ')}. Successfully deleted domains were not restored; retry delete-all after resolving the reported storage failure.`);
  }
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
  });
}

export function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
