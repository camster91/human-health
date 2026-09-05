import { ReadinessInput, ReadinessRecord } from '../whole-person';
import { connectedSleepReadiness, ConnectedHealthSummary } from './summary';

export const CONNECTED_SLEEP_CONTEXT_KEY = 'human-health:connected-sleep-context';

export type ConnectedSleepContext = {
  observedAt: string;
  sourceId: string;
  sourceName: string;
  input: ReadinessInput;
};

function remove() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CONNECTED_SLEEP_CONTEXT_KEY); } catch { /* browser storage can be unavailable */ }
}

export function saveConnectedSleepContext(summary: ConnectedHealthSummary, enabled: boolean) {
  if (typeof window === 'undefined') return;
  const input = connectedSleepReadiness(summary, enabled);
  const sleep = summary.sleepLastNight;
  if (!enabled || !sleep.sourceId || !sleep.sourceName || !sleep.recordedAt || Object.keys(input).length === 0) {
    remove();
    return;
  }
  try {
    const context: ConnectedSleepContext = { observedAt: sleep.recordedAt, sourceId: sleep.sourceId, sourceName: sleep.sourceName, input };
    localStorage.setItem(CONNECTED_SLEEP_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Training remains usable without connected context.
  }
}

/**
 * The persisted cache is disposable derived state. Loading it can support recovery/UI
 * inspection, but the training planner must not treat its mere presence as proof that
 * the underlying connected-health repository is currently trustworthy.
 */
export function loadConnectedSleepContext(now = new Date(), maxAgeMs = 48 * 3_600_000): ConnectedSleepContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONNECTED_SLEEP_CONTEXT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ConnectedSleepContext>;
    const observed = Date.parse(value.observedAt || '');
    const age = now.getTime() - observed;
    if (!Number.isFinite(observed) || age < -5 * 60_000 || age > maxAgeMs || !value.sourceId || !value.sourceName || !value.input || typeof value.input !== 'object') {
      remove();
      return null;
    }
    const sleepHours = Number(value.input.sleepHours);
    if (!Number.isFinite(sleepHours) || sleepHours <= 0 || sleepHours > 24 || !['poor', 'okay', 'good'].includes(String(value.input.sleep))) {
      remove();
      return null;
    }
    return { observedAt: new Date(observed).toISOString(), sourceId: value.sourceId, sourceName: value.sourceName, input: { sleepHours, sleep: value.input.sleep } };
  } catch {
    remove();
    return null;
  }
}

function combineManualWithConnectedContext(manual: ReadinessRecord[], connected: ConnectedSleepContext | null, now = new Date()) {
  if (!connected) return manual;
  const latest = manual.at(-1);
  const manualTime = latest ? Date.parse(latest.recordedAt) : Number.NaN;
  const age = now.getTime() - manualTime;
  const manualFresh = Number.isFinite(manualTime) && age >= -5 * 60_000 && age <= 24 * 3_600_000;
  const manualHasSleep = manualFresh && (latest?.input.sleep !== undefined || typeof latest?.input.sleepHours === 'number');
  if (manualHasSleep) return manual;
  const manualInput = manualFresh ? latest?.input || {} : {};
  const recordedAt = manualFresh && manualTime > Date.parse(connected.observedAt) ? latest!.recordedAt : connected.observedAt;
  return [...manual, { recordedAt, input: { ...connected.input, ...manualInput }, source: 'connected-sleep' as const, sourceName: connected.sourceName }];
}

/**
 * Add connected sleep only from a connected-health summary that the caller has
 * already loaded through the live repository integrity path. This is the planning/
 * coaching boundary; it intentionally does not read the persisted derived cache.
 */
export function mergeTrustedConnectedSleepReadiness(
  manual: ReadinessRecord[],
  summary: ConnectedHealthSummary,
  enabled: boolean,
  now = new Date(),
): ReadinessRecord[] {
  const input = connectedSleepReadiness(summary, enabled);
  const sleep = summary.sleepLastNight;
  if (!enabled || sleep.status !== 'current' || !sleep.sourceId || !sleep.sourceName || !sleep.recordedAt || Object.keys(input).length === 0) return manual;
  return combineManualWithConnectedContext(manual, {
    observedAt: sleep.recordedAt,
    sourceId: sleep.sourceId,
    sourceName: sleep.sourceName,
    input,
  }, now);
}

export function clearConnectedSleepContext() {
  remove();
}
