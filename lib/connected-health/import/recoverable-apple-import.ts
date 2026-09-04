import { healthRepository } from '../repository';
import type { HealthObservation, HealthSourceState } from '../types';
import { importAppleHealthXmlFile, type AppleHealthImportReport } from './apple-health-xml';
import { saveImportedSourceSummaries, type ImportedSourceSummary } from './source-state';

type ImportRepository = {
  listObservations(query: { sourceId?: string }): Promise<HealthObservation[]>;
  getSource(id: string): Promise<HealthSourceState | null>;
  upsertBatch(sourceId: string, batch: { observations: HealthObservation[]; deletedExternalIds: string[]; complete: boolean }): Promise<unknown>;
  deleteSource(sourceId: string): Promise<void>;
  saveSource(source: HealthSourceState): Promise<void>;
};

type Parser = (
  file: File,
  onBatch: (observations: HealthObservation[]) => Promise<void> | void,
  options?: { batchSize?: number; onProgress?: (parsedTags: number) => void; collectObservations?: boolean },
) => Promise<AppleHealthImportReport>;

export type RecoverableAppleImportOptions = {
  onProgress?: (parsedTags: number) => void;
  repository?: ImportRepository;
  parser?: Parser;
  saveSummaries?: (summaries: ImportedSourceSummary[]) => Promise<unknown>;
};

type SourceBackup = { observations: HealthObservation[]; source: HealthSourceState | null };

/**
 * Streams an Apple Health export without retaining the full parsed observation set,
 * while snapshotting only sources that are actually touched. If parsing, IndexedDB,
 * or source-state persistence fails after one or more batches, each touched source is
 * restored to its exact pre-import observation/source state before the error escapes.
 */
export async function importAppleHealthXmlRecoverably(file: File, options: RecoverableAppleImportOptions = {}) {
  const repository = options.repository || healthRepository;
  const parser = options.parser || importAppleHealthXmlFile;
  const saveSummaries = options.saveSummaries || saveImportedSourceSummaries;
  const backups = new Map<string, SourceBackup>();

  const ensureBackup = async (sourceId: string) => {
    if (backups.has(sourceId)) return;
    const [observations, source] = await Promise.all([
      repository.listObservations({ sourceId }),
      repository.getSource(sourceId),
    ]);
    backups.set(sourceId, { observations, source });
  };

  const rollback = async () => {
    const failures: string[] = [];
    for (const [sourceId, backup] of backups) {
      try {
        await repository.deleteSource(sourceId);
        if (backup.observations.length) {
          await repository.upsertBatch(sourceId, { observations: backup.observations, deletedExternalIds: [], complete: true });
        }
        if (backup.source) await repository.saveSource(backup.source);
      } catch (error) {
        failures.push(`${sourceId}: ${error instanceof Error ? error.message : 'rollback failed'}`);
      }
    }
    if (failures.length) throw new Error(failures.join(' | '));
  };

  try {
    const report = await parser(file, async batch => {
      const groups = new Map<string, HealthObservation[]>();
      batch.forEach(observation => groups.set(observation.sourceId, [...(groups.get(observation.sourceId) || []), observation]));
      for (const [sourceId, observations] of groups) {
        await ensureBackup(sourceId);
        await repository.upsertBatch(sourceId, { observations, deletedExternalIds: [], complete: true });
      }
    }, { onProgress: options.onProgress });
    await saveSummaries(report.sourceSummaries);
    return report;
  } catch (error) {
    const importMessage = error instanceof Error ? error.message : 'Apple Health import failed.';
    try {
      await rollback();
    } catch (rollbackError) {
      throw new Error(`${importMessage} Automatic rollback also failed: ${rollbackError instanceof Error ? rollbackError.message : 'unknown rollback error'}. Review the affected Apple Health sources before retrying.`);
    }
    throw new Error(`${importMessage} Any Apple Health batches written by this import were rolled back to their pre-import source state.`);
  }
}
