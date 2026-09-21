/**
 * Session start orchestration (extracted from app/human-health-app.tsx for #148).
 *
 * This logic was previously only testable through the React shell. It is pure:
 * given history, a rolling decision, readiness and preferences it returns the
 * exact Workout object the shell used to build inline. Behaviour is preserved
 * verbatim; the shell now calls this instead of duplicating it.
 */
import type { AdaptContext, GymProfile, HistoryEntry, SessionId, Workout } from '../domain';
import { adaptWorkout } from '../engine';
import type { ReadinessDecision } from '../whole-person';
import { strengthLoadAdjustment, type RecentTrainingLoad } from '../load-management';
import { buildSession, starterProgramDefinition } from '../program';
import { swapPreferenceKey } from '../preferences';

export type StartDecision = {
  session: SessionId;
  progressionAllowed: boolean;
  reason: string;
  repeating: boolean;
  manual: boolean;
};

export type StartWorkoutInput = {
  history: HistoryEntry[];
  decision: StartDecision;
  readiness: ReadinessDecision;
  load: RecentTrainingLoad;
  gym: GymProfile;
  preferences: {
    lifeMode: Workout['mode'];
    swapPreferences: Record<string, string>;
    lastUnavailableEquipment: AdaptContext['unavailable'];
  };
  context?: AdaptContext;
  newId: () => string;
  startedAt?: string;
};

export type StartWorkoutResult =
  | { ok: true; workout: Workout; notes: string[]; savedPreferences?: { nextSessionOverride: null } }
  | { ok: false; notes: string[] };

/**
 * Build a Workout exactly as the legacy shell did, including the volume
 * interaction between readiness and load, the recovery-volume override, and
 * the preferred-substitution map.
 */
export function buildStartWorkout(input: StartWorkoutInput): StartWorkoutResult {
  const { history, decision, readiness, load, gym: selectedGym, preferences } = input;
  const context = input.context || {};
  const selectedSession = decision.session;
  const selectedMode = context.mode ?? preferences.lifeMode;

  const workload = strengthLoadAdjustment(selectedSession, load, readiness.level);
  const volumeOverride = Boolean(context.overrideRecoveryVolume && readiness.level === 'reduced' && workload.source === 'readiness');

  const preferredSubstitutions = Object.fromEntries(
    buildSession(selectedSession).flatMap(exercise => {
      const preference = preferences.swapPreferences[swapPreferenceKey(selectedGym.id, exercise.id)];
      return preference ? [[exercise.id, preference]] : [];
    })
  );

  const progressionAllowed = decision.progressionAllowed && readiness.allowProgression && !workload.pauseProgression;
  const progressionReason = progressionAllowed
    ? undefined
    : workload.pauseProgression
      ? workload.reason
      : readiness.reasons.join(' ') || `${selectedMode} mode pauses automatic progression.`;

  const adapted = adaptWorkout(buildSession(selectedSession), {
    ...context,
    gym: selectedGym,
    mode: selectedMode,
    unavailable: context.unavailable || preferences.lastUnavailableEquipment,
    volumeMultiplier: Math.min(
      context.volumeMultiplier ?? 1,
      volumeOverride ? 1 : readiness.volumeMultiplier,
      volumeOverride ? 1 : workload.volumeMultiplier
    ),
    lowEnergy: context.lowEnergy ?? (!volumeOverride && readiness.level !== 'normal'),
    preferredSubstitutions,
  });

  const notes = [
    decision.reason,
    volumeOverride ? 'You chose the original set volume despite reduced readiness. Automatic load progression remains paused.' : '',
    !volumeOverride && workload.reduce ? workload.reason : '',
    ...adapted.notes,
  ].filter(Boolean) as string[];

  if (!adapted.exercises.length) {
    return {
      ok: false,
      notes: [...notes, 'No exercises could be generated with current equipment and constraints. Please adjust settings or equipment availability.'],
    };
  }

  const workout: Workout = {
    id: input.newId(),
    session: selectedSession,
    startedAt: input.startedAt || new Date().toISOString(),
    status: 'active',
    gymId: selectedGym.id,
    mode: selectedMode,
    programId: starterProgramDefinition.id,
    programVersion: starterProgramDefinition.version,
    unavailableEquipment: context.unavailable || preferences.lastUnavailableEquipment,
    exercises: adapted.exercises,
    progressionAllowed,
    progressionReason,
  };

  return { ok: true, workout, notes };
}
