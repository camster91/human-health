export const connectedMetrics = [
  'steps',
  'sleep-duration',
  'sleep-stage',
  'heart-rate',
  'resting-heart-rate',
  'cardio-fitness',
  'distance',
  'active-energy',
  'workout-duration',
  'water',
  'protein',
  'fibre',
  'fruit-vegetable-servings',
  'meal-quality',
] as const;

export type ConnectedMetric = typeof connectedMetrics[number];
export type CanonicalUnit = 'count' | 'minute' | 'bpm' | 'ml/kg/min' | 'km' | 'kcal' | 'ml' | 'g' | 'serving' | 'score';
export type HealthProvider = 'health-connect' | 'apple-health' | 'manual' | 'human-health-import';
export type IngestionMethod = 'native-sync' | 'file-import' | 'manual' | 'archive-import';
export type ObservationQuality = 'direct' | 'derived';
export type HealthSourceStatus = 'not-connected' | 'unavailable' | 'permission-required' | 'syncing' | 'current' | 'partial' | 'stale' | 'failed';
export type ObservationFreshness = 'current' | 'stale' | 'future' | 'invalid';

export type HealthProvenance = {
  provider: HealthProvider;
  ingestionMethod: IngestionMethod;
  sourceName: string;
  applicationId?: string;
  device?: string;
  originalType: string;
  originalUnit?: string;
  externalId: string;
  externalVersion?: number;
  importedAt: string;
};

export type HealthObservation = {
  id: string;
  sourceId: string;
  metric: ConnectedMetric;
  value: number;
  unit: CanonicalUnit;
  startTime: string;
  endTime?: string;
  recordedAt: string;
  timezoneOffsetMinutes?: number;
  quality: ObservationQuality;
  provenance: HealthProvenance;
  tags?: Record<string, string | number | boolean>;
};

export type HealthSourceState = {
  id: string;
  provider: HealthProvider;
  displayName: string;
  status: HealthSourceStatus;
  supportedMetrics: ConnectedMetric[];
  grantedMetrics: ConnectedMetric[];
  staleAfterMs: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  cursor?: string;
  error?: string;
  partialReason?: string;
  recordCount?: number;
};

export type HealthSyncRequest = {
  metrics: ConnectedMetric[];
  startTime: string;
  endTime: string;
  cursor?: string;
};

export type HealthSyncBatch = {
  observations: HealthObservation[];
  deletedExternalIds: string[];
  nextCursor?: string;
  complete: boolean;
  warnings?: string[];
};

export type AdapterAvailability = {
  available: boolean;
  permissionRequired: boolean;
  grantedMetrics: ConnectedMetric[];
  reason?: string;
};

export interface HealthDataAdapter {
  readonly sourceId: string;
  readonly provider: HealthProvider;
  readonly displayName: string;
  readonly supportedMetrics: ConnectedMetric[];
  availability(): Promise<AdapterAvailability>;
  requestPermissions(metrics: ConnectedMetric[]): Promise<AdapterAvailability>;
  read(request: HealthSyncRequest): Promise<HealthSyncBatch>;
  disconnect?(): Promise<void>;
}

export type HealthRepositoryExport = {
  schemaVersion: 1;
  exportedAt: string;
  observations: HealthObservation[];
  sources: HealthSourceState[];
  preferences: ConnectedHealthPreferences;
};

export type ConnectedHealthPreferences = {
  useFreshSleepForReadiness: boolean;
  stepTarget: number;
  waterTargetMl: number;
  proteinTargetG: number;
  fibreTargetG: number;
  fruitVegetableTarget: number;
  enabledHabits: ConnectedMetric[];
  primarySourceByMetric: Partial<Record<ConnectedMetric, string>>;
};

export const defaultConnectedHealthPreferences: ConnectedHealthPreferences = {
  useFreshSleepForReadiness: true,
  stepTarget: 8_000,
  waterTargetMl: 2_000,
  proteinTargetG: 100,
  fibreTargetG: 25,
  fruitVegetableTarget: 5,
  enabledHabits: ['water', 'protein', 'fibre', 'fruit-vegetable-servings', 'meal-quality'],
  primarySourceByMetric: {},
};

export type NativeBridgeRecord = {
  id: string;
  version?: number;
  type: string;
  metric?: ConnectedMetric;
  value?: number;
  unit?: string;
  startTime: string;
  endTime?: string;
  recordedAt?: string;
  timezoneOffsetMinutes?: number;
  dataOrigin?: string;
  sourceName?: string;
  device?: string;
  samples?: { value: number; time: string; unit?: string }[];
  metadata?: Record<string, string | number | boolean | null>;
};

export type NativeBridgeReadResponse = {
  records: NativeBridgeRecord[];
  deletedIds?: string[];
  nextCursor?: string;
  complete?: boolean;
  warnings?: string[];
};

export interface NativeHealthBridge {
  status(): Promise<{ available: boolean; grantedMetrics?: ConnectedMetric[]; reason?: string }>;
  requestPermissions(metrics: ConnectedMetric[]): Promise<{ grantedMetrics: ConnectedMetric[]; reason?: string }>;
  read(request: HealthSyncRequest): Promise<NativeBridgeReadResponse>;
  disconnect?(): Promise<void>;
}
