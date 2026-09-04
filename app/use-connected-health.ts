'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CONNECTED_HEALTH_UPDATED,
  ConnectedHealthPreferences,
  HealthObservation,
  HealthSourceState,
  defaultConnectedHealthPreferences,
  healthRepository,
  saveConnectedSleepContext,
  summarizeConnectedHealth,
} from '@/lib/connected-health';

export function useConnectedHealthSnapshot() {
  const [observations, setObservations] = useState<HealthObservation[]>([]);
  const [sources, setSources] = useState<HealthSourceState[]>([]);
  const [preferences, setPreferences] = useState<ConnectedHealthPreferences>(defaultConnectedHealthPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [nextObservations, nextSources, nextPreferences] = await Promise.all([
        healthRepository.listObservations(),
        healthRepository.listSources(),
        healthRepository.getPreferences(),
      ]);
      setObservations(nextObservations);
      setSources(nextSources);
      setPreferences(nextPreferences);
      setError('');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Connected health data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => { void refresh(); };
    window.addEventListener(CONNECTED_HEALTH_UPDATED, listener);
    return () => window.removeEventListener(CONNECTED_HEALTH_UPDATED, listener);
  }, [refresh]);

  const summary = useMemo(() => summarizeConnectedHealth(observations, sources, preferences), [observations, sources, preferences]);
  useEffect(() => {
    if (!loading) saveConnectedSleepContext(summary, preferences.useFreshSleepForReadiness);
  }, [loading, preferences.useFreshSleepForReadiness, summary]);
  return { observations, sources, preferences, summary, loading, error, refresh };
}
