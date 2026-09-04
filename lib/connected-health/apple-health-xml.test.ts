import { describe, expect, it } from 'vitest';
import { parseAppleHealthDate, parseAppleHealthXmlText, parseXmlAttributes } from './import/apple-health-xml';

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
    expect(report.unsupportedTypes.HKQuantityTypeIdentifierUnknown).toBe(1);
    expect(new Set(report.observations.map(item => item.id)).size).toBe(report.observations.length);
  });

  it('skips malformed supported values instead of guessing', () => {
    const report = parseAppleHealthXmlText('<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Phone" unit="count" startDate="bad" value="not-a-number"/>');
    expect(report.observations).toEqual([]);
    expect(report.skippedTags).toBe(1);
  });
});
