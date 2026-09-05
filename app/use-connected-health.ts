'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CONNECTED_HEALTH_UPDATED,
  ConnectedHealthPreferences,
  HealthObservation,
  HealthSourceState,
  assertConnectedHealthRelationships,
  clearConnectedSleepContext,
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
    let nextObservations: HealthObservation[] = [];
    let nextSources: HealthSourceState[] = [];

    if (observationResult.status === 'fulfilled') nextObservations = observationResult.value;
    else errors.push(observationResult.reason instanceof Error ? observationResult.reason.message : 'Connected-health observations could not be loaded.');

    if (sourceResult.status === 'fulfilled') nextSources = sourceResult.value;
    else errors.push(sourceResult.reason instanceof Error ? sourceResult.reason.message : 'Connected-health sources could not be loaded.');

    if (observationResult.status === 'fulfilled' && sourceResult.status === 'fulfilled') {
      try {
        assertConnectedHealthRelationships(nextObservations, nextSources);
      } catch (relationshipError) {
        nextObservations = [];
        errors.push(relationshipError instanceof Error ? relationshipError.message : 'Connected-health observation/source relationships are inconsistent and were not trusted.');
      }
    }

    setObservations(nextObservations);
    setSources(nextSources);

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
    if (loading) return;
    if (error) {
      clearConnectedSleepContext();
      return;
    }
    saveConnectedSleepContext(summary, preferences.useFreshSleepForReadiness);
  }, [error, loading, preferences.useFreshSleepForReadiness, summary]);
  return { observations, sources, preferences, summary, loading, error, refresh };
}
