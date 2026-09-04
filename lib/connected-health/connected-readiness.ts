import { ReadinessInput } from '../whole-person';
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

export function clearConnectedSleepContext() {
  remove();
}
