export const CONNECTED_HEALTH_UPDATED = 'human-health:connected-health-updated';

export function notifyConnectedHealthUpdated() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONNECTED_HEALTH_UPDATED));
}
