'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  assertConnectedHealthRelationships,
  clearConnectedSleepContext,
  healthRepository,
  saveConnectedSleepContext,
  summarizeConnectedHealth,
} from '@/lib/connected-health';

/**
 * Validate optional connected-health readiness context before a route can load
 * synchronous training/coaching readiness. Connected-health failure never blocks
 * training itself; it clears derived sleep context and falls back to manual data.
 */
export function ConnectedReadinessGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [observations, sources, preferences] = await Promise.all([
          healthRepository.listObservations(),
          healthRepository.listSources(),
          healthRepository.getPreferences(),
        ]);
        assertConnectedHealthRelationships(observations, sources);
        saveConnectedSleepContext(
          summarizeConnectedHealth(observations, sources, preferences),
          preferences.useFreshSleepForReadiness,
        );
      } catch {
        clearConnectedSleepContext();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return <main className="app-shell"><section className="card" role="status"><h1>Human Health</h1><p>Validating optional connected-health readiness context…</p></section></main>;
  }
  return <>{children}</>;
}
