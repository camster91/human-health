/**
 * Today recommendation summary (extracted from app/human-health-app.tsx for #148).
 *
 * Produces the one-screen Today decision: what to do, how long, one short reason,
 * and the deterministic fallbacks. Pure and offline-safe; no model, no network.
 */
import type { HistoryEntry, SessionId } from '../domain';
import type { AdaptContext } from '../domain';
import type { UserPreferences } from '../preferences';
import { buildSession } from '../program';
import type { ReadinessDecision } from '../whole-person';

export type TodayRecommendation = {
  session: SessionId;
  durationMinutes: number;
  movementCount: number;
  label: string;
  reason: string;
  progressionAllowed: boolean;
};

/**
 * Default session duration shown on Today. The programme is a 4-day upper/lower
 * split; 40 minutes is the normal target and the smallest useful day is 6–10.
 */
export const NORMAL_SESSION_MINUTES = 40;
export const MINIMUM_USEFUL_MINUTES = 10;

/**
 * Compose the Today recommendation. `reason` is one sentence and is derived from
 * deterministic readiness/progression state only — never from model output.
 */
export function todayRecommendation(input: {
  history: HistoryEntry[];
  session: SessionId;
  repeating: boolean;
  manual: boolean;
  readiness: ReadinessDecision;
  preferences: Pick<UserPreferences, 'lifeMode'>;
  progressionAllowed: boolean;
}): TodayRecommendation {
  const { readiness } = input;
  const movements = buildSession(input.session).length;

  const reason = readiness.level !== 'normal'
    ? readiness.reasons.join(' ') || 'Readiness is reduced today.'
    : input.preferences.lifeMode !== 'normal'
      ? `${input.preferences.lifeMode.charAt(0).toUpperCase()}${input.preferences.lifeMode.slice(1)} mode is active.`
      : 'This is the next session in your rolling split.';

  return {
    session: input.session,
    durationMinutes: NORMAL_SESSION_MINUTES,
    movementCount: movements,
    label: input.manual ? 'CUSTOM' : input.repeating ? 'REPEAT' : 'UP NEXT',
    reason,
    progressionAllowed: input.progressionAllowed,
  };
}

/**
 * Context actions offered on Today. Each maps to a deterministic AdaptContext or
 * a readiness check-in — no typing and no model required.
 */
export type TodayContextAction =
  | { id: 'less-time'; label: string; minutes: number }
  | { id: 'sore'; label: string }
  | { id: 'pain'; label: string }
  | { id: 'equipment'; label: string }
  | { id: 'ask-guide'; label: string };

export const todayContextActions: TodayContextAction[] = [
  { id: 'less-time', label: 'I have less time', minutes: MINIMUM_USEFUL_MINUTES },
  { id: 'sore', label: "I'm sore" },
  { id: 'pain', label: 'Something hurts' },
  { id: 'equipment', label: 'Change equipment' },
  { id: 'ask-guide', label: 'Ask Guide' },
];

/** AdaptContext for the "less time" action. */
export function lessTimeContext(minutes: number): AdaptContext {
  return { minutes };
}
