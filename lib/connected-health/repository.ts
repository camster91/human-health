import { notifyConnectedHealthUpdated } from './events';
import { assertConnectedHealthRelationships } from './integrity';
import { parseConnectedPreferences, parseConnectedSourceState } from './import/canonical-json';
import { mergeObservationCollections, normalizeObservation } from './merge';
import {
  ConnectedHealthPreferences,
  ConnectedMetric,
  HealthObservation,
  HealthRepositoryExport,
  HealthSourceState,
  HealthSyncBatch,
} from './types';

const DATABASE_NAME = 'human-health-connected';
const DATABASE_VERSION = 1;
const OBSERVATIONS = 'observations';
const SOURCES = 'sources';
const META = 'meta';
const PREFERENCES_KEY = 'preferences';

export type ConnectedHealthRecoverySnapshot = {
  schemaVersion: 1;
  observations: unknown[];
  sources: unknown[];
  meta: unknown[];
};

function request<T>(value: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error || new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;
function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Connected health storage is unavailable in this browser.'));
      return;
    }
    const open = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    open.onupgradeneeded = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains(OBSERVATIONS)) {
        const observations = database.createObjectStore(OBSERVATIONS, { keyPath: 'id' });
        observations.createIndex('sourceId', 'sourceId', { unique: false });
        observations.createIndex('metric', 'metric', { unique: false });
        observations.createIndex('recordedAt', 'recordedAt', { unique: false });
      }
      if (!database.objectStoreNames.contains(SOURCES)) database.createObjectStore(SOURCES, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(META)) database.createObjectStore(META, { keyPath: 'key' });
    };
    open.onsuccess = () => {
      const database = open.result;
      database.onversionchange = () => { database.close(); databasePromise = null; };
      resolve(database);
    };
    open.onerror = () => { databasePromise = null; reject(open.error || new Error('Connected health database could not be opened.')); };
    open.onblocked = () => { databasePromise = null; reject(new Error('Connected health database upgrade is blocked by another tab.')); };
  });
  return databasePromise;
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();
  return request(database.transaction(storeName, 'readonly').objectStore(storeName).getAll()) as Promise<T[]>;
}

async function putMany<T>(storeName: string, values: T[]) {
  if (!values.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(storeName);
  values.forEach(value => store.put(value));
  await done;
}

async function writeRepositoryState(observations: HealthObservation[], sources: HealthSourceState[], preferences: ConnectedHealthPreferences) {
  // This is the final connected-health write boundary. Validate the combined graph
  // immediately before mutation so a merge cannot replace source metadata in a way
  // that invalidates already-stored observations.
  assertConnectedHealthRelationships(observations, sources);
  const database = await openDatabase();
  const transaction = database.transaction([OBSERVATIONS, SOURCES, META], 'readwrite');
  const done = transactionDone(transaction);
  const observationStore = transaction.objectStore(OBSERVATIONS);
  const sourceStore = transaction.objectStore(SOURCES);
  const metaStore = transaction.objectStore(META);
  observationStore.clear();
  sourceStore.clear();
  metaStore.delete(PREFERENCES_KEY);
  observations.forEach(value => observationStore.put(value));
  sources.forEach(value => sourceStore.put(value));
  metaStore.put({ key: PREFERENCES_KEY, value: preferences });
  await done;
  notifyConnectedHealthUpdated();
}

async function captureRecoverySnapshot(): Promise<ConnectedHealthRecoverySnapshot> {
  const database = await openDatabase();
  const transaction = database.transaction([OBSERVATIONS, SOURCES, META], 'readonly');
  const done = transactionDone(transaction);
  const observationsRequest = request(transaction.objectStore(OBSERVATIONS).getAll()) as Promise<unknown[]>;
  const sourcesRequest = request(transaction.objectStore(SOURCES).getAll()) as Promise<unknown[]>;
  const metaRequest = request(transaction.objectStore(META).getAll()) as Promise<unknown[]>;
  const [observations, sources, meta] = await Promise.all([observationsRequest, sourcesRequest, metaRequest]);
  await done;
  return { schemaVersion: 1, observations, sources, meta };
}

async function restoreRecoverySnapshot(snapshot: ConnectedHealthRecoverySnapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.observations) || !Array.isArray(snapshot.sources) || !Array.isArray(snapshot.meta)) {
    throw new Error('Connected-health recovery snapshot is invalid.');
  }
  const database = await openDatabase();
  const transaction = database.transaction([OBSERVATIONS, SOURCES, META], 'readwrite');
  const done = transactionDone(transaction);
  const observationStore = transaction.objectStore(OBSERVATIONS);
  const sourceStore = transaction.objectStore(SOURCES);
  const metaStore = transaction.objectStore(META);
  observationStore.clear();
  sourceStore.clear();
  metaStore.clear();
  snapshot.observations.forEach(value => observationStore.put(value));
  snapshot.sources.forEach(value => sourceStore.put(value));
  snapshot.meta.forEach(value => metaStore.put(value));
  await done;
  notifyConnectedHealthUpdated();
}

function rawString(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate : undefined;
}

export function storedRowBelongsToSource(value: unknown, sourceId: string) {
  const rowSourceId = rawString(value, 'sourceId');
  if (rowSourceId === sourceId) return true;
  const id = rawString(value, 'id');
  return Boolean(id?.startsWith(`${sourceId}:`));
}

export function normalizeStoredObservationRows(values: unknown[], sourceId?: string) {
  const observations: HealthObservation[] = [];
  let invalidCount = 0;
  const invalidSourceIds = new Set<string>();

  for (const raw of values) {
    const rawSourceId = rawString(raw, 'sourceId');
    if (sourceId && rawSourceId && rawSourceId !== sourceId && !storedRowBelongsToSource(raw, sourceId)) continue;
    const normalized = normalizeObservation(raw as HealthObservation);
    if (!normalized) {
      if (!sourceId || !rawSourceId || rawSourceId === sourceId || storedRowBelongsToSource(raw, sourceId)) {
        invalidCount++;
        if (rawSourceId) invalidSourceIds.add(rawSourceId);
      }
      continue;
    }
    if (!sourceId || normalized.sourceId === sourceId) observations.push(normalized);
  }

  return { observations, invalidCount, invalidSourceIds: [...invalidSourceIds].sort() };
}

function corruptRowsError(invalidCount: number, sourceIds: string[]) {
  const sources = sourceIds.length ? ` Affected source IDs: ${sourceIds.join(', ')}.` : ' At least one invalid row has no trustworthy source ownership.';
  return new Error(`Connected-health storage contains ${invalidCount} invalid observation row${invalidCount === 1 ? '' : 's'}. Invalid rows were not used as health context or exported.${sources} Delete the affected source or use complete local-data deletion before relying on connected-health summaries.`);
}

function sourceStorageError(error: unknown) {
  const detail = error instanceof Error ? ` ${error.message}` : '';
  return new Error(`Connected-health source storage is corrupt or unsupported and was not trusted.${detail}`);
}

function preferencesStorageError(error: unknown) {
  const detail = error instanceof Error ? ` ${error.message}` : '';
  return new Error(`Connected-health preference storage is corrupt or unsupported and was not trusted.${detail}`);
}

function observationIsNewer(current: HealthObservation, candidate: HealthObservation) {
  const currentVersion = current.provenance.externalVersion;
  const candidateVersion = candidate.provenance.externalVersion;
  if (typeof currentVersion === 'number' || typeof candidateVersion === 'number') return (candidateVersion ?? 0) >= (currentVersion ?? 0);
  return Date.parse(candidate.provenance.importedAt) >= Date.parse(current.provenance.importedAt);
}

async function existingByIds(ids: string[]) {
  if (!ids.length) return new Map<string, HealthObservation>();
  const database = await openDatabase();
  const transaction = database.transaction(OBSERVATIONS, 'readonly');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(OBSERVATIONS);
  const values = await Promise.all(ids.map(id => request(store.get(id)) as Promise<unknown>));
  await done;
  const normalized = values.flatMap(value => {
    const observation = normalizeObservation(value as HealthObservation);
    return observation ? [observation] : [];
  });
  return new Map(normalized.map(value => [value.id, value]));
}

async function deleteObservationIds(ids: string[]) {
  if (!ids.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(OBSERVATIONS, 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(OBSERVATIONS);
  ids.forEach(id => store.delete(id));
  await done;
}

export const healthRepository = {
  async available() {
    try { await openDatabase(); return true; } catch { return false; }
  },

  captureRecoverySnapshot,
  restoreRecoverySnapshot,

  async listObservations(query: { metrics?: ConnectedMetric[]; sourceId?: string; startTime?: string; endTime?: string } = {}) {
    const rawValues = await getAll<unknown>(OBSERVATIONS);
    const { observations, invalidCount, invalidSourceIds } = normalizeStoredObservationRows(rawValues, query.sourceId);
    if (invalidCount) throw corruptRowsError(invalidCount, invalidSourceIds);

    const start = query.startTime ? Date.parse(query.startTime) : Number.NEGATIVE_INFINITY;
    const end = query.endTime ? Date.parse(query.endTime) : Number.POSITIVE_INFINITY;
    if ((query.startTime && !Number.isFinite(start)) || (query.endTime && !Number.isFinite(end))) throw new Error('Connected-health observation query contains an invalid time boundary.');
    if (start > end) throw new Error('Connected-health observation query start time is after its end time.');

    return observations
      .filter(item => (!query.metrics || query.metrics.includes(item.metric)) && Date.parse(item.startTime) <= end && Date.parse(item.endTime || item.startTime) >= start)
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || a.id.localeCompare(b.id));
  },

  async listSources() {
    const raw = await getAll<unknown>(SOURCES);
    try { return raw.map(parseConnectedSourceState).sort((a, b) => a.displayName.localeCompare(b.displayName)); }
    catch (error) { throw sourceStorageError(error); }
  },

  async getSource(id: string) {
    const database = await openDatabase();
    const value = await request(database.transaction(SOURCES, 'readonly').objectStore(SOURCES).get(id)) as unknown;
    if (value === undefined) return null;
    try { return parseConnectedSourceState(value); }
    catch (error) { throw sourceStorageError(error); }
  },

  async saveSource(source: HealthSourceState) {
    const strict = parseConnectedSourceState(source);
    await putMany(SOURCES, [strict]);
    notifyConnectedHealthUpdated();
  },

  async upsertBatch(sourceId: string, batch: HealthSyncBatch) {
    const normalized = batch.observations.flatMap(item => {
      const value = normalizeObservation(item);
      return value && value.sourceId === sourceId ? [value] : [];
    });
    const existing = await existingByIds(normalized.map(item => item.id));
    const accepted = normalized.filter(item => {
      const current = existing.get(item.id);
      return !current || observationIsNewer(current, item);
    });
    await putMany(OBSERVATIONS, accepted);

    let deleted = 0;
    if (batch.deletedExternalIds.length) {
      const sourceObservations = await healthRepository.listObservations({ sourceId });
      const deletedSet = new Set(batch.deletedExternalIds.filter(value => typeof value === 'string' && value.length > 0));
      const ids = sourceObservations.filter(item => deletedSet.has(item.provenance.externalId) || [...deletedSet].some(externalId => item.provenance.externalId.startsWith(`${externalId}:`))).map(item => item.id);
      deleted = ids.length;
      await deleteObservationIds(ids);
    }
    notifyConnectedHealthUpdated();
    return { accepted: accepted.length, rejected: batch.observations.length - normalized.length, deleted };
  },

  async replaceObservations(observations: HealthObservation[]) {
    const merged = mergeObservationCollections([], observations);
    const database = await openDatabase();
    const transaction = database.transaction(OBSERVATIONS, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(OBSERVATIONS);
    store.clear();
    merged.observations.forEach(item => store.put(item));
    await done;
    notifyConnectedHealthUpdated();
    return merged;
  },

  async getPreferences(): Promise<ConnectedHealthPreferences> {
    const database = await openDatabase();
    const row = await request(database.transaction(META, 'readonly').objectStore(META).get(PREFERENCES_KEY)) as unknown;
    if (row === undefined) return parseConnectedPreferences(undefined);
    if (!row || typeof row !== 'object' || Array.isArray(row) || !Object.prototype.hasOwnProperty.call(row, 'value')) throw preferencesStorageError(new Error('Stored preferences row is malformed.'));
    try { return parseConnectedPreferences((row as { value: unknown }).value); }
    catch (error) { throw preferencesStorageError(error); }
  },

  async savePreferences(preferences: ConnectedHealthPreferences) {
    const strict = parseConnectedPreferences(preferences);
    const database = await openDatabase();
    const transaction = database.transaction(META, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(META).put({ key: PREFERENCES_KEY, value: strict });
    await done;
    notifyConnectedHealthUpdated();
  },

  async deleteSource(sourceId: string) {
    const rawObservations = await getAll<unknown>(OBSERVATIONS);
    const ids = rawObservations.flatMap(value => {
      if (!storedRowBelongsToSource(value, sourceId)) return [];
      const id = rawString(value, 'id');
      return id ? [id] : [];
    });
    const database = await openDatabase();
    const transaction = database.transaction([OBSERVATIONS, SOURCES], 'readwrite');
    const done = transactionDone(transaction);
    const observationStore = transaction.objectStore(OBSERVATIONS);
    ids.forEach(id => observationStore.delete(id));
    transaction.objectStore(SOURCES).delete(sourceId);
    await done;
    notifyConnectedHealthUpdated();
  },

  async clearAll() {
    const database = await openDatabase();
    const transaction = database.transaction([OBSERVATIONS, SOURCES, META], 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(OBSERVATIONS).clear();
    transaction.objectStore(SOURCES).clear();
    transaction.objectStore(META).clear();
    await done;
    notifyConnectedHealthUpdated();
  },

  async exportData(): Promise<HealthRepositoryExport> {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      observations: await healthRepository.listObservations(),
      sources: await healthRepository.listSources(),
      preferences: await healthRepository.getPreferences(),
    };
  },

  async importData(payload: HealthRepositoryExport, mode: 'merge' | 'replace' = 'merge') {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.observations) || !Array.isArray(payload.sources)) throw new Error('Unsupported connected-health archive.');
    const observations = payload.observations.flatMap(item => { const value = normalizeObservation(item); return value ? [value] : []; });
    if (observations.length !== payload.observations.length) throw new Error(`${payload.observations.length - observations.length} connected-health observations were invalid. No local data was changed.`);
    if (new Set(observations.map(item => item.id)).size !== observations.length) throw new Error('Connected-health archive contains duplicate observation identities. No local data was changed.');
    const sources = payload.sources.map(parseConnectedSourceState);
    if (new Set(sources.map(source => source.id)).size !== sources.length) throw new Error('Connected-health archive contains duplicate source identities. No local data was changed.');
    assertConnectedHealthRelationships(observations, sources);
    const importedPreferences = parseConnectedPreferences(payload.preferences);

    if (mode === 'replace') {
      await writeRepositoryState(observations, sources, importedPreferences);
      return { accepted: observations.length, rejected: 0 };
    }

    const currentObservations = await healthRepository.listObservations();
    const currentSources = await healthRepository.listSources();
    const currentPreferences = await healthRepository.getPreferences();
    const merged = mergeObservationCollections(currentObservations, observations);
    const sourceMap = new Map(currentSources.map(source => [source.id, source]));
    sources.forEach(source => sourceMap.set(source.id, source));
    // Merge import keeps the user's current preference choices. Replace import restores the archive's choices.
    await writeRepositoryState(merged.observations, [...sourceMap.values()], currentPreferences);
    return { accepted: merged.accepted, rejected: merged.rejected };
  },
};
