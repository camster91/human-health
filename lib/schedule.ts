import { HistoryEntry, SessionId, TrainingMode } from './domain';
import { plannedExercises } from './workout-accounting';

const sequence: SessionId[] = ['upper-a', 'lower-a', 'upper-b', 'lower-b'];

export type RollingDecision = { session: SessionId; reason: string; repeating: boolean; manual?: boolean };
export type ContextualRollingDecision = RollingDecision & {
  mode: TrainingMode;
  adaptation: 'normal' | 'portable' | 'reduced' | 'maintenance';
  progressionAllowed: boolean;
};
export type ScheduleEvent = { type: 'override' | 'skip'; from: SessionId; to: SessionId; recordedAt: string; reason: string };

export function advanceSession(session: SessionId) {
  return sequence[(sequence.indexOf(session) + 1) % sequence.length];
}

export function workoutCompletionRatio(entry: HistoryEntry) {
  const required = plannedExercises(entry.exercises);
  const prescribed = required.reduce((sum, exercise) => sum + exercise.sets, 0);
  const completed = required.reduce((sum, exercise) => sum + Math.min(exercise.logs.filter(log => !log.warmup).length, exercise.sets), 0);
  return prescribed > 0 ? completed / prescribed : 0;
}

export function nextRollingSession(history: HistoryEntry[]): RollingDecision {
  if (!history.length) return { session: 'upper-a', reason: 'Start the rolling Upper/Lower sequence.', repeating: false };
  const last = history[history.length - 1];
  const status = last.status || 'completed';
  if (status === 'completed') return { session: advanceSession(last.session), reason: 'Previous session was completed; continue the rolling sequence.', repeating: false };
  if (status === 'abandoned') return { session: last.session, reason: 'The previous session was abandoned, so it remains the next session. You can manually reorder it without marking it complete.', repeating: true };

  const required = plannedExercises(last.exercises);
  const ratio = workoutCompletionRatio(last);
  const primary = required.filter(exercise => exercise.priority === 'primary');
  const primaryCovered = primary.length > 0 && primary.every(exercise => exercise.logs.some(log => !log.warmup));
  if (ratio >= 0.6 && primaryCovered) {
    return { session: advanceSession(last.session), reason: `Ended early after ${Math.round(ratio * 100)}% of prescribed working sets with primary work covered; continue the sequence rather than repeating the whole session.`, repeating: false };
  }
  return { session: last.session, reason: `Ended early after ${Math.round(ratio * 100)}% of prescribed working sets; repeat this session so important work is not silently skipped.`, repeating: true };
}

export function contextualRollingSession(
  history: HistoryEntry[],
  mode: TrainingMode = 'normal',
  override: SessionId | null = null,
  readiness: 'normal' | 'reduced' | 'recovery' = 'normal',
): ContextualRollingDecision {
  const base = nextRollingSession(history);
  const selected: RollingDecision = override
    ? { session: override, reason: `Manual session choice: ${override.replace('-', ' ')}. No skipped workout was marked complete and the rolling recommendation remains recoverable.`, repeating: false, manual: true }
    : base;
  if (mode === 'travel') return { ...selected, mode, adaptation: 'portable', progressionAllowed: false, reason: `${selected.reason} Travel mode adapts the session to the selected temporary gym/equipment profile.` };
  if (mode === 'return') return { ...selected, mode, adaptation: 'reduced', progressionAllowed: false, reason: `${selected.reason} Return-to-training mode reduces demand; progression resumes only after tolerance is re-established.` };
  if (mode === 'maintenance') return { ...selected, mode, adaptation: 'maintenance', progressionAllowed: readiness === 'normal', reason: `${selected.reason} Maintenance mode preserves capability with a lower total training burden rather than creating catch-up volume.` };
  if (readiness !== 'normal') return { ...selected, mode, adaptation: 'reduced', progressionAllowed: false, reason: `${selected.reason} Current readiness keeps this session conservative.` };
  return { ...selected, mode, adaptation: 'normal', progressionAllowed: true };
}

export function createScheduleOverride(from: SessionId, to: SessionId, type: 'override' | 'skip' = 'override', now = new Date()): ScheduleEvent {
  return {
    type,
    from,
    to,
    recordedAt: now.toISOString(),
    reason: type === 'skip'
      ? `User skipped ${from.replace('-', ' ')} for now and moved to ${to.replace('-', ' ')}. No workout was marked complete.`
      : `User reordered the next session from ${from.replace('-', ' ')} to ${to.replace('-', ' ')}.`,
  };
}
