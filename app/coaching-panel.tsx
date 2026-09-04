'use client';

import { useEffect, useMemo, useState } from 'react';
import { connectedHealthTrends } from '@/lib/connected-health';
import { createCoachingSnapshot, deterministicExplanation, getCoachExplanationProvider, interpretCoachMessage, movementVideoGate, previewConversationPlan, requestAIExplanation } from '@/lib/coaching';
import type { ActivityDose, ReadinessRecord } from '@/lib/whole-person';
import type { HistoryEntry } from '@/lib/domain';
import { defaultPreferences, UserPreferences } from '@/lib/preferences';
import { gyms } from '@/lib/program';
import { store } from '@/lib/storage';
import { useConnectedHealthSnapshot } from './use-connected-health';

function title(value: string) { return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }

export function CoachingPanel() {
  const connected = useConnectedHealthSnapshot();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activity, setActivity] = useState<ActivityDose[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [message, setMessage] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    setHistory(store.loadHistory());
    setActivity(store.loadActivity());
    setReadiness(store.loadReadiness());
    setPreferences(store.loadPreferences());
    setAiAvailable(Boolean(getCoachExplanationProvider()));
  }, []);

  const connectedSignals = useMemo(() => connectedHealthTrends(connected.observations, connected.sources, connected.preferences).map(item => ({
    id: item.metric,
    label: item.label,
    status: item.status,
    direction: item.direction,
    currentAverage: item.currentAverage,
    previousAverage: item.previousAverage,
    unit: item.unit,
    sampleDays: item.sampleDays,
    note: item.note,
  })), [connected.observations, connected.sources, connected.preferences]);

  const snapshot = useMemo(() => createCoachingSnapshot({ history, activity, readiness, preferences, connectedSignals }), [history, activity, readiness, preferences, connectedSignals]);
  const interpretation = useMemo(() => interpretCoachMessage(message, gyms), [message]);
  const conversationPreview = useMemo(() => previewConversationPlan({ interpretation, history, activity, readiness, preferences }), [interpretation, history, activity, readiness, preferences]);
  const videoGate = movementVideoGate();

  async function explainWithAI() {
    if (!window.confirm('Send the displayed coaching actions and evidence summaries to the optional AI explanation provider? The provider may be external to this browser depending on the host integration.')) return;
    setAiBusy(true);
    try { setAiExplanation(await requestAIExplanation(snapshot)); }
    catch (error) { setAiExplanation(error instanceof Error ? error.message : 'AI explanation failed.'); }
    finally { setAiBusy(false); }
  }

  return <>
    <section className="hero coaching-hero">
      <span className="pill">PHASE 4 · DETERMINISTIC FIRST</span>
      <h2>Coaching intelligence</h2>
      <p>Human Health combines training history, readiness, goal priorities and current connected-health signals into explainable, reversible coaching actions. Missing or stale evidence stays visible instead of being guessed.</p>
    </section>

    <section className="card" aria-labelledby="coach-actions-title">
      <div className="section-heading"><div><span className="eyebrow">NEXT ACTIONS</span><h2 id="coach-actions-title">What to do next</h2></div><span className={`status-badge status-${snapshot.readinessLevel === 'normal' ? 'current' : 'partial'}`}>{title(snapshot.readinessLevel)}</span></div>
      {snapshot.actions.length ? <div className="coach-action-grid">{snapshot.actions.map(action => <article className="coach-action" key={action.id}><span className="pill">Priority {action.priority}</span><h3>{action.title}</h3><p><b>{action.instruction}</b></p><p>{action.rationale}</p><small>Evidence: {action.evidenceIds.join(', ')} · reversible recommendation</small></article>)}</div> : <p>No training change is justified yet. Keep the current plan and collect comparable data.</p>}
      <div className="coach-note"><b>Safety boundary</b><br/>{snapshot.safetyBoundary}</div>
    </section>

    <section className="card" aria-labelledby="coach-trends-title">
      <div className="section-heading"><div><span className="eyebrow">EXPLAINABLE TRENDS</span><h2 id="coach-trends-title">What the evidence says</h2></div><span className="muted">No universal health score</span></div>
      <div className="trend-grid">{snapshot.trends.map(trend => <article className="trend-card" key={trend.id}><div className="section-heading"><h3>{trend.label}</h3><span className="status-badge">{trend.direction}</span></div><p>{trend.message}</p><small>Confidence: {trend.confidence} · evidence {trend.evidenceIds.join(', ')}</small></article>)}</div>
      <details><summary>Evidence ledger</summary>{snapshot.evidence.map(item => <div className="history" key={item.id}><b>{item.label}</b><span>{item.confidence}</span><small>{item.observation} · {item.sampleCount} samples · {item.window}</small></div>)}</details>
    </section>

    <section className="card" aria-labelledby="plateau-title">
      <div className="section-heading"><div><span className="eyebrow">PLATEAU / DELOAD</span><h2 id="plateau-title">Comparable performance review</h2></div><span className="muted">Advisory only</span></div>
      {snapshot.plateaus.length ? snapshot.plateaus.map(item => <article className="history" key={item.exerciseId}><b>{item.exerciseName}</b><span>{item.status}</span><small>{item.exposures} exposures · {item.spanDays} days · {item.changePercent === null ? 'not enough data' : `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(1)}%`} · {item.deloadSuggested ? 'short deload worth considering' : 'no automatic deload'}</small></article>) : <p>More comparable primary-lift exposures are needed before plateau logic can run.</p>}
    </section>

    <section className="card" aria-labelledby="goal-balance-title">
      <div className="section-heading"><div><span className="eyebrow">MULTI-GOAL BALANCE</span><h2 id="goal-balance-title">Current planning emphasis</h2></div><span className="muted">Planning shares, not health scores</span></div>
      <div className="goal-grid">{snapshot.goals.map(goal => <article className="metric-card" key={goal.domain}><h3>{title(goal.domain)}</h3><strong>{goal.share}%</strong><p>{goal.reason}</p></article>)}</div>
    </section>

    <section className="card" aria-labelledby="conversation-title">
      <span className="eyebrow">CONVERSATIONAL ADAPTATION</span><h2 id="conversation-title">Tell the coach what changed</h2>
      <label><b>Training context</b><textarea rows={4} value={message} onChange={event => setMessage(event.target.value)} placeholder="Example: I only have 20 minutes, low energy, at a hotel with no rack. Keep strength and cardio moving."/></label>
      {message && <div className="conversation-result">
        <p><b>{interpretation.summary}</b></p>
        {interpretation.recognized.length > 0 && <p>Recognized: {interpretation.recognized.join(' · ')}</p>}
        {interpretation.safetyFlags.map((flag, index) => <p className="connection-state storage-error" role="alert" key={index}>{flag}</p>)}
        <dl><div><dt>Minutes</dt><dd>{interpretation.adaptContext.minutes || 'Not specified'}</dd></div><div><dt>Energy</dt><dd>{interpretation.adaptContext.lowEnergy ? 'Low-energy adaptation' : 'Not specified'}</dd></div><div><dt>Mode</dt><dd>{interpretation.adaptContext.mode ? title(interpretation.adaptContext.mode) : 'Current mode'}</dd></div><div><dt>Gym</dt><dd>{interpretation.adaptContext.gym?.name || 'Current gym'}</dd></div><div><dt>Goals</dt><dd>{interpretation.goalHints.length ? interpretation.goalHints.map(title).join(', ') : 'Current priorities'}</dd></div></dl>
        <div className={conversationPreview.blocked ? 'coach-note' : 'conversation-preview'}>
          <h3>{conversationPreview.blocked ? 'Workout preview withheld' : 'Reversible workout preview'}</h3>
          {!conversationPreview.blocked && <p><b>{conversationPreview.session ? title(conversationPreview.session) : 'Session'} · {conversationPreview.gymName} · {conversationPreview.mode ? title(conversationPreview.mode) : 'Normal'}</b><br/>Automatic progression: {conversationPreview.progressionAllowed ? 'allowed by current rules' : 'held by current rules'}</p>}
          {!conversationPreview.blocked && conversationPreview.exercises.length > 0 && <ol>{conversationPreview.exercises.map(exercise => <li key={`${exercise.id}-${exercise.originalId || ''}`}><b>{exercise.name}</b> · {exercise.sets} working set{exercise.sets === 1 ? '' : 's'}{exercise.originalId ? ` · replacement for ${title(exercise.originalId)}` : ''}</li>)}</ol>}
          {conversationPreview.notes.map((note, index) => <p className="muted" key={index}>{note}</p>)}
        </div>
      </div>}
    </section>

    <section className="card" aria-labelledby="explanation-title">
      <span className="eyebrow">EXPLANATION LAYER</span><h2 id="explanation-title">Deterministic recommendation first</h2>
      <pre className="coach-explanation">{deterministicExplanation(snapshot)}</pre>
      <p className="muted">An optional AI provider may rewrite this into clearer prose. If you request it, the displayed coaching actions and evidence summaries are passed to that provider; depending on the host integration, the provider may be external. It receives fixed actions and safety rules and cannot change the underlying deterministic recommendation.</p>
      <button className="ghost" disabled={!aiAvailable || aiBusy} onClick={() => void explainWithAI()}>{aiBusy ? 'Explaining…' : aiAvailable ? 'Generate optional AI explanation' : 'AI explanation provider not connected'}</button>
      {aiExplanation && <div className="coach-note"><b>Optional AI narrative</b><br/>{aiExplanation}</div>}
    </section>

    <section className="card" aria-labelledby="video-gate-title">
      <span className="eyebrow">MOVEMENT / VIDEO</span><h2 id="video-gate-title">Reliability gate</h2>
      <p>{videoGate.message}</p><p className="muted">No camera permission, upload, pose score, injury diagnosis or movement-quality claim is enabled by Phase 4.</p>
      <div className="metrics"><span><b>Gate</b>{videoGate.enabled ? 'Passed' : 'Locked'}</span><span><b>Missing reviews</b>{videoGate.missing.length}</span></div>
    </section>
  </>;
}
