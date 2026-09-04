import { describe, expect, it } from 'vitest';
import { mapNativeRecord } from './native-mapping';

describe('native connected-health mapping', () => {
  it('maps Health Connect heart-rate samples separately with provenance', () => {
    const values = mapNativeRecord('health-connect', 'native:health-connect', {
      id: 'hr-1',
      version: 3,
      type: 'HeartRateRecord',
      startTime: '2026-09-03T10:00:00Z',
      endTime: '2026-09-03T10:01:00Z',
      dataOrigin: 'com.example.watch',
      metadata: { ignoredNull: null, workout: true },
      samples: [
        { value: 100, time: '2026-09-03T10:00:00Z', unit: 'bpm' },
        { value: 110, time: '2026-09-03T10:00:30Z', unit: 'bpm' },
      ],
    });
    expect(values).toHaveLength(2);
    expect(new Set(values.map(item => item.id)).size).toBe(2);
    expect(values[0].provenance.externalVersion).toBe(3);
    expect(values[0].tags).toEqual({ workout: true });
  });

  it('keeps heart-rate sample IDs stable when a provider reorders the same samples', () => {
    const record = {
      id: 'hr-stable',
      version: 4,
      type: 'HeartRateRecord',
      startTime: '2026-09-03T10:00:00Z',
      endTime: '2026-09-03T10:01:00Z',
      samples: [
        { value: 100, time: '2026-09-03T10:00:00Z', unit: 'bpm' },
        { value: 110, time: '2026-09-03T10:00:30Z', unit: 'bpm' },
      ],
    };
    const first = mapNativeRecord('health-connect', 'native:health-connect', record);
    const second = mapNativeRecord('health-connect', 'native:health-connect', { ...record, samples: [...record.samples].reverse() });
    expect(first.map(item => item.id).sort()).toEqual(second.map(item => item.id).sort());
  });

  it('uses the same sample identity when a newer provider version corrects its value', () => {
    const original = mapNativeRecord('health-connect', 'native:health-connect', {
      id: 'hr-correction', version: 1, type: 'HeartRateRecord', startTime: '2026-09-03T10:00:00Z', samples: [{ value: 100, time: '2026-09-03T10:00:15Z', unit: 'bpm' }],
    })[0];
    const corrected = mapNativeRecord('health-connect', 'native:health-connect', {
      id: 'hr-correction', version: 2, type: 'HeartRateRecord', startTime: '2026-09-03T10:00:00Z', samples: [{ value: 104, time: '2026-09-03T10:00:15Z', unit: 'bpm' }],
    })[0];
    expect(corrected.id).toBe(original.id);
    expect(corrected.value).toBe(104);
    expect(corrected.provenance.externalVersion).toBe(2);
  });

  it('derives sleep-session and sleep-stage duration from time ranges', () => {
    const session = mapNativeRecord('health-connect', 'native:health-connect', { id: 'sleep-1', type: 'SleepSessionRecord', startTime: '2026-09-02T22:00:00Z', endTime: '2026-09-03T06:00:00Z' });
    const stage = mapNativeRecord('apple-health', 'native:apple-health', { id: 'stage-1', type: 'HKCategoryTypeIdentifierSleepAnalysis', startTime: '2026-09-03T01:00:00Z', endTime: '2026-09-03T02:00:00Z', metadata: { stage: 'deep' } });
    expect(session[0].metric).toBe('sleep-duration');
    expect(session[0].value).toBe(480);
    expect(stage[0].metric).toBe('sleep-stage');
    expect(stage[0].tags?.stage).toBe('deep');
  });

  it('maps nutrition fields independently and skips unsupported native records', () => {
    const values = mapNativeRecord('health-connect', 'native:health-connect', { id: 'nutrition-1', type: 'NutritionRecord', startTime: '2026-09-03T12:00:00Z', metadata: { water: 0.5, waterUnit: 'L', protein: 30, proteinUnit: 'g', fibre: 8, fibreUnit: 'g' } });
    expect(values.map(item => item.metric).sort()).toEqual(['fibre', 'protein', 'water']);
    expect(values.find(item => item.metric === 'water')?.value).toBe(500);
    expect(mapNativeRecord('health-connect', 'native:health-connect', { id: 'unknown', type: 'UnknownRecord', startTime: '2026-09-03T12:00:00Z' })).toEqual([]);
  });
});
