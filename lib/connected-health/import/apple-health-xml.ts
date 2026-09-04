import { convertToCanonical } from '../metrics';
import { observationId, stableHash } from '../merge';
import { ConnectedMetric, HealthObservation } from '../types';

export type AppleHealthImportReport = {
  observations: HealthObservation[];
  parsedTags: number;
  skippedTags: number;
  unsupportedTypes: Record<string, number>;
  warnings: string[];
};

const quantityTypes: Record<string, ConnectedMetric> = {
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierHeartRate: 'heart-rate',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting-heart-rate',
  HKQuantityTypeIdentifierVO2Max: 'cardio-fitness',
  HKQuantityTypeIdentifierDistanceWalkingRunning: 'distance',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'active-energy',
  HKQuantityTypeIdentifierDietaryWater: 'water',
  HKQuantityTypeIdentifierDietaryProtein: 'protein',
  HKQuantityTypeIdentifierDietaryFiber: 'fibre',
};

function decodeXml(value: string) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export function parseXmlAttributes(value: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) attributes[match[1]] = decodeXml(match[2]);
  return attributes;
}

export function parseAppleHealthDate(value?: string) {
  if (!value) return null;
  const normalized = value
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4')
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2');
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function durationMinutes(startTime: string, endTime: string) {
  return Math.max(0, (Date.parse(endTime) - Date.parse(startTime)) / 60_000);
}

function sourceIdFor(sourceName: string) {
  return `import:apple-health:${stableHash(sourceName || 'Apple Health')}`;
}

function buildObservation(options: {
  attributes: Record<string, string>;
  metric: ConnectedMetric;
  rawType: string;
  rawUnit?: string;
  rawValue: number;
  startTime: string;
  endTime?: string;
  importedAt: string;
  suffix?: string;
  tags?: Record<string, string | number | boolean>;
}): HealthObservation | null {
  const normalized = convertToCanonical(options.metric, options.rawValue, options.rawUnit);
  if (!normalized) return null;
  const sourceName = options.attributes.sourceName || 'Apple Health export';
  const sourceId = sourceIdFor(sourceName);
  const externalSeed = [options.rawType, sourceName, options.attributes.sourceVersion, options.attributes.device, options.startTime, options.endTime, options.rawValue, options.rawUnit, options.suffix].join('|');
  const externalId = `apple-export:${stableHash(externalSeed)}${options.suffix || ''}`;
  const recordedAt = parseAppleHealthDate(options.attributes.creationDate) || options.endTime || options.startTime;
  return {
    id: observationId(sourceId, externalId),
    sourceId,
    metric: options.metric,
    value: normalized.value,
    unit: normalized.unit,
    startTime: options.startTime,
    endTime: options.endTime,
    recordedAt,
    quality: 'direct',
    provenance: {
      provider: 'apple-health',
      ingestionMethod: 'file-import',
      sourceName,
      applicationId: options.attributes.sourceName,
      device: options.attributes.device,
      originalType: options.rawType,
      originalUnit: options.rawUnit,
      externalId,
      importedAt: options.importedAt,
    },
    tags: options.tags,
  };
}

function sleepStage(value: string) {
  const stage = value.replace('HKCategoryValueSleepAnalysis', '').replace(/^Asleep/, '').toLowerCase();
  if (value.includes('Awake')) return 'awake';
  if (value.includes('InBed')) return 'in-bed';
  if (value.includes('AsleepREM')) return 'rem';
  if (value.includes('AsleepDeep')) return 'deep';
  if (value.includes('AsleepCore')) return 'core';
  if (value.includes('Asleep')) return stage || 'asleep';
  return 'unknown';
}

function tagObservations(tagName: string, rawAttributes: string, importedAt: string) {
  const attributes = parseXmlAttributes(rawAttributes);
  const type = attributes.type || (tagName === 'Workout' ? 'HKWorkoutTypeIdentifier' : '');
  const startTime = parseAppleHealthDate(attributes.startDate);
  const endTime = parseAppleHealthDate(attributes.endDate);
  if (!startTime) return { observations: [] as HealthObservation[], supported: Boolean(quantityTypes[type] || type.includes('SleepAnalysis') || tagName === 'Workout'), invalid: true, type };

  if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
    if (!endTime) return { observations: [], supported: true, invalid: true, type };
    const stage = sleepStage(attributes.value || '');
    const observation = buildObservation({ attributes, metric: 'sleep-stage', rawType: type, rawUnit: 'minute', rawValue: durationMinutes(startTime, endTime), startTime, endTime, importedAt, suffix: `:${stage}`, tags: { stage } });
    return { observations: observation ? [observation] : [], supported: true, invalid: !observation, type };
  }

  if (tagName === 'Workout') {
    const observations: HealthObservation[] = [];
    const duration = Number(attributes.duration);
    const workout = buildObservation({ attributes, metric: 'workout-duration', rawType: type, rawUnit: attributes.durationUnit || 'minute', rawValue: Number.isFinite(duration) ? duration : endTime ? durationMinutes(startTime, endTime) : Number.NaN, startTime, endTime: endTime || undefined, importedAt, suffix: ':duration', tags: { activityType: attributes.workoutActivityType || 'unknown' } });
    if (workout) observations.push(workout);
    const distance = Number(attributes.totalDistance);
    if (Number.isFinite(distance)) {
      const value = buildObservation({ attributes, metric: 'distance', rawType: type, rawUnit: attributes.totalDistanceUnit || 'km', rawValue: distance, startTime, endTime: endTime || undefined, importedAt, suffix: ':distance', tags: { activityType: attributes.workoutActivityType || 'unknown' } });
      if (value) observations.push(value);
    }
    const energy = Number(attributes.totalEnergyBurned);
    if (Number.isFinite(energy)) {
      const value = buildObservation({ attributes, metric: 'active-energy', rawType: type, rawUnit: attributes.totalEnergyBurnedUnit || 'kcal', rawValue: energy, startTime, endTime: endTime || undefined, importedAt, suffix: ':energy', tags: { activityType: attributes.workoutActivityType || 'unknown' } });
      if (value) observations.push(value);
    }
    return { observations, supported: true, invalid: observations.length === 0, type };
  }

  const metric = quantityTypes[type];
  if (!metric) return { observations: [], supported: false, invalid: false, type };
  const rawValue = Number(attributes.value);
  const observation = buildObservation({ attributes, metric, rawType: type, rawUnit: attributes.unit, rawValue, startTime, endTime: endTime || undefined, importedAt });
  return { observations: observation ? [observation] : [], supported: true, invalid: !observation, type };
}

function parseCompleteXmlFragment(fragment: string, importedAt: string, report: AppleHealthImportReport, batch: HealthObservation[]) {
  const pattern = /<(Record|Workout)\b([^>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(fragment))) {
    report.parsedTags++;
    const parsed = tagObservations(match[1], match[2], importedAt);
    if (!parsed.supported) {
      report.unsupportedTypes[parsed.type || 'unknown'] = (report.unsupportedTypes[parsed.type || 'unknown'] || 0) + 1;
      continue;
    }
    if (parsed.invalid) report.skippedTags++;
    batch.push(...parsed.observations);
  }
}

export function parseAppleHealthXmlText(text: string, importedAt = new Date().toISOString()): AppleHealthImportReport {
  const report: AppleHealthImportReport = { observations: [], parsedTags: 0, skippedTags: 0, unsupportedTypes: {}, warnings: [] };
  parseCompleteXmlFragment(text, importedAt, report, report.observations);
  return report;
}

export async function importAppleHealthXmlFile(
  file: File,
  onBatch: (observations: HealthObservation[]) => Promise<void> | void,
  options: { batchSize?: number; onProgress?: (parsedTags: number) => void } = {},
): Promise<AppleHealthImportReport> {
  const importedAt = new Date().toISOString();
  const batchSize = Math.max(50, options.batchSize || 500);
  const report: AppleHealthImportReport = { observations: [], parsedTags: 0, skippedTags: 0, unsupportedTypes: {}, warnings: [] };
  let buffer = '';
  let pending: HealthObservation[] = [];
  const flush = async () => {
    if (!pending.length) return;
    const current = pending;
    pending = [];
    await onBatch(current);
    report.observations.push(...current);
  };
  const process = async (fragment: string) => {
    const parsed: HealthObservation[] = [];
    parseCompleteXmlFragment(fragment, importedAt, report, parsed);
    pending.push(...parsed);
    while (pending.length >= batchSize) {
      const current = pending.splice(0, batchSize);
      await onBatch(current);
      report.observations.push(...current);
    }
    options.onProgress?.(report.parsedTags);
  };

  if (file.stream) {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const boundary = buffer.lastIndexOf('>');
      if (boundary >= 0) {
        await process(buffer.slice(0, boundary + 1));
        buffer = buffer.slice(boundary + 1);
      } else if (buffer.length > 2_000_000) {
        throw new Error('Apple Health XML contains an unexpectedly large unterminated tag.');
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) await process(buffer);
  } else {
    await process(await file.text());
  }
  await flush();
  if (Object.keys(report.unsupportedTypes).length) report.warnings.push(`${Object.values(report.unsupportedTypes).reduce((sum, value) => sum + value, 0)} unsupported record tags were skipped.`);
  if (report.skippedTags) report.warnings.push(`${report.skippedTags} supported tags were malformed or had unusable values.`);
  return report;
}
