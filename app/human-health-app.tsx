'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdaptContext, HistoryEntry, SessionId, SetLog, Workout, WorkoutExercise } from '@/lib/domain';
import { adaptWorkout, nextLoadRecommendation, platePlan, summarizeWorkout, workingLogs } from '@/lib/engine';
import { recentTrainingLoad, strengthLoadAdjustment } from '@/lib/load-management';
import { defaultPreferences, normalizePreferences, swapPreferenceKey, UserPreferences } from '@/lib/preferences';
import { buildSession, exerciseIsAvailable, exercises, gyms, rankedSubstitutions, starterProgramDefinition } from '@/lib/program';
import { extendRestTimer, pauseRestTimer, remainingRestSeconds, restartRestTimer, RestTimerState, resumeRestTimer, startRestTimer } from '@/lib/rest-timer';
import { advanceSession, contextualRollingSession, createScheduleOverride, nextRollingSession } from '@/lib/schedule';
import { store } from '@/lib/storage';
import { ActivityDose, Assessment, ReadinessRecord, readinessDecisionFromRecords, workoutActivityDoses } from '@/lib/whole-person';
import { CapabilityTrendPanel } from './capability-trend-panel';
import { OfflineIndicator } from './offline-indicator';
import { SettingsPanel } from './settings-panel';
import { CapabilityAssessmentPanel, SkillProgressPanel, WholePersonDashboard } from './whole-person-dashboard';

function title(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
function kgToDisplay(kg: number, units: UserPreferences['unitSystem']) {
  return units === 'imperial' ? kg * 2.2046226218 : kg;
}
function displayToKg(value: number, units: UserPreferences['unitSystem']) {
  return units === 'imperial' ? value / 2.2046226218 : value;
}
function daysBetween(a?: string, b?: string) {
  if (!a || !b) return undefined;
  return Math.max(0, (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}
function formatSet(exercise: WorkoutExercise, set: SetLog, units: UserPreferences['unitSystem']) {
  const unit = units === 'imperial' ? 'lb' : 'kg';
  const displayed = kgToDisplay(set.weight, units);
  if (exercise.metadata?.loadType === 'bodyweight') {
    const load = set.weight > 0 ? `Bodyweight + ${displayed.toFixed(1)} ${unit}` : 'Bodyweight';
    return `${load} × ${set.reps}`;
  }
  return `${displayed.toFixed(1)} ${unit} × ${set.reps}`;
}

export function HumanHealthApp() {
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activity, setActivity] = useState<ActivityDose[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [readinessRecords, setReadinessRecords] = useState<ReadinessRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [active, setActive] = useState<Workout | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<'today' | 'progress' | 'settings'>('today');
  const [notes, setNotes] = useState<string[]>([]);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [saveSwap, setSaveSwap] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    const loadedPreferences = store.loadPreferences();
    const selectedGymId = gyms.some(item => item.id === loadedPreferences.selectedGymId) ? loadedPreferences.selectedGymId : gyms[0].id;
    const savedPreferences = normalizePreferences({ ...loadedPreferences, selectedGymId });
    const savedActive = store.loadActive();
    const restoredActive = savedActive
      ? { ...savedActive, status: savedActive.status === 'active' ? 'interrupted' as const : savedActive.status }
      : null;
    const savedTimer = savedActive ? store.loadRestTimer() : null;
    setPreferences(savedPreferences);
    setHistory(store.loadHistory());
    setActivity(store.loadActivity());
    setAssessments(store.loadAssessments());
    setReadinessRecords(store.loadReadiness());
    setActive(restoredActive);
    setRestTimer(pauseRestTimer(savedTimer));
    setNow(Date.now());
    if (!store.canPersist()) setStorageWarning('This browser cannot currently save workouts. Enable site storage before relying on refresh or interruption recovery.');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved = store.saveActive(active);
    setStorageWarning(saved ? '' : 'This browser could not save the active workout. Do not rely on refresh recovery until storage is available.');
  }, [active, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const saved = store.saveRestTimer(active ? restTimer : null);
    if (!saved) setStorageWarning('This browser could not save the rest timer. Keep this screen open until browser storage is available.');
  }, [restTimer, active, hydrated]);

  useEffect(() => {
    if (!restTimer || restTimer.status !== 'running') return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [restTimer]);

  useEffect(() => {
    if (!restTimer || restTimer.status !== 'running' || remainingRestSeconds(restTimer, now) > 0) return;
    setRestTimer(null);
    if (preferences.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate([180, 80, 180]);
    if (preferences.notificationEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('Human Health', { body: 'Rest complete. Your next set is ready.', icon: '/icon-192.png' }); } catch { /* notification support varies by installed/browser context */ }
    }
  }, [restTimer, now, preferences.notificationEnabled, preferences.vibrationEnabled]);

  useEffect(() => {
    if (!active || active.status !== 'active' || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    type Sentinel = { released: boolean; release: () => Promise<void>; addEventListener: (type: 'release', listener: () => void, options?: { once?: boolean }) => void };
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    let requesting = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const request = async () => {
      if (cancelled || requesting || document.visibilityState !== 'visible' || sentinel) return;
      requesting = true;
      try {
        const wakeLock = (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<Sentinel> } }).wakeLock;
        const next = await wakeLock.request('screen');
        if (cancelled) await next.release();
        else {
          sentinel = next;
          next.addEventListener('release', () => {
            sentinel = null;
            if (!cancelled && document.visibilityState === 'visible') retry = setTimeout(() => void request(), 500);
          }, { once: true });
        }
      } catch {
        sentinel = null;
      } finally {
        requesting = false;
      }
    };
    const release = async () => {
      const current = sentinel;
      sentinel = null;
      if (current && !current.released) await current.release().catch(() => {});
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void request();
      else void release();
    };
    void request();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      document.removeEventListener('visibilitychange', visibility);
      void release();
    };
  }, [active?.id, active?.status]);

  const latestReadiness = readinessDecisionFromRecords(readinessRecords);
  const baseRolling = useMemo(() => nextRollingSession(history), [history]);
  const rolling = useMemo(() => contextualRollingSession(history, preferences.lifeMode, preferences.nextSessionOverride, latestReadiness.level), [history, preferences.lifeMode, preferences.nextSessionOverride, latestReadiness.level]);
  const gym = useMemo(() => gyms.find(item => item.id === preferences.selectedGymId) || gyms[0], [preferences.selectedGymId]);
  const recentLoad = useMemo(() => recentTrainingLoad(history, activity), [history, activity]);
  const activeGym = useMemo(() => active ? gyms.find(item => item.id === active.gymId) || gym : gym, [active, gym]);
  const restSeconds = remainingRestSeconds(restTimer, now);
  const currentAdjustment = strengthLoadAdjustment(rolling.session, recentLoad, latestReadiness.level);

  function savePreferences(next: UserPreferences) {
    const selectedGymId = gyms.some(item => item.id === next.selectedGymId) ? next.selectedGymId : gyms[0].id;
    const normalized = normalizePreferences({ ...next, selectedGymId });
    const saved = store.savePreferences(normalized);
    setPreferences(normalized);
    if (!saved) setStorageWarning('Preferences changed in memory but could not be saved in this browser.');
  }

  function startWorkout(context: AdaptContext = {}) {
    const selectedMode = context.mode ?? preferences.lifeMode;
    const startDecision = contextualRollingSession(history, selectedMode, preferences.nextSessionOverride, latestReadiness.level);
    const selectedSession = startDecision.session;
    const selectedGym = context.gym || gym;
    const workload = strengthLoadAdjustment(selectedSession, recentLoad, latestReadiness.level);
    const volumeOverride = Boolean(context.overrideRecoveryVolume && latestReadiness.level === 'reduced' && workload.source === 'readiness');
    const preferredSubstitutions = Object.fromEntries(buildSession(selectedSession).flatMap(exercise => {
      const preference = preferences.swapPreferences[swapPreferenceKey(selectedGym.id, exercise.id)];
      return preference ? [[exercise.id, preference]] : [];
    }));
    const progressionAllowed = startDecision.progressionAllowed && latestReadiness.allowProgression && !workload.pauseProgression;
    const progressionReason = progressionAllowed ? undefined : workload.pauseProgression ? workload.reason : latestReadiness.reasons.join(' ') || `${title(selectedMode)} mode pauses automatic progression.`;
    const adapted = adaptWorkout(buildSession(selectedSession), {
      ...context,
      gym: selectedGym,
      mode: selectedMode,
      unavailable: context.unavailable || preferences.lastUnavailableEquipment,
      volumeMultiplier: Math.min(context.volumeMultiplier ?? 1, volumeOverride ? 1 : latestReadiness.volumeMultiplier, volumeOverride ? 1 : workload.volumeMultiplier),
      lowEnergy: context.lowEnergy ?? (!volumeOverride && latestReadiness.level !== 'normal'),
      preferredSubstitutions,
    });
    const explanations = [
      startDecision.reason,
      volumeOverride ? 'You chose the original set volume despite reduced readiness. Automatic load progression remains paused.' : '',
      !volumeOverride && workload.reduce ? workload.reason : '',
      ...adapted.notes,
    ].filter(Boolean);
    setNotes(explanations);
    if (!adapted.exercises.length) {
      setNotes([...explanations, 'No exercises could be generated with current equipment and constraints. Please adjust settings or equipment availability.']);
      return;
    }

    if (preferences.nextSessionOverride) {
      const events = store.loadScheduleEvents();
      const last = events.at(-1);
      const recentlyRecordedSkip = last?.type === 'skip'
        && last.to === preferences.nextSessionOverride
        && Date.now() - new Date(last.recordedAt).getTime() < 10 * 60_000;
      if (preferences.nextSessionOverride !== baseRolling.session && !recentlyRecordedSkip) {
        store.saveScheduleEvents([...events, createScheduleOverride(baseRolling.session, preferences.nextSessionOverride)]);
      }
      savePreferences({ ...preferences, nextSessionOverride: null });
    }

    setActive({
      id: crypto.randomUUID(),
      session: selectedSession,
      startedAt: new Date().toISOString(),
      status: 'active',
      gymId: selectedGym.id,
      mode: selectedMode,
      programId: starterProgramDefinition.id,
      programVersion: starterProgramDefinition.version,
      unavailableEquipment: context.unavailable || preferences.lastUnavailableEquipment,
      exercises: adapted.exercises,
      progressionAllowed,
      progressionReason,
    });
    setRestTimer(null);
    setSwapIndex(null);
    setShowAddExercise(false);
  }

  function skipRecommendedSessionOnce() {
    const from = rolling.session;
    const target = advanceSession(from);
    const events = [...store.loadScheduleEvents(), createScheduleOverride(from, target, 'skip')];
    store.saveScheduleEvents(events);
    savePreferences({ ...preferences, nextSessionOverride: target });
    setNotes([`Skipped ${title(from)} for now. ${title(target)} is selected once; no workout was marked complete. You can select ${title(from)} again from Adjust plan.`]);
  }

  function updateActive(next: Workout) {
    setActive(next);
    const saved = store.saveActive(next);
    if (!saved) setStorageWarning('The workout changed, but local persistence failed. Keep this screen open and enable browser storage.');
  }

  function logSet(exerciseIndex: number, log: SetLog) {
    if (!active || active.status !== 'active') return;
    if (!Number.isFinite(log.weight) || log.weight < 0 || !Number.isFinite(log.reps) || log.reps <= 0) {
      setStorageWarning('Enter a valid non-negative load and at least one rep or second before logging the set.');
      return;
    }
    const next = structuredClone(active);
    next.exercises[exerciseIndex].logs.push(log);
    if (log.pain) {
      next.progressionAllowed = false;
      next.progressionReason = 'Pain or unusual discomfort was flagged during this workout. Automatic progression is paused.';
    }
    updateActive(next);
    setRestTimer(startRestTimer(preferences.defaultRestSeconds));
  }

  function selectSwap(exerciseIndex: number, replacement: WorkoutExercise['id']) {
    if (!active || active.status !== 'active') return;
    const current = active.exercises[exerciseIndex];
    const workingCompleted = workingLogs(current).length;
    const remainingSets = current.sets - Math.min(current.sets, workingCompleted);
    if (remainingSets <= 0) return;
    const option = rankedSubstitutions(current, activeGym, { unavailable: active.unavailableEquipment || [], preferredId: replacement }).find(item => item.exercise.id === replacement);
    if (!option) return;
    const next = structuredClone(active);
    const originalId = current.originalId || current.id;
    const replacementExercise: WorkoutExercise = { ...option.exercise, sets: remainingSets, logs: [], originalId, optional: current.optional };
    if (current.logs.length) {
      next.exercises[exerciseIndex] = { ...current, sets: workingCompleted, optional: true };
      next.exercises.splice(exerciseIndex + 1, 0, replacementExercise);
    } else {
      next.exercises[exerciseIndex] = replacementExercise;
    }
    updateActive(next);
    if (saveSwap) savePreferences({ ...preferences, swapPreferences: { ...preferences.swapPreferences, [swapPreferenceKey(activeGym.id, originalId)]: option.exercise.id } });
    setSwapIndex(null);
    setSaveSwap(false);
    setNotes(previous => [...previous, option.reason]);
  }

  function toggleDeferred(exerciseIndex: number) {
    if (!active || active.status !== 'active') return;
    const current = active.exercises[exerciseIndex];
    if (workingLogs(current).length >= current.sets) return;
    const next = structuredClone(active);
    next.exercises[exerciseIndex].deferred = !current.deferred;
    updateActive(next);
    setSwapIndex(null);
    setNotes(previous => [...previous, next.exercises[exerciseIndex].deferred
      ? `${current.name} was deferred. Completed sets remain recorded, and the session will be finalized as partial unless you restore and finish it.`
      : `${current.name} was restored to the active workout.`]);
  }

  function addExercise(exerciseId: string) {
    if (!active || active.status !== 'active') return;
    const definition = exercises.find(item => item.id === exerciseId);
    if (!definition || !exerciseIsAvailable(definition, activeGym, active.unavailableEquipment || [])) return;
    const next = structuredClone(active);
    next.exercises.push({ ...definition, sets: 2, logs: [], optional: true });
    updateActive(next);
    setShowAddExercise(false);
    setNotes(previous => [...previous, `${definition.name} was added as two optional working sets. It will not make the original session appear incomplete if you leave it unfinished.`]);
  }

  function finishWorkout(status: 'completed' | 'ended-early' | 'abandoned') {
    if (!active) return;
    if (status === 'abandoned' && !window.confirm('Abandon this workout? Completed sets will remain in history, but the session will not count toward progress targets.')) return;
    const entry: HistoryEntry = { session: active.session, startedAt: active.startedAt, completedAt: new Date().toISOString(), status, gymId: active.gymId, mode: active.mode, programId: active.programId, programVersion: active.programVersion, exercises: active.exercises };
    const nextHistory = [...history, entry];
    const nextActivity = [...activity, ...workoutActivityDoses(entry)];
    const historySaved = store.saveHistory(nextHistory);
    const activitySaved = store.saveActivity(nextActivity);
    if (!historySaved || !activitySaved) {
      setStorageWarning('The workout could not be finalized in local storage. It remains open so you can retry or export data after storage is restored.');
      return;
    }
    store.saveActive(null);
    store.saveRestTimer(null);
    setHistory(nextHistory);
    setActivity(nextActivity);
    setActive(null);
    setRestTimer(null);
    setSwapIndex(null);
    setShowAddExercise(false);
    setNotes(summarizeWorkout(entry.exercises, history).messages);
    setTab('today');
  }

  function pauseWorkout() {
    if (!active) return;
    updateActive({ ...active, status: 'paused', pausedAt: new Date().toISOString() });
    setRestTimer(timer => pauseRestTimer(timer));
  }

  function resumeWorkout() {
    if (!active) return;
    updateActive({ ...active, status: 'active', pausedAt: undefined });
    setRestTimer(timer => resumeRestTimer(timer));
  }

  function resetLocalState() {
    setHistory([]);
    setActivity([]);
    setAssessments([]);
    setReadinessRecords([]);
    setPreferences(defaultPreferences);
    setActive(null);
    setRestTimer(null);
    setNotes([]);
    setStorageWarning('');
    setTab('today');
  }

  if (!hydrated) return <main className="app-shell"><section className="card" role="status"><h1>Human Health</h1><p>Loading your local training data…</p></section></main>;

  if (active) {
    const requiredHandled = active.exercises.filter(exercise => !exercise.optional).every(exercise => exercise.deferred || workingLogs(exercise).length >= exercise.sets);
    const hasDeferredRequired = active.exercises.some(exercise => !exercise.optional && exercise.deferred);
    const addOptions = exercises.filter(exercise => exerciseIsAvailable(exercise, activeGym, active.unavailableEquipment || []) && !active.exercises.some(item => item.id === exercise.id));
    return <main className="workout-shell">
      <OfflineIndicator />
      {storageWarning && <div className="connection-state storage-error" role="alert">{storageWarning}</div>}
      <header className="workout-head"><div><span className="eyebrow">ACTIVE WORKOUT</span><h1>{title(active.session)}</h1><p className="muted">{title(active.mode || 'normal')} · {activeGym.name}</p></div><div className="header-actions">{active.status === 'active' ? <button className="ghost" onClick={pauseWorkout}>Pause</button> : <button className="primary" onClick={resumeWorkout}>Resume</button>}<button className="ghost" disabled={active.status !== 'active'} onClick={() => setShowAddExercise(value => !value)}>Add exercise</button><button className="ghost" onClick={() => finishWorkout('ended-early')}>End early</button></div></header>
      {active.status !== 'active' && <section className="card paused-card"><h2>{active.status === 'interrupted' ? 'Workout restored' : 'Workout paused'}</h2><p>Your completed sets are still stored locally. Resume when ready; elapsed pause time does not mark exercises complete.</p><button className="primary" onClick={resumeWorkout}>Resume workout</button></section>}
      {showAddExercise && active.status === 'active' && <section className="card"><h2>Add optional exercise</h2><p className="muted">Added exercises start with two optional sets and do not change the completion requirement of the original session.</p><div className="choice-grid">{addOptions.map(exercise => <button key={exercise.id} onClick={() => addExercise(exercise.id)}><b>{exercise.name}</b><small>{title(exercise.movement)} · {exercise.repRange[0]}–{exercise.repRange[1]}</small></button>)}</div>{!addOptions.length && <p>No additional compatible exercise is available with the current equipment state.</p>}</section>}
      {notes.length > 0 && <div className="coach-note">{notes.join(' ')}</div>}
      {active.progressionAllowed === false && active.progressionReason && <div className="coach-note"><b>Load progression paused</b><br/>{active.progressionReason}</div>}
      {active.exercises.map((exercise, exerciseIndex) => {
        const previousEntry = [...history].reverse().flatMap(entry => entry.exercises.map(item => ({ item, completedAt: entry.completedAt }))).find(record => record.item.id === exercise.id);
        const previous = previousEntry?.item;
        const working = workingLogs(exercise);
        const latestLoggedWeight = exercise.logs.at(-1)?.weight;
        const previousWorkingWeight = previous ? workingLogs(previous).at(-1)?.weight : undefined;
        const defaultWeightKg = exercise.metadata?.loadType === 'bodyweight' ? 0 : latestLoggedWeight ?? previousWorkingWeight ?? 20;
        const suggestion = nextLoadRecommendation(exercise, previous, { progressionAllowed: active.progressionAllowed ?? (latestReadiness.allowProgression && (active.mode || 'normal') === 'normal'), daysSincePrevious: daysBetween(active.startedAt, previousEntry?.completedAt) });
        const options = rankedSubstitutions(exercise, activeGym, { unavailable: active.unavailableEquipment || [], preferredId: preferences.swapPreferences[swapPreferenceKey(activeGym.id, exercise.originalId || exercise.id)] });
        const exerciseComplete = working.length >= exercise.sets;
        return <section className={exercise.deferred ? 'exercise deferred' : 'exercise'} key={`${exercise.id}-${exerciseIndex}`}>
          <div className="exercise-title"><div><span className="pill">{exercise.deferred ? 'deferred' : exercise.optional ? 'optional' : exercise.priority}</span><h2>{exercise.name}</h2><p>{exercise.sets} working sets · {exercise.repRange[0]}–{exercise.repRange[1]} {exercise.repRange[1] > 25 && exercise.movement === 'core' ? 'seconds' : 'reps'}</p>{exercise.originalId && <small>Temporary replacement for {title(exercise.originalId)}; progression remains separate.</small>}</div><div className="exercise-tools"><button className="link" disabled={active.status !== 'active' || exerciseComplete || exercise.deferred} onClick={() => setSwapIndex(swapIndex === exerciseIndex ? null : exerciseIndex)}>Swap</button><button className="link" disabled={active.status !== 'active' || exerciseComplete} onClick={() => toggleDeferred(exerciseIndex)}>{exercise.deferred ? 'Restore' : exercise.optional ? 'Remove/stop' : 'Defer'}</button></div></div>
          {previous && <div className="previous">Previous: {workingLogs(previous).map(set => formatSet(previous, set, preferences.unitSystem)).join(' · ') || 'No prior working sets'}</div>}
          <div className="set-grid">{Array.from({ length: exercise.sets }).map((_, index) => <div className={index < working.length ? 'set done' : 'set'} key={index}><b>Set {index + 1}</b><span>{working[index] ? `${formatSet(exercise, working[index], preferences.unitSystem)}${working[index].pain ? ' · discomfort' : ''}${working[index].formQuality === 'poor' ? ' · form issue' : ''}` : exercise.deferred ? 'Deferred' : 'Ready'}</span></div>)}</div>
          {exercise.logs.some(set => set.warmup) && <p className="muted">Warm-ups logged: {exercise.logs.filter(set => set.warmup).length}</p>}
          {active.status === 'active' && !exerciseComplete && !exercise.deferred && <SetEntry key={`${exercise.id}-${exercise.logs.length}`} defaultWeightKg={defaultWeightKg} defaultReps={exercise.repRange[0]} units={preferences.unitSystem} loadType={exercise.metadata?.loadType} onLog={log => logSet(exerciseIndex, log)}/>} 
          {exercise.equipment.includes('barbell') && <PlateHelper targetKg={working.at(-1)?.weight ?? previousWorkingWeight ?? preferences.plateBarKg} preferences={preferences}/>} 
          <div className="coach-mini">{exercise.deferred ? 'This planned work remains visible and contributes to partial-session accounting.' : suggestion.message}</div>
          {swapIndex === exerciseIndex && <div className="swap-panel"><h3>Compatible replacements</h3>{options.length ? options.map(option => <button key={option.exercise.id} onClick={() => selectSwap(exerciseIndex, option.exercise.id)}><b>{option.exercise.name}{option.preferred ? ' · preferred' : ''}</b><small>{option.reason}</small></button>) : <p>No compatible replacement is available with this gym and temporary equipment state.</p>}<label className="checkbox-row"><input type="checkbox" checked={saveSwap} onChange={event => setSaveSwap(event.target.checked)}/> Remember selection for {activeGym.name}</label></div>}
        </section>;
      })}
      <div className="workout-actions"><button className="primary" disabled={active.status !== 'active' || !requiredHandled} title={!requiredHandled ? 'Complete or defer every required exercise, or use End early now.' : undefined} onClick={() => finishWorkout(hasDeferredRequired ? 'ended-early' : 'completed')}>{hasDeferredRequired ? 'Finish partial workout' : 'Complete workout'}</button><button className="danger" onClick={() => finishWorkout('abandoned')}>Abandon</button></div>
      {!requiredHandled && <p className="muted">Complete becomes available after required exercises are finished or deferred. End early remains available at any time.</p>}
      {restTimer && <div className="rest-dock" role="timer" aria-label={`Rest timer: ${restSeconds} seconds remaining`}><b>Rest</b><span>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}</span><div className="timer-actions">{restTimer.status === 'running' ? <button onClick={() => setRestTimer(timer => pauseRestTimer(timer))}>Pause</button> : <button onClick={() => setRestTimer(timer => resumeRestTimer(timer))}>Resume</button>}<button onClick={() => setRestTimer(timer => extendRestTimer(timer, 30))}>+30s</button><button onClick={() => setRestTimer(timer => restartRestTimer(timer, preferences.defaultRestSeconds))}>Restart</button><button onClick={() => setRestTimer(null)}>Skip</button></div></div>}
    </main>;
  }

  return <main className="app-shell">
    <OfflineIndicator />
    {storageWarning && <div className="connection-state storage-error" role="alert">{storageWarning}</div>}
    <header><div><span className="eyebrow">HUMAN HEALTH</span><h1>{title(tab)}</h1></div>{tab !== 'settings' && <select value={gym.id} onChange={event => savePreferences({ ...preferences, selectedGymId: event.target.value })} aria-label="Gym profile">{gyms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</header>

    {tab === 'today' && <>
      {history.length === 0 ? <>
        <section className="hero">
          <h2>Welcome to Human Health</h2>
          <p>An adaptive training coach that helps you build sustainable strength and fitness habits.</p>
        </section>

        <section className="card">
          <h2>How it works</h2>
          <p><b>Start with a workout recommendation</b><br/>Human Health generates evidence-based strength training sessions that adapt to your readiness and available equipment.</p>
          <p><b>Track your progress locally</b><br/>All workout data stays on your device. Nothing is sent to external servers without your explicit permission.</p>
          <p><b>Adjust as life changes</b><br/>Use readiness checks, time constraints, and life mode settings to adapt workouts to your current context.</p>
          <p className="muted">This app provides general training guidance. It does not diagnose injury, prescribe medication, or replace medical advice from qualified healthcare professionals.</p>
        </section>

        <section className="card">
          <h2>Ready to begin?</h2>
          <p>Your first session is a balanced upper body workout designed to establish movement patterns and initial working loads.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => startWorkout()}>Start first workout</button>
            <button className="ghost" onClick={() => setTab('settings')}>Review settings first</button>
          </div>
        </section>
      </> : <>
        <section className="hero"><span className="pill">{rolling.manual ? 'YOUR SESSION CHOICE' : rolling.repeating ? 'RECOMMENDED REPEAT' : 'NEXT SESSION'}</span><h2>{title(rolling.session)}</h2><p>{rolling.reason}</p>{latestReadiness.level !== 'normal' && <div className="coach-note"><b>{latestReadiness.level === 'recovery' ? 'Recovery-first context' : 'Reduced-readiness context'}</b><br/>{latestReadiness.reasons.join(' ')}</div>}<div className="hero-actions"><button className="primary" onClick={() => startWorkout()}>Start recommended workout</button>{latestReadiness.level === 'reduced' && currentAdjustment.source === 'readiness' && <button className="ghost" onClick={() => startWorkout({ overrideRecoveryVolume: true })}>Use original set volume</button>}<button className="ghost" onClick={skipRecommendedSessionOnce}>Skip once</button><button className="ghost" onClick={() => setTab('settings')}>Adjust plan</button></div>{latestReadiness.level === 'reduced' && <p className="muted">Choosing original set volume does not re-enable automatic load progression. Pain/illness recovery-first constraints cannot be overridden here.</p>}</section>

        {notes.length > 0 && <section className="card" aria-labelledby="coach-insights-title"><h2 id="coach-insights-title">Coach insights</h2>{notes.map((note, index) => <p className="coach-note" key={index}>{note}</p>)}<div className="coach-note"><b>Current training context</b><br/>{recentLoad.message}</div></section>}

        <section aria-labelledby="plans-changed-title"><h2 id="plans-changed-title">Plans changed?</h2><div className="quick-grid"><button onClick={() => startWorkout({ minutes: 20 })}>20 minutes</button><button onClick={() => startWorkout({ minutes: 30 })}>30 minutes</button><button onClick={() => startWorkout({ lowEnergy: true, volumeMultiplier: 0.8 })}>Low energy</button><button onClick={() => startWorkout({ gym: gyms.find(item => item.id === 'hotel') || gym, mode: 'travel' })}>Different gym</button></div></section>
      </>}
      <WholePersonDashboard history={history} activity={activity} readinessRecords={readinessRecords} assessments={assessments} preferences={preferences} gym={gym} nextSession={rolling.session} onActivityChange={setActivity} onReadinessChange={setReadinessRecords}/>
      <SkillProgressPanel gym={gym}/>
    </>}

    {tab === 'progress' && <>
      <section className="card" aria-labelledby="history-title"><h2 id="history-title">Training history</h2>{history.length ? [...history].reverse().map((entry, index) => <div className="history" key={`${entry.completedAt}-${index}`}><b>{title(entry.session)}</b><span>{new Date(entry.completedAt).toLocaleDateString()}</span><small>{entry.exercises.reduce((sum, exercise) => sum + workingLogs(exercise).length, 0)} working sets · {title(entry.status || 'completed')} · {entry.gymId ? title(entry.gymId) : 'legacy gym unknown'}</small></div>) : <p>No completed workouts yet. History, PRs and trends will appear here.</p>}</section>
      <CapabilityTrendPanel history={history} activity={activity} readinessRecords={readinessRecords} assessments={assessments} preferences={preferences}/>
      <CapabilityAssessmentPanel assessments={assessments} onChange={setAssessments}/>
    </>}

    {tab === 'settings' && <SettingsPanel preferences={preferences} gyms={gyms} onChange={savePreferences} onDataCleared={resetLocalState}/>} 

    <nav className="bottom-nav" aria-label="Primary"><button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Today</button><button className={tab === 'progress' ? 'active' : ''} onClick={() => { setActivity(store.loadActivity()); setAssessments(store.loadAssessments()); setReadinessRecords(store.loadReadiness()); setTab('progress'); }}>Progress</button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button></nav>
  </main>;
}

function SetEntry({ defaultWeightKg, defaultReps, units, loadType, onLog }: { defaultWeightKg: number; defaultReps: number; units: UserPreferences['unitSystem']; loadType?: 'bodyweight' | 'external' | 'machine'; onLog: (log: SetLog) => void }) {
  const [weight, setWeight] = useState(Number(kgToDisplay(defaultWeightKg, units).toFixed(1)));
  const [reps, setReps] = useState(defaultReps);
  const [rir, setRir] = useState(2);
  const [warmup, setWarmup] = useState(false);
  const [pain, setPain] = useState(false);
  const [formQuality, setFormQuality] = useState<'poor' | 'okay' | 'good'>('good');
  const [note, setNote] = useState('');
  const loadLabel = loadType === 'bodyweight' ? `Added load (${units === 'imperial' ? 'lb' : 'kg'})` : `Weight (${units === 'imperial' ? 'lb' : 'kg'})`;
  const valid = Number.isFinite(weight) && weight >= 0 && Number.isFinite(reps) && reps > 0;
  return <div className="log-box"><label>{loadLabel}<input inputMode="decimal" type="number" min="0" step="0.5" value={weight} onChange={event => setWeight(Number(event.target.value))}/></label><label>{defaultReps > 25 ? 'Seconds' : 'Reps'}<input inputMode="numeric" type="number" min="1" value={reps} onChange={event => setReps(Number(event.target.value))}/></label><label>RIR<select value={rir} onChange={event => setRir(Number(event.target.value))}><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select></label><label>Form<select value={formQuality} onChange={event => setFormQuality(event.target.value as typeof formQuality)}><option value="good">Good</option><option value="okay">Okay</option><option value="poor">Broke down</option></select></label><label className="checkbox-row"><input type="checkbox" checked={warmup} onChange={event => setWarmup(event.target.checked)}/> Warm-up</label><label className="checkbox-row"><input type="checkbox" checked={pain} onChange={event => setPain(event.target.checked)}/> Pain/discomfort</label><label className="wide-field">Set note<input value={note} onChange={event => setNote(event.target.value)} placeholder="Optional technique or context note"/></label><button className="primary" disabled={!valid} onClick={() => onLog({ weight: displayToKg(weight, units), reps, rir, warmup, pain, formQuality, note: note.trim() || undefined, completedAt: new Date().toISOString() })}>{warmup ? 'Log warm-up' : pain ? 'Log set + flag' : 'Log working set'}</button></div>;
}

function PlateHelper({ targetKg, preferences }: { targetKg: number; preferences: UserPreferences }) {
  const plan = platePlan(targetKg, preferences.plateBarKg, preferences.availablePlatesKg);
  return <details><summary>Plate calculator · {kgToDisplay(targetKg, preferences.unitSystem).toFixed(1)} {preferences.unitSystem === 'imperial' ? 'lb' : 'kg'}</summary><p>{plan ? plan.length ? `Each side: ${plan.join(' + ')} kg on a ${preferences.plateBarKg} kg bar.` : `Empty ${preferences.plateBarKg} kg bar.` : 'That target cannot be loaded with the configured metric plate denominations.'}</p></details>;
}
