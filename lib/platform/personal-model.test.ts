import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import type { HumanHealthExport } from '../storage';
import { createPersonalModelSnapshot, personalModelPolicy } from './personal-model';

function emptyTraining(): HumanHealthExport {
  return { schemaVersion: 2, exportedAt: '2026-09-03T12:00:00Z', activeWorkout: null, restTimer: null, history: [], activity: [], readiness: [], skills: {}, assessments: [], progressions: {}, skillAssessments: [], preferences: defaultPreferences, scheduleEvents: [] };
}

describe('privacy-preserving personal model', () => {
  it('is device-only and does not enable medical prediction or sharing', () => {
    expect(personalModelPolicy.location).toBe('device-only');
    expect(personalModelPolicy.automaticSharing).toBe(false);
    expect(personalModelPolicy.medicalPrediction).toBe(false);
  });

  it('creates an explicit descriptive baseline without inferring missing activity', () => {
    const snapshot = createPersonalModelSnapshot(emptyTraining(), new Date('2026-09-03T12:00:00Z'));
    expect(snapshot.location).toBe('device-only');
    expect(snapshot.trainingSessions).toBe(0);
    expect(snapshot.plannedCardioMinutes).toBe(0);
    expect(snapshot.limitations.join(' ')).toContain('not a clinical prediction');
  });
});
