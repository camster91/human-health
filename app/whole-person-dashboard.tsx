'use client';

import { useEffect, useMemo, useState } from 'react';
import { AthleticLevel, athleticLevelSession, recommendAthleticProgression } from '@/lib/athletic-progression';
import { GymProfile, HistoryEntry, SessionId } from '@/lib/domain';
import { coordinateCardio, powerAllowed, recentTrainingLoad } from '@/lib/load-management';
import { availableSkillTrees, minimumEffectiveDay, recommendSkillProgression, SkillAssessment } from '@/lib/performance';
import { UserPreferences } from '@/lib/preferences';
import { store } from '@/lib/storage';
import {
  ActivityDose,
  Assessment,
  CardioModality,
  ReadinessInput,
  ReadinessRecord,
  athleticPlan,
  capabilityMetrics,
  cardioOptions,
  cardioPrescription,
  corePrescription,
  latestAssessment,
  microSessions,
  mobilityPrescription,
  progressionTracks,
  readinessDecision,
  readinessTrend,
  skillTrees,
} from '@/lib/whole-person';
import { cardioCoverage } from '@/lib/capability-trends';

const modalities: CardioModality[] = ['walk', 'run', 'cycle', 'row', 'incline-treadmill', 'other'];
const assessmentMetricIds = ['pullups', 'dead-hang', 'ankle-mobility', 'single-leg-balance', 'jump', 'carry'];

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
}) {
  const latestInput = readinessRecords.at(-1)?.input;
  const [check, setCheck] = useState<ReadinessInput>(latestInput || { sleep: 'okay', fatigue: 'moderate', soreness: 'low', stress: 'moderate', subjective: 3 });
  const [cardioMinutes, setCardioMinutes] = useState(20);
  const [cardioEffort, setCardioEffort] = useState<'easy' | 'moderate' | 'hard'>('moderate');
  const [cardioModality, setCardioModality] = useState<CardioModality>('walk');
  const [cardioKind, setCardioKind] = useState<'planned' | 'incidental'>('planned');
  const [availableMinutes, setAvailableMinutes] = useState(20);
  const [progressions, setProgressions] = useState<Record<string, string>>({});

  useEffect(() => { setProgressions(store.loadProgressions()); }, []);
  useEffect(() => { if (latestInput) setCheck(latestInput); }, [latestInput]);

  const decision = readinessDecision(latestInput || {});
  const trend = readinessTrend(readinessRecords);
  const coverage = useMemo(() => cardioCoverage(activity, preferences.cardioTargetMinutes), [activity, preferences.cardioTargetMinutes]);
  const prescription = cardioPrescription(coverage.equivalentMinutes, preferences.cardioTargetMinutes, 30);
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
    store.saveReadiness(next);
    onReadinessChange(next);
  }

  function logDose(dose: ActivityDose) {
    const next = [...activity, dose];
    store.saveActivity(next);
    onActivityChange(next);
  }

  function logCardio() {
    logDose({ domain: 'cardio', minutes: cardioMinutes, effort: cardioEffort, modality: cardioModality, kind: cardioKind, source: 'manual', sessionId: `cardio:${cardioModality}`, completedAt: new Date().toISOString() });
  }

  function completeMinimumPlan() {
    const completedAt = new Date().toISOString();
    const doses = minimumPlan.sessionIds.flatMap(id => {
      const session = microSessions.find(item => item.id === id);
      return session ? [{ domain: session.domain, minutes: session.minutes, effort: 'easy' as const, kind: 'planned' as const, source: 'manual' as const, quality: 1, sessionId: `minimum:${preferences.lifeMode}:${id}`, completedAt }] : [];
    });
    if (!doses.length) return;
    const next = [...activity, ...doses];
    store.saveActivity(next);
    onActivityChange(next);
  }

  function selectProgression(trackId: string, levelId: string) {
    const next = { ...progressions, [trackId]: levelId };
    store.saveProgressions(next);
    setProgressions(next);
  }

  function applyAthleticProgression(metricId: 'single-leg-balance' | 'jump', level: AthleticLevel) {
    const next = { ...progressions, [`athletic:${metricId}`]: level };
    store.saveProgressions(next);
    setProgressions(next);
  }

  return <>
    <section className="card" aria-labelledby="readiness-title">
      <h2 id="readiness-title">Readiness</h2>
      <p className="muted">This optional check adjusts training demand. It does not diagnose illness, injury, or glucose-related concerns.</p>
      <div className="settings-grid">
        <label><b>Sleep quality</b><select value={check.sleep || 'okay'} onChange={event => setCheck({ ...check, sleep: event.target.value as ReadinessInput['sleep'] })}><option value="poor">Poor</option><option value="okay">Okay</option><option value="good">Good</option></select></label>
        <label><b>Sleep hours</b><input type="number" min="0" max="16" step="0.25" value={check.sleepHours ?? ''} onChange={event => setCheck({ ...check, sleepHours: event.target.value ? Number(event.target.value) : undefined })}/></label>
        <label><b>Fatigue</b><select value={check.fatigue || 'moderate'} onChange={event => setCheck({ ...check, fatigue: event.target.value as ReadinessInput['fatigue'] })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Soreness</b><select value={check.soreness || 'low'} onChange={event => setCheck({ ...check, soreness: event.target.value as ReadinessInput['soreness'] })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>Stress</b><select value={check.stress || 'moderate'} onChange={event => setCheck({ ...check, stress: event.target.value as ReadinessInput['stress'] })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label><b>How ready do you feel?</b><select value={check.subjective || 3} onChange={event => setCheck({ ...check, subjective: Number(event.target.value) as ReadinessInput['subjective'] })}><option value="1">1 — very low</option><option value="2">2 — low</option><option value="3">3 — okay</option><option value="4">4 — good</option><option value="5">5 — excellent</option></select></label>
      </div>
      <div className="toggle-grid"><button className={check.pain ? 'active warning' : ''} aria-pressed={Boolean(check.pain)} onClick={() => setCheck({ ...check, pain: !check.pain })}>Unusual pain {check.pain ? 'flagged' : 'not flagged'}</button><button className={check.illness ? 'active warning' : ''} aria-pressed={Boolean(check.illness)} onClick={() => setCheck({ ...check, illness: !check.illness })}>Illness {check.illness ? 'flagged' : 'not flagged'}</button><button className="primary" onClick={saveCheck}>Save check-in</button></div>
      <div className="coach-note"><b>{decision.level === 'normal' ? 'Normal training available' : decision.level === 'reduced' ? 'Conservative training recommended' : 'Recovery-first recommendation'}</b><br/>{decision.reasons.join(' ') || 'No major recovery constraints are recorded in the latest check-in.'}</div>
      <p className="muted"><b>Seven-day pattern:</b> {trend.message}</p>
    </section>

    <section className="card" aria-labelledby="minimum-day-title">
      <h2 id="minimum-day-title">Minimum-effective day</h2>
      <p className="muted">Use a short fallback when life changes. It contributes to the relevant domains without pretending to equal the full planned workout.</p>
      <label><b>Available minutes</b><input type="number" min="5" max="120" value={availableMinutes} onChange={event => setAvailableMinutes(Math.max(5, Number(event.target.value) || 5))}/></label>
      <div className="coach-note"><b>{title(preferences.lifeMode)} plan · {minimumPlan.minutes} min</b><br/>{minimumPlan.message}{minimumPlan.sessionIds.length ? ` Suggested: ${minimumPlan.sessionIds.map(id => microSessions.find(item => item.id === id)?.name || title(id)).join(' + ')}.` : ''}</div>
      {minimumPlan.sessionIds.length > 0 && <button className="primary" onClick={completeMinimumPlan}>Mark suggested work done</button>}
    </section>

    <section className="card" aria-labelledby="cardio-title">
      <h2 id="cardio-title">Cardio</h2>
      <div className="metrics"><span><b>Planned coverage</b>{Math.round(coverage.equivalentMinutes)}/{preferences.cardioTargetMinutes} equivalent min</span><span><b>Remaining</b>{Math.round(coverage.remaining)} equivalent min</span><span><b>Recent lower work</b>{load.lowerSets} working sets</span><span><b>Hard cardio</b>{load.hardCardioMinutes} min / 36h</span></div>
      <div className="coach-note"><b>Recommended next dose</b><br/>{prescription.message}{load.lowerBodyRecent && load.lowerSets >= 6 ? ' Hard intervals are deferred because recent lower-body workload is being protected.' : ''}</div>
      <div className="choice-grid">{cardioChoices.map(choice => <button key={choice.type} onClick={() => { setCardioMinutes(choice.minutes); setCardioEffort(choice.effort); }}><b>{choice.name}</b><small>{choice.minutes} min · {choice.effort}</small><span>{choice.description}</span></button>)}</div>
      <div className="settings-grid">
        <label><b>Minutes</b><input type="number" min="1" max="240" value={cardioMinutes} onChange={event => setCardioMinutes(Math.max(1, Number(event.target.value)))}/></label>
        <label><b>Effort</b><select value={cardioEffort} onChange={event => setCardioEffort(event.target.value as typeof cardioEffort)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option></select></label>
        <label><b>Modality</b><select value={cardioModality} onChange={event => setCardioModality(event.target.value as CardioModality)}>{modalities.map(item => <option key={item} value={item}>{title(item)}</option>)}</select></label>
        <label><b>Type</b><select value={cardioKind} onChange={event => setCardioKind(event.target.value as typeof cardioKind)}><option value="planned">Planned exercise</option><option value="incidental">Daily movement</option></select></label>
      </div>
      <button className="primary" onClick={logCardio}>Log cardio</button>
      <p className="muted">Only planned cardio contributes to the configurable aerobic target. Hard minutes count as approximately double for planning; this is not a medical score.</p>
    </section>

    <section className="card" aria-labelledby="movement-support-title">
      <h2 id="movement-support-title">Core, mobility, and athletic support</h2>
      <div className="history"><b>{preparation.name}</b><span>{preparation.minutes} min</span><small>{preparation.items.join(' · ')} · {preparation.reason}</small><button className="link" onClick={() => logDose({ domain: 'mobility', minutes: preparation.minutes, effort: 'easy', source: 'manual', kind: 'planned', sessionId: preparation.id, completedAt: new Date().toISOString() })}>Mark preparation done</button></div>
      <div className="history"><b>{restore.name}</b><span>{restore.minutes} min</span><small>{restore.items.join(' · ')} · {restore.reason}</small><button className="link" onClick={() => logDose({ domain: 'mobility', minutes: restore.minutes, effort: 'easy', source: 'manual', kind: 'planned', sessionId: restore.id, completedAt: new Date().toISOString() })}>Mark mobility done</button></div>
      {core.map(session => <div className="history" key={session.id}><b>{session.name}</b><span>{session.minutes} min</span><small>{session.items.join(' · ')}</small><button className="link" onClick={() => logDose({ domain: 'core', minutes: session.minutes, effort: session.fatigue === 'low' ? 'easy' : 'moderate', source: 'manual', kind: 'planned', sessionId: session.id, completedAt: new Date().toISOString() })}>Mark core done</button></div>)}
      {athletic.map(plan => <div className="history" key={plan.domain}><b>{plan.name}</b><span>{plan.impact} impact</span><small>{plan.items.join(' · ')} · {plan.reason}</small><button className="link" onClick={() => logDose({ domain: plan.domain, minutes: 10, effort: plan.impact === 'low' ? 'easy' : 'moderate', source: 'manual', kind: 'planned', sessionId: `athletic:${plan.domain}`, completedAt: new Date().toISOString() })}>Mark 10 min done</button></div>)}
      {!power.allowed && <div className="coach-note"><b>Power held today</b><br/>{power.reason}</div>}
    </section>

    <section className="card" aria-labelledby="progressions-title">
      <h2 id="progressions-title">Core and mobility progressions</h2>
      <p className="muted">Choose the highest level you can perform cleanly. Completion is logged separately from the selected level so history is not rewritten.</p>
      {progressionTracks.map(track => {
        const current = track.levels.find(level => level.id === progressions[track.id]) || track.levels[0];
        return <div className="skill-block" key={track.id}><b>{track.name} · {current.name}</b><p className="muted">{current.target}</p><small>{current.items.join(' · ')}</small><div className="chip-grid">{track.levels.map(level => <button key={level.id} className={level.id === current.id ? 'active' : ''} aria-pressed={level.id === current.id} onClick={() => selectProgression(track.id, level.id)}>{level.name}</button>)}</div><button className="link" onClick={() => logDose({ domain: track.domain, minutes: 8, effort: 'easy', source: 'manual', kind: 'planned', quality: 1, sessionId: `${track.id}:${current.id}`, completedAt: new Date().toISOString() })}>Record current-level practice</button></div>;
      })}
    </section>

    <section className="card" aria-labelledby="athletic-progression-title">
      <h2 id="athletic-progression-title">Athletic progression</h2>
      <p className="muted">Balance and jump difficulty changes only after repeated comparable benchmarks. Readiness and the high-impact preference can hold progression.</p>
      {athleticProgressions.map(item => <div className="history" key={item.metricId}><b>{item.metricId === 'jump' ? 'Jump / power' : 'Single-leg balance'} · {title(item.level)}</b><span>{item.decision.evidenceCount} tests</span><small>{item.decision.message} Current work: {athleticLevelSession(item.metricId, item.level).join(' · ')}</small>{item.decision.action !== 'hold' && <button className="link" onClick={() => applyAthleticProgression(item.metricId, item.decision.nextLevel)}>Apply {item.decision.action}: {title(item.decision.nextLevel)}</button>}</div>)}
    </section>
  </>;
}

export function SkillProgressPanel({ gym }: { gym: GymProfile }) {
  const [skills, setSkills] = useState<Record<string, string>>(() => typeof window === 'undefined' ? {} : store.loadSkills());
  const [assessments, setAssessments] = useState<SkillAssessment[]>(() => typeof window === 'undefined' ? [] : store.loadSkillAssessments());
  const [inputs, setInputs] = useState<Record<string, { value: number; assistanceKg: number; variation: string; pain: boolean }>>({});
  const trees = availableSkillTrees(gym.equipment);

  function currentStepId(treeId: string) {
    const tree = skillTrees.find(item => item.id === treeId)!;
    const available = tree.steps.filter(step => step.requiredEquipment.every(item => gym.equipment.includes(item)));
    return available.some(step => step.id === skills[treeId]) ? skills[treeId] : available[0]?.id;
  }

  function record(treeId: string) {
    const tree = skillTrees.find(item => item.id === treeId);
    const stepId = currentStepId(treeId);
    const step = tree?.steps.find(item => item.id === stepId);
    if (!tree || !step) return;
    const input = inputs[treeId] || { value: 0, assistanceKg: 0, variation: '', pain: false };
    const entry: SkillAssessment = { treeId, stepId, passed: input.value >= (step.targetValue || 0), clean: !input.pain, pain: input.pain, metric: step.metric, value: input.value, assistanceKg: step.id === 'assisted' ? input.assistanceKg : undefined, externalLoadKg: step.metric === 'external-load-kg' ? input.value : undefined, variation: input.variation, recordedAt: new Date().toISOString() };
    const next = [...assessments, entry];
    store.saveSkillAssessments(next);
    setAssessments(next);
  }

  function apply(treeId: string, stepId: string) {
    const next = { ...skills, [treeId]: stepId };
    store.saveSkills(next);
    setSkills(next);
  }

  return <section className="card" aria-labelledby="skills-title">
    <h2 id="skills-title">Bodyweight skills</h2>
    <p className="muted">Progressions are equipment-aware and require two clean, comparable assessments. Assistance and external load are tracked rather than discarded.</p>
    {trees.length === 0 && <p>No compatible bodyweight skill tree is available in this equipment profile.</p>}
    {trees.map(tree => {
      const stepId = currentStepId(tree.id);
      const step = tree.steps.find(item => item.id === stepId)!;
      const recommendation = recommendSkillProgression(tree.id, stepId, assessments);
      const input = inputs[tree.id] || { value: 0, assistanceKg: 0, variation: '', pain: false };
      return <div className="skill-block" key={tree.id}>
        <div className="exercise-title"><div><span className="pill">{tree.name}</span><h3>{step.name}</h3><p className="muted">Target: {step.target}</p></div><select aria-label={`${tree.name} level`} value={stepId} onChange={event => apply(tree.id, event.target.value)}>{tree.steps.filter(item => item.requiredEquipment.every(required => gym.equipment.includes(required))).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="settings-grid"><label><b>{step.metric === 'seconds' ? 'Seconds' : step.metric === 'external-load-kg' ? 'Added load (kg)' : 'Best clean reps'}</b><input type="number" min="0" step="0.5" value={input.value} onChange={event => setInputs({ ...inputs, [tree.id]: { ...input, value: Number(event.target.value) } })}/></label>{step.id === 'assisted' && <label><b>Assistance (kg)</b><input type="number" min="0" step="0.5" value={input.assistanceKg} onChange={event => setInputs({ ...inputs, [tree.id]: { ...input, assistanceKg: Number(event.target.value) } })}/></label>}<label><b>Test condition</b><input value={input.variation} placeholder="e.g. assisted machine" onChange={event => setInputs({ ...inputs, [tree.id]: { ...input, variation: event.target.value } })}/></label><button className={input.pain ? 'warning active' : ''} aria-pressed={input.pain} onClick={() => setInputs({ ...inputs, [tree.id]: { ...input, pain: !input.pain } })}>Discomfort {input.pain ? 'flagged' : 'not flagged'}</button></div>
        <button className="primary" onClick={() => record(tree.id)}>Record assessment</button>
        <div className="coach-note">{recommendation.message}</div>
        {recommendation.action !== 'hold' && <button className="link" onClick={() => apply(tree.id, recommendation.stepId)}>Apply {recommendation.action}: {tree.steps.find(item => item.id === recommendation.stepId)?.name}</button>}
      </div>;
    })}
  </section>;
}

export function CapabilityAssessmentPanel({ assessments, onChange }: { assessments: Assessment[]; onChange: (next: Assessment[]) => void }) {
  const [metricId, setMetricId] = useState('pullups');
  const [value, setValue] = useState(0);
  const [note, setNote] = useState('');
  const metrics = capabilityMetrics.filter(metric => assessmentMetricIds.includes(metric.id));
  const selected = metrics.find(metric => metric.id === metricId) || metrics[0];

  function record() {
    if (!selected || !Number.isFinite(value)) return;
    const next = [...assessments, { metricId: selected.id, value, note: note || undefined, recordedAt: new Date().toISOString() }];
    store.saveAssessments(next);
    onChange(next);
    setNote('');
  }

  return <section className="card" aria-labelledby="assessment-title"><h2 id="assessment-title">Capability assessments</h2><p className="muted">Use the same test conditions each time. Each capability remains separate rather than becoming an arbitrary universal health score.</p><div className="settings-grid"><label><b>Assessment</b><select value={metricId} onChange={event => setMetricId(event.target.value)}>{metrics.map(metric => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><label><b>Value {selected ? `(${selected.unit})` : ''}</b><input type="number" step="0.1" value={value} onChange={event => setValue(Number(event.target.value))}/></label><label><b>Conditions/note</b><input value={note} onChange={event => setNote(event.target.value)} placeholder="Keep conditions repeatable"/></label></div><button className="primary" onClick={record}>Record assessment</button>{metrics.map(metric => { const latest = latestAssessment(assessments, metric.id); return <div className="history" key={metric.id}><b>{metric.name}</b><span>{latest ? `${latest.value} ${metric.unit}` : 'No baseline'}</span><small>{latest?.note || metric.description}</small></div>; })}</section>;
}
