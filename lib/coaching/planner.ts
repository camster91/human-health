import type { ActivityDose, ReadinessRecord } from '../whole-person';
import type { HistoryEntry } from '../domain';
import type { UserPreferences } from '../preferences';
import { swapPreferenceKey } from '../preferences';
import { adaptWorkout } from '../engine';
import { recentTrainingLoad, strengthLoadAdjustment } from '../load-management';
import { buildSession, gyms } from '../program';
import { contextualRollingSession } from '../schedule';
import { readinessDecisionFromRecords } from '../whole-person';
import type { ConversationInterpretation } from './types';

export type ConversationPlanPreview = {
  blocked: boolean;
  session: string | null;
  gymName: string | null;
  mode: string | null;
  progressionAllowed: boolean;
  exercises: { id: string; name: string; sets: number; optional: boolean; originalId?: string }[];
  notes: string[];
};

export function previewConversationPlan(options: {
  interpretation: ConversationInterpretation;
  history: HistoryEntry[];
  activity: ActivityDose[];
  readiness: ReadinessRecord[];
  preferences: UserPreferences;
  now?: Date;
}): ConversationPlanPreview {
  const { interpretation, history, activity, readiness, preferences } = options;
  if (interpretation.safetyFlags.length) {
    return {
      blocked: true,
      session: null,
      gymName: null,
      mode: null,
      progressionAllowed: false,
      exercises: [],
      notes: ['Training preview withheld because symptom or treatment language was detected. Use the safety guidance shown above rather than treating this parser as medical clearance.'],
    };
  }

  const now = options.now || new Date();
  const readinessDecision = readinessDecisionFromRecords(readiness, now);
  const mode = interpretation.adaptContext.mode || preferences.lifeMode;
  const rolling = contextualRollingSession(history, mode, preferences.nextSessionOverride, readinessDecision.level);
  const gym = interpretation.adaptContext.gym || gyms.find(item => item.id === preferences.selectedGymId) || gyms[0];
  const load = recentTrainingLoad(history, activity, now);
  const workload = strengthLoadAdjustment(rolling.session, load, readinessDecision.level);
  const base = buildSession(rolling.session);
  const preferredSubstitutions = Object.fromEntries(base.flatMap(exercise => {
    const preference = preferences.swapPreferences[swapPreferenceKey(gym.id, exercise.id)];
    return preference ? [[exercise.id, preference]] : [];
  }));
  const adapted = adaptWorkout(base, {
    ...interpretation.adaptContext,
    gym,
    mode,
    unavailable: interpretation.adaptContext.unavailable || preferences.lastUnavailableEquipment,
    volumeMultiplier: Math.min(interpretation.adaptContext.volumeMultiplier ?? 1, readinessDecision.volumeMultiplier, workload.volumeMultiplier),
    lowEnergy: interpretation.adaptContext.lowEnergy ?? readinessDecision.level !== 'normal',
    preferredSubstitutions,
  });
  const progressionAllowed = rolling.progressionAllowed && readinessDecision.allowProgression && !workload.pauseProgression;
  return {
    blocked: false,
    session: rolling.session,
    gymName: gym.name,
    mode,
    progressionAllowed,
    exercises: adapted.exercises.map(exercise => ({ id: exercise.id, name: exercise.name, sets: exercise.sets, optional: Boolean(exercise.optional), originalId: exercise.originalId })),
    notes: [
      rolling.reason,
      workload.reduce ? workload.reason : '',
      !progressionAllowed ? readinessDecision.reasons.join(' ') || workload.reason || `${mode} mode holds automatic progression.` : '',
      ...adapted.notes,
      'Preview only: no workout, history entry, preference, or schedule event was changed.',
    ].filter(Boolean),
  };
}
