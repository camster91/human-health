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
import { Icon } from './icon-component';
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
  const [tab, setTab] = useState<'today' | 'log' | 'progress' | 'settings'>('today');
  const [notes, setNotes] = useState<string[]>([]);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [saveSwap, setSaveSwap] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const [fuelChecks, setFuelChecks] = useState<any[]>([]);
  const [softHabitCompletions, setSoftHabitCompletions] = useState<any[]>([]);

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
    setFuelChecks(store.loadFuelChecks());
    setSoftHabitCompletions(store.loadSoftHabitCompletions());
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
    const currentExercise = active.exercises.find((ex, idx) => workingLogs(ex).length < ex.sets && !ex.deferred) || active.exercises[0];
    const currentIndex = active.exercises.indexOf(currentExercise);
    const working = currentExercise ? workingLogs(currentExercise) : [];
    
    return <main className="workout-shell session-view">
      {storageWarning && <div className="connection-state storage-error" role="alert">{storageWarning}</div>}
      <header className="session-header">
        <button className="ghost icon-only" onClick={() => finishWorkout('ended-early')} aria-label="Close">✕</button>
        <div className="session-timer">
          <Icon name="timer" style={{fontSize: '.9rem'}} />
          <span>{Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60000)}:{String(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000) % 60).padStart(2, '0')}</span>
        </div>
        <button className="ghost icon-only" style={{visibility: 'hidden'}}>⋯</button>
      </header>

      {currentExercise && active.status === 'active' && (
        <div className="current-exercise-focus">
          <span className="set-pill">→ SET {working.length + 1} / {currentExercise.sets}</span>
          <h2 className="exercise-name">{currentExercise.name}</h2>
          <p className="exercise-details">{currentExercise.sets} × L · 50 lb</p>
        </div>
      )}

      {active.status !== 'active' && <section className="card paused-card"><h2>{active.status === 'interrupted' ? 'Welcome back' : 'Paused'}</h2><p>Sets saved. Resume when ready.</p><button className="primary" onClick={resumeWorkout}>Resume</button></section>}
      {showAddExercise && active.status === 'active' && <section className="card"><h2>Add exercise</h2><div className="choice-grid">{addOptions.map(exercise => <button key={exercise.id} onClick={() => addExercise(exercise.id)}><b>{exercise.name}</b><small>{title(exercise.movement)} · {exercise.repRange[0]}–{exercise.repRange[1]}</small></button>)}</div>{!addOptions.length && <p className="muted">No exercises available with current equipment.</p>}</section>}
      {notes.length > 0 && <div className="coach-tip"><Icon name="activity" style={{fontSize: '1rem', color: 'var(--accent)', flexShrink: 0}} /><span>{notes.join(' ')}</span></div>}
      {active.progressionAllowed === false && active.progressionReason && <div className="coach-tip"><Icon name="activity" style={{fontSize: '1rem', color: 'var(--accent)', flexShrink: 0}} /><span><b>Progression paused</b> — {active.progressionReason}</span></div>}
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
          <div className="exercise-title"><div><span className="pill">{exercise.deferred ? 'DEFERRED' : exercise.optional ? 'OPTIONAL' : `SET ${working.length + 1}/${exercise.sets}`}</span><h2>{exercise.name}</h2><p>{exercise.sets} sets · {exercise.repRange[0]}–{exercise.repRange[1]} {exercise.repRange[1] > 25 && exercise.movement === 'core' ? 'sec' : 'reps'}{previousWorkingWeight ? ` · ${kgToDisplay(previousWorkingWeight, preferences.unitSystem).toFixed(0)} ${preferences.unitSystem === 'imperial' ? 'lb' : 'kg'}` : ''}</p></div><div className="exercise-tools"><button className="link" disabled={active.status !== 'active' || exerciseComplete || exercise.deferred} onClick={() => setSwapIndex(swapIndex === exerciseIndex ? null : exerciseIndex)}>Swap</button><button className="link" disabled={active.status !== 'active' || exerciseComplete} onClick={() => toggleDeferred(exerciseIndex)}>{exercise.deferred ? 'Restore' : exercise.optional ? 'Remove' : 'Defer'}</button></div></div>
          {previous && <div className="previous">Last: {workingLogs(previous).map(set => formatSet(previous, set, preferences.unitSystem)).join(' · ') || 'No prior sets'}</div>}
          <div className="set-grid">{Array.from({ length: exercise.sets }).map((_, index) => <div className={index < working.length ? 'set done' : 'set'} key={index}><b>Set {index + 1}</b><span>{working[index] ? `${formatSet(exercise, working[index], preferences.unitSystem)}${working[index].pain ? ' · pain' : ''}${working[index].formQuality === 'poor' ? ' · form broke' : ''}` : exercise.deferred ? 'Deferred' : '—'}</span></div>)}</div>
          {exercise.logs.some(set => set.warmup) && <p className="muted" style={{fontSize: '.8rem', margin: '6px 0'}}>Warm-ups: {exercise.logs.filter(set => set.warmup).length}</p>}
          {active.status === 'active' && !exerciseComplete && !exercise.deferred && <SetEntry key={`${exercise.id}-${exercise.logs.length}`} defaultWeightKg={defaultWeightKg} defaultReps={exercise.repRange[0]} units={preferences.unitSystem} loadType={exercise.metadata?.loadType} onLog={log => logSet(exerciseIndex, log)}/>} 
          {exercise.equipment.includes('barbell') && <PlateHelper targetKg={working.at(-1)?.weight ?? previousWorkingWeight ?? preferences.plateBarKg} preferences={preferences}/>} 
          {suggestion.message && !exercise.deferred && <div className="coach-tip" style={{marginTop: '10px'}}>
            <Icon name="activity" style={{fontSize: '1rem', color: 'var(--accent)', flexShrink: 0}}/>
            <span>{suggestion.message}</span>
          </div>}
          {swapIndex === exerciseIndex && <div className="swap-panel"><h3>Swap options</h3>{options.length ? options.map(option => <button key={option.exercise.id} onClick={() => selectSwap(exerciseIndex, option.exercise.id)}><b>{option.exercise.name}{option.preferred ? ' · preferred' : ''}</b><small>{option.reason}</small></button>) : <p className="muted">No compatible replacement available.</p>}<label className="checkbox-row"><input type="checkbox" checked={saveSwap} onChange={event => setSaveSwap(event.target.checked)}/> Remember for {activeGym.name}</label></div>}
        </section>;
      })}
      <div className="workout-actions"><button className="primary" disabled={active.status !== 'active' || !requiredHandled} title={!requiredHandled ? 'Complete or defer required exercises first.' : undefined} onClick={() => finishWorkout(hasDeferredRequired ? 'ended-early' : 'completed')}>Log · next</button><button className="danger" onClick={() => finishWorkout('abandoned')}>Abandon</button></div>
      {!requiredHandled && <p className="muted">Complete required exercises (or defer) to finish, or end early.</p>}
      {restTimer && <div className="rest-dock" role="timer" aria-label={`Rest timer: ${restSeconds} seconds remaining`}>
        <div className="timer-display">
          <div className="timer-circle">
            <span>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}</span>
          </div>
          <div className="timer-label">REST</div>
        </div>
        <div className="timer-actions">
          {restTimer.status === 'running' ? <button onClick={() => setRestTimer(timer => pauseRestTimer(timer))}>Pause</button> : <button onClick={() => setRestTimer(timer => resumeRestTimer(timer))}>Resume</button>}
          <button onClick={() => setRestTimer(timer => extendRestTimer(timer, 30))}>+30s</button>
          <button onClick={() => setRestTimer(null)}>Skip</button>
        </div>
      </div>}
    </main>;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  
  return <main className="app-shell">
    {tab === 'today' && <header className="today-header">
      <div>
        <span className="date-label">{dateStr}</span>
        <h1>Today</h1>
      </div>
      <button className="avatar-btn" aria-label="Profile">
        <Icon name="user" />
      </button>
    </header>}
    {tab !== 'today' && <header><div><span className="eyebrow">{tab === 'log' ? 'This week' : tab === 'progress' ? '' : 'HUMAN HEALTH'}</span><h1>{title(tab)}</h1></div>{tab !== 'settings' && tab !== 'log' && <select value={gym.id} onChange={event => savePreferences({ ...preferences, selectedGymId: event.target.value })} aria-label="Gym profile">{gyms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</header>}

    {tab === 'today' && <>
      {history.length === 0 ? <>
        <section className="hero-card">
          <div className="hero-content">
            <div className="hero-text">
              <span className="pill-accent">→ UP NEXT</span>
              <h2>Upper · 40m</h2>
              <p className="hero-subtitle">Push · DB · 7 moves</p>
              <p className="coach-inline">Load up 5% on press — last set was clean.</p>
              <button className="primary" onClick={() => startWorkout()}>Start →</button>
            </div>
            <div className="hero-illustration">
              <div className="illustration-circle">
                <Icon name="dumbbell" style={{fontSize: '2.5rem', color: 'var(--accent)', opacity: 0.9}} />
              </div>
            </div>
          </div>
        </section>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-header">
              <Icon name="energy" style={{fontSize: '1.1rem', color: 'var(--accent)'}}/>
              <span className="metric-label">ENERGY</span>
            </div>
            <div className="metric-value">7 <span className="metric-unit">/10</span></div>
            <p className="metric-desc">Solid for heavy upper</p>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <Icon name="sleep" style={{fontSize: '1.1rem', color: 'var(--accent)'}}/>
              <span className="metric-label">SLEEP</span>
            </div>
            <div className="sleep-ring">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--line)" strokeWidth="6"/>
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray="176" strokeDashoffset="44" transform="rotate(-90 32 32)" strokeLinecap="round"/>
              </svg>
              <div className="sleep-value">7h20</div>
            </div>
          </div>
        </div>

        <section className="card">
          <div className="section-header">
            <Icon name="timer" style={{fontSize: '1rem', color: 'var(--accent)'}}/>
            <h3>CHECK-IN</h3>
            <span className="time-badge">· 10s</span>
          </div>
          <div className="chip-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px'}}>
            <button className="check-in-chip">
              <Icon name="checkmark" style={{fontSize: '1.3rem'}} />
              <span>Ready</span>
            </button>
            <button className="check-in-chip">
              <Icon name="energy" style={{fontSize: '1.3rem'}} />
              <span>Flat</span>
            </button>
            <button className="check-in-chip">
              <Icon name="activity" style={{fontSize: '1.3rem'}} />
              <span>Sore</span>
            </button>
            <button className="check-in-chip">
              <Icon name="trend-up" style={{fontSize: '1.3rem'}} />
              <span>Peak</span>
            </button>
          </div>
        </section>

        <section className="week-plan-card">
          <div className="week-plan-header">
            <Icon name="dumbbell" style={{fontSize: '1rem', color: 'var(--accent)'}}/>
            <span>Week plan · Upper today · Lower Mon · Zone-2 Wed</span>
          </div>
        </section>
      </> : <>
        <section className="hero-card">
          <div className="hero-content">
            <div className="hero-text">
              <span className="pill-accent">→ {rolling.manual ? 'CUSTOM' : rolling.repeating ? 'REPEAT' : 'UP NEXT'}</span>
              <h2>{title(rolling.session)} · 40m</h2>
              <p className="hero-subtitle">Push · DB · 7 moves</p>
              {latestReadiness.level !== 'normal' && <p className="coach-inline"><b>Adjusted volume</b> — {latestReadiness.reasons.join(' ')}</p>}
              {latestReadiness.level === 'normal' && <p className="coach-inline">Load up 5% on press — last set was clean.</p>}
              <button className="primary" onClick={() => startWorkout()}>Start →</button>
            </div>
            <div className="hero-illustration">
              <div className="illustration-circle">
                <Icon name="dumbbell" style={{fontSize: '2.5rem', color: 'var(--accent)', opacity: 0.9}} />
              </div>
            </div>
          </div>
        </section>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-header">
              <Icon name="energy" style={{fontSize: '1.1rem', color: 'var(--accent)'}}/>
              <span className="metric-label">ENERGY</span>
            </div>
            <div className="metric-value">7 <span className="metric-unit">/10</span></div>
            <p className="metric-desc">Solid for heavy upper</p>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <Icon name="sleep" style={{fontSize: '1.1rem', color: 'var(--accent)'}}/>
              <span className="metric-label">SLEEP</span>
            </div>
            <div className="sleep-ring">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--line)" strokeWidth="6"/>
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray="176" strokeDashoffset="44" transform="rotate(-90 32 32)" strokeLinecap="round"/>
              </svg>
              <div className="sleep-value">7h20</div>
            </div>
          </div>
        </div>

        <section className="card">
          <div className="section-header">
            <Icon name="timer" style={{fontSize: '1rem', color: 'var(--accent)'}}/>
            <h3>CHECK-IN</h3>
            <span className="time-badge">· 10s</span>
          </div>
          <div className="chip-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px'}}>
            <button className="check-in-chip">
              <Icon name="checkmark" style={{fontSize: '1.3rem'}} />
              <span>Ready</span>
            </button>
            <button className="check-in-chip">
              <Icon name="energy" style={{fontSize: '1.3rem'}} />
              <span>Flat</span>
            </button>
            <button className="check-in-chip">
              <Icon name="activity" style={{fontSize: '1.3rem'}} />
              <span>Sore</span>
            </button>
            <button className="check-in-chip">
              <Icon name="trend-up" style={{fontSize: '1.3rem'}} />
              <span>Peak</span>
            </button>
          </div>
        </section>

        <section className="week-plan-card">
          <div className="week-plan-header">
            <Icon name="dumbbell" style={{fontSize: '1rem', color: 'var(--accent)'}}/>
            <span>Week plan · Upper today · Lower Mon · Zone-2 Wed</span>
          </div>
        </section>

        {notes.length > 0 && <section className="card" aria-labelledby="coach-insights-title">
          <h2 id="coach-insights-title" style={{fontSize: '1rem', marginBottom: '12px'}}>Coach</h2>
          {notes.map((note, index) => <div className="coach-tip" key={index} style={{margin: '8px 0'}}>
            <Icon name="activity" style={{fontSize: '1rem', color: 'var(--accent)', flexShrink: 0}}/>
            <span>{note}</span>
          </div>)}
        </section>}

        <section aria-labelledby="plans-changed-title">
          <h2 id="plans-changed-title">Quick adjust</h2>
          <div className="quick-grid">
            <button onClick={() => startWorkout({ minutes: 20 })}>20 min</button>
            <button onClick={() => startWorkout({ minutes: 30 })}>30 min</button>
            <button onClick={() => startWorkout({ lowEnergy: true, volumeMultiplier: 0.8 })}>Low energy</button>
            <button onClick={() => startWorkout({ gym: gyms.find(item => item.id === 'hotel') || gym, mode: 'travel' })}>Travel</button>
          </div>
        </section>

        <WholePersonDashboard history={history} activity={activity} readinessRecords={readinessRecords} assessments={assessments} preferences={preferences} gym={gym} nextSession={rolling.session} onActivityChange={setActivity} onReadinessChange={setReadinessRecords} fuelChecks={fuelChecks} softHabitCompletions={softHabitCompletions} onFuelChecksChange={setFuelChecks} onSoftHabitCompletionsChange={setSoftHabitCompletions}/>
        <SkillProgressPanel gym={gym}/>
      </>}
    </>}

    {tab === 'log' && <>
      <section className="card log-hero">
        <div className="log-numeral-row">
          <div className="log-main-stat">
            <div className="athletic-numeral">{history.filter(e => new Date(e.completedAt).getTime() > Date.now() - 7 * 86400000).length}</div>
            <p className="stat-caption">sessions · 2h 14m</p>
          </div>
          <div className="mini-bars">
            <div className="bar" style={{height: '45%', background: 'var(--accent)'}}></div>
            <div className="bar" style={{height: '65%', background: 'var(--accent)'}}></div>
            <div className="bar" style={{height: '80%', background: 'var(--accent)'}}></div>
            <div className="bar" style={{height: '40%', background: 'var(--line)'}}></div>
          </div>
        </div>
        
        <div className="week-section">
          <div className="week-header">
            <span className="week-label">WEEK</span>
            <span className="week-count">3 of 4 planned</span>
          </div>
          <div className="week-dots-compact">
            {history.filter(e => new Date(e.completedAt).getTime() > Date.now() - 7 * 86400000).length > 0 ? (
              <>
                <div className="day-dot-small completed"><span>M</span></div>
                <div className="day-dot-small empty"><span>T</span></div>
                <div className="day-dot-small completed"><span>W</span></div>
                <div className="day-dot-small empty"><span>T</span></div>
                <div className="day-dot-small completed"><span>F</span></div>
                <div className="day-dot-small empty-large"><span>S</span></div>
                <div className="day-dot-small empty"><span>S</span></div>
              </>
            ) : (
              <>
                <div className="day-dot-small empty"><span>M</span></div>
                <div className="day-dot-small empty"><span>T</span></div>
                <div className="day-dot-small empty"><span>W</span></div>
                <div className="day-dot-small empty"><span>T</span></div>
                <div className="day-dot-small empty"><span>F</span></div>
                <div className="day-dot-small empty"><span>S</span></div>
                <div className="day-dot-small empty"><span>S</span></div>
              </>
            )}
          </div>
        </div>
      </section>
      
      {history.length > 0 && <section className="card coach-card">
        <div className="coach-card-header">
          <Icon name="activity" style={{fontSize: '1rem', color: 'var(--accent)'}} />
          <span className="coach-label">COACH</span>
        </div>
        <p className="coach-message">Press trend +6% over 3 weeks. Keep Wed Zone-2.</p>
      </section>}
      
      <div className="stats-rows">
        <div className="stat-row">
          <div className="stat-icon">
            <Icon name="dumbbell" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Volume</div>
            <div className="stat-value">{history.filter(e => new Date(e.completedAt).getTime() > Date.now() - 7 * 86400000).reduce((sum, e) => sum + e.exercises.reduce((s, ex) => s + workingLogs(ex).length, 0), 0)} sets</div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-icon">
            <Icon name="timer" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Avg duration</div>
            <div className="stat-value">{Math.floor(history.filter(e => new Date(e.completedAt).getTime() > Date.now() - 7 * 86400000).reduce((sum, e) => sum + ((e.startedAt ? new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime() : 0) / 60000), 0) / Math.max(1, history.filter(e => new Date(e.completedAt).getTime() > Date.now() - 7 * 86400000).length))} min</div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-icon">
            <Icon name="trend-up" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Progress</div>
            <div className="stat-value">+12% load</div>
          </div>
        </div>
      </div>

      <section className="card" aria-labelledby="history-title"><h2 id="history-title">Recent</h2>{history.length ? [...history].reverse().slice(0, 10).map((entry, index) => <div className="history" key={`${entry.completedAt}-${index}`}><b>{title(entry.session)}</b><span>{new Date(entry.completedAt).toLocaleDateString()}</span><small>{entry.exercises.reduce((sum, exercise) => sum + workingLogs(exercise).length, 0)} sets · {Math.floor((entry.startedAt ? new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime() : 0) / 60000)} min</small></div>) : <p>No workouts yet.</p>}</section>
      <CapabilityTrendPanel history={history} activity={activity} readinessRecords={readinessRecords} assessments={assessments} preferences={preferences}/>
      <CapabilityAssessmentPanel assessments={assessments} onChange={setAssessments}/>
    </>}

    {tab === 'progress' && <>
      <section className="card"><h2>Progress & Health</h2><p>Connect Apple Health, track readiness, and see how sleep and activity influence training.</p><div className="button-row"><a href="/health" className="primary" style={{display: 'inline-block', textDecoration: 'none', textAlign: 'center'}}>Open health tracking</a></div></section>
    </>}

    {tab === 'settings' && <SettingsPanel preferences={preferences} gyms={gyms} onChange={savePreferences} onDataCleared={resetLocalState}/>} 

    <nav className="bottom-nav" aria-label="Primary">
      <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
        <Icon name="dumbbell" />
        <span>Today</span>
      </button>
      <button className={tab === 'log' ? 'active' : ''} onClick={() => { setActivity(store.loadActivity()); setAssessments(store.loadAssessments()); setReadinessRecords(store.loadReadiness()); setTab('log'); }}>
        <Icon name="trend-up" />
        <span>Lift</span>
      </button>
      <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}>
        <Icon name="activity" />
        <span>Log</span>
      </button>
      <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
        <Icon name="user" />
        <span>You</span>
      </button>
    </nav>
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
  return <details><summary>Plates · {kgToDisplay(targetKg, preferences.unitSystem).toFixed(1)} {preferences.unitSystem === 'imperial' ? 'lb' : 'kg'}</summary><p>{plan ? plan.length ? `Each side: ${plan.join(' + ')} kg on ${preferences.plateBarKg} kg bar.` : `Empty ${preferences.plateBarKg} kg bar.` : 'Target cannot be loaded with configured plates.'}</p></details>;
}
