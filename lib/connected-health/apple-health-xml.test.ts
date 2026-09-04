import { describe, expect, it } from 'vitest';
import { importAppleHealthXmlFile, parseAppleHealthDate, parseAppleHealthXmlText, parseXmlAttributes } from './import/apple-health-xml';

describe('Apple Health XML import', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <HealthData>
    <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Cameron’s iPhone" unit="count" creationDate="2026-09-03 12:00:00 -0400" startDate="2026-09-03 11:00:00 -0400" endDate="2026-09-03 12:00:00 -0400" value="1200"/>
    <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" creationDate="2026-09-03 07:00:00 -0400" startDate="2026-09-03 01:00:00 -0400" endDate="2026-09-03 02:30:00 -0400" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
    <Workout workoutActivityType="HKWorkoutActivityTypeWalking" sourceName="Watch" duration="30" durationUnit="min" totalDistance="3.5" totalDistanceUnit="km" totalEnergyBurned="150" totalEnergyBurnedUnit="kcal" creationDate="2026-09-03 13:00:00 -0400" startDate="2026-09-03 12:00:00 -0400" endDate="2026-09-03 12:30:00 -0400"/>
    <Record type="HKQuantityTypeIdentifierUnknown" sourceName="Unknown" unit="count" startDate="2026-09-03 12:00:00 -0400" endDate="2026-09-03 12:01:00 -0400" value="1"/>
  </HealthData>`;

  it('parses Apple date and XML attributes without server processing', () => {
    expect(parseAppleHealthDate('2026-09-03 12:00:00 -0400')).toBe('2026-09-03T16:00:00.000Z');
    expect(parseXmlAttributes('type="Test" sourceName="A &amp; B"').sourceName).toBe('A & B');
  });

  it('maps supported records and reports unsupported types', () => {
    const report = parseAppleHealthXmlText(xml, '2026-09-04T00:00:00Z');
    expect(report.observations.some(item => item.metric === 'steps' && item.value === 1_200)).toBe(true);
    expect(report.observations.some(item => item.metric === 'sleep-stage' && item.tags?.stage === 'deep')).toBe(true);
    expect(report.observations.filter(item => ['workout-duration', 'distance', 'active-energy'].includes(item.metric))).toHaveLength(3);
    expect(report.importedCount).toBe(report.observations.length);
    expect(report.sourceSummaries.reduce((sum, source) => sum + source.count, 0)).toBe(report.importedCount);
    expect(report.unsupportedTypes.HKQuantityTypeIdentifierUnknown).toBe(1);
    expect(new Set(report.observations.map(item => item.id)).size).toBe(report.observations.length);
  });

  it('streams batches without retaining the complete observation array by default', async () => {
    const repeated = `<HealthData>${Array.from({ length: 120 }, (_, index) => `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Phone" unit="count" creationDate="2026-09-03 12:00:00 -0400" startDate="2026-09-03 11:${String(index % 60).padStart(2, '0')}:00 -0400" endDate="2026-09-03 11:${String(index % 60).padStart(2, '0')}:30 -0400" value="${index + 1}"/>`).join('')}</HealthData>`;
    const file = { stream: () => new Blob([repeated]).stream(), text: async () => repeated } as File;
    const batchSizes: number[] = [];
    const report = await importAppleHealthXmlFile(file, batch => { batchSizes.push(batch.length); }, { batchSize: 50 });
    expect(report.importedCount).toBe(120);
    expect(report.observations).toEqual([]);
    expect(batchSizes.reduce((sum, size) => sum + size, 0)).toBe(120);
    expect(Math.max(...batchSizes)).toBeLessThanOrEqual(50);
    expect(report.sourceSummaries).toHaveLength(1);
    expect(report.sourceSummaries[0].count).toBe(120);
  });

  it('skips malformed supported values instead of guessing', () => {
    const report = parseAppleHealthXmlText('<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Phone" unit="count" startDate="bad" value="not-a-number"/>');
    expect(report.observations).toEqual([]);
    expect(report.skippedTags).toBe(1);
  });
});
