import { notifyConnectedHealthUpdated } from './events';
import { mergeObservationCollections, normalizeConnectedPreferences, normalizeObservation, normalizeSourceState } from './merge';
import {
  ConnectedHealthPreferences,
  ConnectedMetric,
  HealthObservation,
  HealthRepositoryExport,
  HealthSourceState,
  HealthSyncBatch,
  defaultConnectedHealthPreferences,
} from './types';

const DATABASE_NAME = 'human-health-connected';
const DATABASE_VERSION = 1;
const OBSERVATIONS = 'observations';
const SOURCES = 'sources';
const META = 'meta';
const PREFERENCES_KEY = 'preferences';

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
    open.onsuccess = () => resolve(open.result);
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
  const store = transaction.objectStore(storeName);
  values.forEach(value => store.put(value));
  await transactionDone(transaction);
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
  const store = transaction.objectStore(OBSERVATIONS);
  const values = await Promise.all(ids.map(id => request(store.get(id)) as Promise<HealthObservation | undefined>));
  await transactionDone(transaction);
  return new Map(values.filter(Boolean).map(value => [value!.id, value!]));
}

async function deleteObservationIds(ids: string[]) {
  if (!ids.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(OBSERVATIONS, 'readwrite');
  const store = transaction.objectStore(OBSERVATIONS);
  ids.forEach(id => store.delete(id));
  await transactionDone(transaction);
}

export const healthRepository = {
  async available() {
    try { await openDatabase(); return true; } catch { return false; }
  },

  async listObservations(query: { metrics?: ConnectedMetric[]; sourceId?: string; startTime?: string; endTime?: string } = {}) {
    const values = await getAll<HealthObservation>(OBSERVATIONS);
    const start = query.startTime ? Date.parse(query.startTime) : Number.NEGATIVE_INFINITY;
    const end = query.endTime ? Date.parse(query.endTime) : Number.POSITIVE_INFINITY;
    return values
      .filter(item => (!query.metrics || query.metrics.includes(item.metric)) && (!query.sourceId || item.sourceId === query.sourceId) && Date.parse(item.startTime) <= end && Date.parse(item.endTime || item.startTime) >= start)
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || a.id.localeCompare(b.id));
  },

  async listSources() {
    return (await getAll<HealthSourceState>(SOURCES)).map(normalizeSourceState).sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  async getSource(id: string) {
    const database = await openDatabase();
    const value = await request(database.transaction(SOURCES, 'readonly').objectStore(SOURCES).get(id)) as HealthSourceState | undefined;
    return value ? normalizeSourceState(value) : null;
  },

  async saveSource(source: HealthSourceState) {
    await putMany(SOURCES, [normalizeSourceState(source)]);
    notifyConnectedHealthUpdated();
  },

  async upsertBatch(sourceId: string, batch: HealthSyncBatch) {
    const normalized = batch.observations.flatMap(item => {
      const value = normalizeObservation(item);
      return value ? [value] : [];
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
      const deletedSet = new Set(batch.deletedExternalIds);
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
    const store = transaction.objectStore(OBSERVATIONS);
    store.clear();
    merged.observations.forEach(item => store.put(item));
    await transactionDone(transaction);
    notifyConnectedHealthUpdated();
    return merged;
  },

  async getPreferences(): Promise<ConnectedHealthPreferences> {
    const database = await openDatabase();
    const value = await request(database.transaction(META, 'readonly').objectStore(META).get(PREFERENCES_KEY)) as { key: string; value: Partial<ConnectedHealthPreferences> } | undefined;
    return normalizeConnectedPreferences(value?.value || defaultConnectedHealthPreferences);
  },

  async savePreferences(preferences: ConnectedHealthPreferences) {
    const database = await openDatabase();
    const transaction = database.transaction(META, 'readwrite');
    transaction.objectStore(META).put({ key: PREFERENCES_KEY, value: normalizeConnectedPreferences(preferences) });
    await transactionDone(transaction);
    notifyConnectedHealthUpdated();
  },

  async deleteSource(sourceId: string) {
    const observations = await healthRepository.listObservations({ sourceId });
    const database = await openDatabase();
    const transaction = database.transaction([OBSERVATIONS, SOURCES], 'readwrite');
    const observationStore = transaction.objectStore(OBSERVATIONS);
    observations.forEach(item => observationStore.delete(item.id));
    transaction.objectStore(SOURCES).delete(sourceId);
    await transactionDone(transaction);
    notifyConnectedHealthUpdated();
  },

  async clearAll() {
    const database = await openDatabase();
    const transaction = database.transaction([OBSERVATIONS, SOURCES, META], 'readwrite');
    transaction.objectStore(OBSERVATIONS).clear();
    transaction.objectStore(SOURCES).clear();
    transaction.objectStore(META).clear();
    await transactionDone(transaction);
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
    const sources = payload.sources.map(normalizeSourceState);
    const preferences = normalizeConnectedPreferences(payload.preferences);
    if (mode === 'replace') await healthRepository.clearAll();
    const current = mode === 'replace' ? [] : await healthRepository.listObservations();
    const merged = mergeObservationCollections(current, observations);
    await healthRepository.replaceObservations(merged.observations);
    await putMany(SOURCES, sources);
    await healthRepository.savePreferences(preferences);
    notifyConnectedHealthUpdated();
    return { accepted: observations.length, rejected: payload.observations.length - observations.length };
  },
};
