'use client';

import { useEffect, useMemo, useState } from 'react';
import { AthleticLevel, athleticLevelSession, recommendAthleticProgression } from '@/lib/athletic-progression';
import { GymProfile, HistoryEntry, SessionId } from '@/lib/domain';
import { coordinateCardio, powerAllowed, recentTrainingLoad } from '@/lib/load-management';
import { minimumEffectiveDay } from '@/lib/performance';
import { UserPreferences } from '@/lib/preferences';
import { store } from '@/lib/storage';
import {
  ActivityDose,
  Assessment,
  CardioModality,
  ReadinessInput,
  ReadinessRecord,
  athleticPlan,
  cardioOptions,
  cardioPrescription,
  corePrescription,
  microSessions,
  mobilityPrescription,
  progressionTracks,
  readinessDecisionFromRecords,
  readinessTrend,
} from '@/lib/whole-person';
import { cardioCoverage } from '@/lib/capability-trends';
import { FuelHabitsPanel } from './fuel-habits-panel';

const modalities: CardioModality[] = ['walk', 'run', 'cycle', 'row', 'incline-treadmill', 'other'];

function title(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function WholePersonDashboard({
  history,
  activity,
  readinessRecords,
  assessments,
  preferences,
  gym,
  nextSession,
  onActivityChange,
  onReadinessChange,
  fuelChecks,
  softHabitCompletions,
  enabledHabits,
  onFuelChecksChange,
  onSoftHabitCompletionsChange,
}: {
  history: HistoryEntry[];
  activity: ActivityDose[];
  readinessRecords: ReadinessRecord[];
  assessments: Assessment[];
  preferences: UserPreferences;
  gym: GymProfile;
  nextSession: SessionId;
  onActivityChange: (next: ActivityDose[]) => void;
  onReadinessChange: (next: ReadinessRecord[]) => void;
  fuelChecks?: any[];
  softHabitCompletions?: any[];
  enabledHabits?: any[];
  onFuelChecksChange?: (next: any[]) => void;
  onSoftHabitCompletionsChange?: (next: any[]) => void;
}) {
  const latestInput = readinessRecords.at(-1)?.input;
  const [check, setCheck] = useState<ReadinessInput>(latestInput || { sleep: 'okay', fatigue: 'moderate', soreness: 'low', stress: 'moderate', subjective: 3 });
  const [cardioMinutes, setCardioMinutes] = useState(20);
  const [cardioEffort, setCardioEffort] = useState<'easy' | 'moderate' | 'hard'>('moderate');
  const [cardioModality, setCardioModality] = useState<CardioModality>('walk');
  const [cardioKind, setCardioKind] = useState<'planned' | 'incidental'>('planned');
  const [availableMinutes, setAvailableMinutes] = useState(20);
  const [progressions, setProgressions] = useState<Record<string, string>>({});
  const [persistenceNotice, setPersistenceNotice] = useState('');

  useEffect(() => { setProgressions(store.loadProgressions()); }, []);
  useEffect(() => { if (latestInput) setCheck(latestInput); }, [latestInput]);

  const decision = readinessDecisionFromRecords(readinessRecords);
  const safetyHold = decision.level === 'recovery';
  const trend = readinessTrend(readinessRecords);
  const coverage = useMemo(() => cardioCoverage(activity, preferences.cardioTargetMinutes), [activity, preferences.cardioTargetMinutes]);
  const prescription = cardioPrescription(coverage.equivalentMinutes, preferences.cardioTargetMinutes, 30, decision.level);
  const load = useMemo(() => recentTrainingLoad(history, activity), [history, activity]);
  const cardioChoices = useMemo(
    () => coordinateCardio(cardioOptions(coverage.equivalentMinutes, preferences.cardioTargetMinutes, decision.level, 30), load, decision.level),
    [coverage.equivalentMinutes, preferences.cardioTargetMinutes, decision.level, load],
  );
  const core = corePrescription({ session: nextSession, equipment: gym.equipment, readiness: decision.level, recentLowerBody: load.lowerBodyRecent });
  const preparation = mobilityPrescription(nextSession, 'prepare', 6);
  const restore = mobilityPrescription(nextSession, 'restore', 10);
  const power = powerAllowed(load, decision.level, preferences.highImpactAllowed);
  const athletic = athleticPlan(assessments, decision.level, { highImpactAllowed: power.allowed, equipment: gym.equipment }).filter(plan => plan.domain !== 'power' || power.allowed);
  const minimumPlan = useMemo(() => minimumEffectiveDay({
    availableMinutes,
    activity,
    readiness: decision,
    mode: preferences.lifeMode,
    cardioTargetMinutes: preferences.cardioTargetMinutes,
    priorities: preferences.domainPriorities,
    equipment: gym.equipment,
  }), [availableMinutes, activity, decision.level, decision.volumeMultiplier, decision.allowProgression, preferences.lifeMode, preferences.cardioTargetMinutes, preferences.domainPriorities, gym.equipment]);

  const athleticProgressions = (['single-leg-balance', 'jump'] as const).map(metricId => {
    const level = (progressions[`athletic:${metricId}`] as AthleticLevel) || 'foundation';
    return {
      metricId,
      level,
      decision: recommendAthleticProgression({ metricId, assessments, currentLevel: level, readiness: decision.level, highImpactAllowed: preferences.highImpactAllowed }),
    };
  });

  function saveCheck() {
    const next = [...readinessRecords, { recordedAt: new Date().toISOString(), input: check }].slice(-90);
    if (!store.saveReadiness(next)) { setPersistenceNotice('The readiness check could not be saved in this browser.'); return; }
    setPersistenceNotice('Readiness check saved.');
    onReadinessChange(next);
  }

  function logDose(dose: ActivityDose) {
    const next = [...activity, dose];
    if (!store.saveActivity(next)) { setPersistenceNotice('The activity could not be saved in this browser.'); return false; }
    setPersistenceNotice('Activity saved.');
    onActivityChange(next);
    return true;
  }

  function logCardio() {
    logDose({ domain: 'cardio', minutes: cardioMinutes, effort: cardioEffort, modality: cardioModality, kind: cardioKind, source: 'manual', sessionId: `cardio:${cardioModality}`, completedAt: new Date().toISOString() });
  }

  function completeMinimumPlan() {
    const completedAt = new Date().toISOString();
    const doses = minimumPlan.sessionIds.flatMap(id => {
      const session = microSessions.find(item => item.id === id);
      return session ? [{
        domain: session.domain,
        minutes: session.minutes,
        effort: 'easy' as const,
        kind: 'planned' as const,
        source: 'manual' as const,
        quality: session.domain === 'strength' ? 0.35 : 1,
        sessionId: `minimum:${preferences.lifeMode}:${id}`,
        completedAt,
      }] : [];
    });
    if (!doses.length) return;
    const next = [...activity, ...doses];
    if (!store.saveActivity(next)) { setPersistenceNotice('The minimum-effective work could not be saved in this browser.'); return; }
    setPersistenceNotice('Minimum-effective work saved. A short strength dose is recorded as partial and does not count as a full strength session.');
    onActivityChange(next);
  }

  function selectProgression(trackId: string, levelId: string) {
    const next = { ...progressions, [trackId]: levelId };
    if (!store.saveProgressions(next)) { setPersistenceNotice('The progression level could not be saved.'); return; }
    setProgressions(next);
  }

  function applyAthleticProgression(metricId: 'single-leg-balance' | 'jump', level: AthleticLevel) {
    const next = { ...progressions, [`athletic:${metricId}`]: level };
    if (!store.saveProgressions(next)) { setPersistenceNotice('The athletic progression could not be saved.'); return; }
    setProgressions(next);
  }

  return <>
    {persistenceNotice && <div className="connection-state" role="status" aria-live="polite">{persistenceNotice}</div>}
    
    <section className="card">
      <h3>How are you feeling?</h3>
      <p className="muted" style={{fontSize: '.88rem', marginBottom: '14px'}}>Optional 10-second check-in</p>
      <div className="chip-grid" style={{gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}}>
        <button className={check.subjective === 5 ? 'active' : ''} onClick={() => setCheck({ ...check, subjective: 5 })}>Great</button>
        <button className={check.subjective === 3 ? 'active' : ''} onClick={() => setCheck({ ...check, subjective: 3 })}>Okay</button>
        <button className={check.subjective === 1 ? 'active' : ''} onClick={() => setCheck({ ...check, subjective: 1 })}>Low</button>
      </div>
      <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
        <button className="primary" style={{flex: 1}} onClick={saveCheck}>Save</button>
        <button className="ghost" onClick={() => setCheck(latestInput || { sleep: 'okay', fatigue: 'moderate', soreness: 'low', stress: 'moderate', subjective: 3 })}>Skip</button>
      </div>
      {decision.level !== 'normal' && <p className="muted" style={{fontSize: '.86rem', marginTop: '12px'}}>{decision.reasons[0] || 'Adjusted for recovery'}</p>}
    </section>

    {readinessRecords.length > 0 && <details style={{marginBottom: '20px'}}>
      <summary>Detailed check-in</summary>
      <div className="settings-grid" style={{marginTop: '16px'}}>
        <label><b>Sleep</b><select value={check.sleep || 'okay'} onChange={event => setCheck({ ...check, sleep: event.target.value as ReadinessInput['sleep'] })}><option value="poor">Poor</option><option value="okay">Okay</option><option value="good">Good</option></select></label>
        <label><b>Sleep hours</b><input type="number" min="0" max="16" step="0.25" value={check.sleepHours ?? ''} onChange={event => setCheck({ ...check, sleepHours: event.target.value ? Number(event.target.value) : undefined })}/></label>
        <label><b>Fatigue</b><select value={check.fatigue || 'moderate'} onChange={event => setCheck({ ...check, fatigue: event.target.value as ReadinessInput['fatigue'] })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Soreness</b><select value={check.soreness || 'low'} onChange={event => setCheck({ ...check, soreness: event.target.value as ReadinessInput['soreness'] })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
      </div>
      <div className="toggle-grid" style={{marginTop: '12px'}}><button className={check.pain ? 'active warning' : ''} onClick={() => setCheck({ ...check, pain: !check.pain })}>Pain {check.pain ? '✓' : ''}</button><button className={check.illness ? 'active warning' : ''} onClick={() => setCheck({ ...check, illness: !check.illness })}>Illness {check.illness ? '✓' : ''}</button></div>
    </details>}

    {!safetyHold && <details style={{marginBottom: '20px'}}>
      <summary>Cardio & movement</summary>
      <div style={{marginTop: '16px'}}>
        <div className="metrics" style={{marginBottom: '16px'}}>
          <span><b>{Math.round(coverage.equivalentMinutes)}</b>min this week</span>
          <span style={{opacity: .6}}><b>{preferences.cardioTargetMinutes}</b>target</span>
        </div>
        <div className="settings-grid">
          <label><b>Minutes</b><input type="number" min="1" max="240" value={cardioMinutes} onChange={event => setCardioMinutes(Math.max(1, Number(event.target.value)))}/></label>
          <label><b>Type</b><select value={cardioModality} onChange={event => setCardioModality(event.target.value as CardioModality)}>{modalities.map(item => <option key={item} value={item}>{title(item)}</option>)}</select></label>
        </div>
        <button className="primary" style={{marginTop: '12px'}} onClick={logCardio}>Log activity</button>
      </div>
    </details>}


    <section className="card" aria-labelledby="minimum-day-title">
      <h2 id="minimum-day-title">Quick workout option</h2>
      <p className="muted">Use a short fallback when life changes. It contributes to the relevant domains without pretending to equal the full planned workout.</p>
      <label><b>Available minutes</b><input type="number" min="5" max="120" value={availableMinutes} onChange={event => setAvailableMinutes(Math.max(5, Number(event.target.value) || 5))}/></label>
      <div className="coach-note"><b>{title(preferences.lifeMode)} plan · {minimumPlan.minutes} min</b><br/>{minimumPlan.message}{minimumPlan.sessionIds.length ? ` Suggested: ${minimumPlan.sessionIds.map(id => microSessions.find(item => item.id === id)?.name || title(id)).join(' + ')}.` : ''}</div>
      {minimumPlan.sessionIds.length > 0 && <button className="primary" onClick={completeMinimumPlan}>Mark suggested work done</button>}
    </section>

    <section className="card" aria-labelledby="movement-support-title">
      <h2 id="movement-support-title">Core, mobility & athletic work</h2>
      {safetyHold ? <div className="coach-note"><b>Movement suggestions paused</b><br/>Pain or illness is currently flagged. This app does not substitute mobility, core, balance, or other lower-intensity exercise as clearance to train.</div> : <>
        <div className="history"><b>{preparation.name}</b><span>{preparation.minutes} min</span><small>{preparation.items.join(' · ')} · {preparation.reason}</small><button className="link" onClick={() => logDose({ domain: 'mobility', minutes: preparation.minutes, effort: 'easy', source: 'manual', kind: 'planned', sessionId: preparation.id, completedAt: new Date().toISOString() })}>Mark preparation done</button></div>
        <div className="history"><b>{restore.name}</b><span>{restore.minutes} min</span><small>{restore.items.join(' · ')} · {restore.reason}</small><button className="link" onClick={() => logDose({ domain: 'mobility', minutes: restore.minutes, effort: 'easy', source: 'manual', kind: 'planned', sessionId: restore.id, completedAt: new Date().toISOString() })}>Mark mobility done</button></div>
        {core.map(session => <div className="history" key={session.id}><b>{session.name}</b><span>{session.minutes} min</span><small>{session.items.join(' · ')}</small><button className="link" onClick={() => logDose({ domain: 'core', minutes: session.minutes, effort: session.fatigue === 'low' ? 'easy' : 'moderate', source: 'manual', kind: 'planned', sessionId: session.id, completedAt: new Date().toISOString() })}>Mark core done</button></div>)}
        {athletic.map(plan => <div className="history" key={plan.domain}><b>{plan.name}</b><span>{plan.impact} impact</span><small>{plan.items.join(' · ')} · {plan.reason}</small><button className="link" onClick={() => logDose({ domain: plan.domain, minutes: 10, effort: plan.impact === 'low' ? 'easy' : 'moderate', source: 'manual', kind: 'planned', sessionId: `athletic:${plan.domain}`, completedAt: new Date().toISOString() })}>Mark 10 min done</button></div>)}
        {!power.allowed && <div className="coach-note"><b>Power held today</b><br/>{power.reason}</div>}
      </>}
    </section>

    {!safetyHold && <section className="card" aria-labelledby="progressions-title">
      <h2 id="progressions-title">Core and mobility progressions</h2>
      <p className="muted">Choose the highest level you can perform cleanly. Completion is logged separately from the selected level so history is not rewritten.</p>
      {progressionTracks.map(track => {
        const current = track.levels.find(level => level.id === progressions[track.id]) || track.levels[0];
        return <div className="skill-block" key={track.id}><b>{track.name} · {current.name}</b><p className="muted">{current.target}</p><small>{current.items.join(' · ')}</small><div className="chip-grid">{track.levels.map(level => <button key={level.id} className={level.id === current.id ? 'active' : ''} aria-pressed={level.id === current.id} onClick={() => selectProgression(track.id, level.id)}>{level.name}</button>)}</div><button className="link" onClick={() => logDose({ domain: track.domain, minutes: 8, effort: 'easy', source: 'manual', kind: 'planned', quality: 1, sessionId: `${track.id}:${current.id}`, completedAt: new Date().toISOString() })}>Record current-level practice</button></div>;
      })}
    </section>}

    {!safetyHold && <section className="card" aria-labelledby="athletic-progression-title">
      <h2 id="athletic-progression-title">Athletic progression</h2>
      <p className="muted">Balance and jump difficulty changes only after repeated comparable benchmarks. Readiness and the high-impact preference can hold progression.</p>
      {athleticProgressions.map(item => <div className="history" key={item.metricId}><b>{item.metricId === 'jump' ? 'Jump / power' : 'Single-leg balance'} · {title(item.level)}</b><span>{item.decision.evidenceCount} tests</span><small>{item.decision.message} Current work: {athleticLevelSession(item.metricId, item.level).join(' · ')}</small>{item.decision.action !== 'hold' && <button className="link" onClick={() => applyAthleticProgression(item.metricId, item.decision.nextLevel)}>Apply {item.decision.action}: {title(item.decision.nextLevel)}</button>}</div>)}
    </section>}

    {fuelChecks && softHabitCompletions && enabledHabits && onFuelChecksChange && onSoftHabitCompletionsChange && (
      <FuelHabitsPanel 
        fuelChecks={fuelChecks} 
        softHabitCompletions={softHabitCompletions} 
        enabledHabits={enabledHabits}
        onFuelChecksChange={onFuelChecksChange}
        onSoftHabitCompletionsChange={onSoftHabitCompletionsChange}
      />
    )}

  </>;
}

export { SkillProgressPanel } from './skill-progress-panel';
export { CapabilityAssessmentPanel } from './capability-assessment-panel';
