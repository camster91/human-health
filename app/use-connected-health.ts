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
    const [observationResult, sourceResult, preferenceResult] = await Promise.allSettled([
      healthRepository.listObservations(),
      healthRepository.listSources(),
      healthRepository.getPreferences(),
    ]);

    const errors: string[] = [];
    if (observationResult.status === 'fulfilled') setObservations(observationResult.value);
    else {
      // Fail closed: do not continue showing previously trusted health observations
      // after storage integrity becomes uncertain.
      setObservations([]);
      errors.push(observationResult.reason instanceof Error ? observationResult.reason.message : 'Connected-health observations could not be loaded.');
    }

    if (sourceResult.status === 'fulfilled') setSources(sourceResult.value);
    else {
      setSources([]);
      errors.push(sourceResult.reason instanceof Error ? sourceResult.reason.message : 'Connected-health sources could not be loaded.');
    }

    if (preferenceResult.status === 'fulfilled') setPreferences(preferenceResult.value);
    else {
      setPreferences(defaultConnectedHealthPreferences);
      errors.push(preferenceResult.reason instanceof Error ? preferenceResult.reason.message : 'Connected-health preferences could not be loaded.');
    }

    setError(errors.join(' '));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => { void refresh(); };
    window.addEventListener(CONNECTED_HEALTH_UPDATED, listener);
    return () => window.removeEventListener(CONNECTED_HEALTH_UPDATED, listener);
  }, [refresh]);

  const summary = useMemo(() => summarizeConnectedHealth(observations, sources, preferences), [observations, sources, preferences]);
  useEffect(() => {
    if (!loading && !error) saveConnectedSleepContext(summary, preferences.useFreshSleepForReadiness);
  }, [error, loading, preferences.useFreshSleepForReadiness, summary]);
  return { observations, sources, preferences, summary, loading, error, refresh };
}
