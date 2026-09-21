/**
 * Guide surface (#148).
 *
 * #148 requires the Guide to exist as a real surface, and requires the
 * Guide-first shell to work with **no AI and no network**. Until the model
 * gateway lands in #150, this surface answers deterministically from local
 * state only. It performs no fetch, imports no model client, and degrades
 * cleanly offline.
 *
 * When #150 adds the coordinator, the model becomes an optional enrichment
 * layer *behind* these answers — never a dependency of them.
 */
'use client';

import { useMemo, useState } from 'react';
import type { HistoryEntry, SessionId } from '@/lib/domain';
import type { ReadinessDecision } from '@/lib/whole-person';
import { Icon } from './icon-component';

export type DeterministicAnswer = {
  title: string;
  body: string;
  kind: 'plan' | 'status' | 'explanation' | 'safety';
};

/**
 * Classify a free-text question into a deterministic answer using local state.
 * Deliberately simple and explainable: every branch is inspectable, and an
 * unrecognised question returns a truthful "not yet" rather than invented advice.
 */
export function answerDeterministically(
  question: string,
  context: { history: HistoryEntry[]; readiness: ReadinessDecision; session: SessionId }
): DeterministicAnswer {
  const q = question.toLowerCase();
  const { history, readiness, session } = context;
  const recent = history.filter(entry => entry.status !== 'abandoned');

  if (/pain|hurt|injur|ache/.test(q)) {
    return {
      kind: 'safety',
      title: 'Pain needs a real answer, not a plan',
      body: 'If something hurts, tell me where with the Body surface and I will route it through the safety rules. Pain flags pause automatic progression rather than being treated as ordinary difficulty. If it is sharp, worsening, or came from an injury, that is a conversation for a qualified professional.',
    };
  }

  if (/tired|exhaust|energy|sleep/.test(q)) {
    return {
      kind: 'status',
      title: `Readiness is ${readiness.level}`,
      body: readiness.level === 'normal'
        ? 'No reduced-readiness check-in is recorded, so today plans at full volume. If you are tired, check in as Flat or Sore and I will reduce the session instead of you pushing through it.'
        : `${readiness.reasons.join(' ') || 'A reduced-readiness check-in is recorded.'} Volume is scaled to ${Math.round(readiness.volumeMultiplier * 100)}% and automatic progression is ${readiness.allowProgression ? 'still allowed' : 'paused'}.`,
    };
  }

  if (/why|reason|explain/.test(q)) {
    return {
      kind: 'explanation',
      title: 'Why this session',
      body: `Today recommends ${session} because that is the next session in your rolling split and your readiness is ${readiness.level}. The rolling split advances only when you actually complete a session, so a missed day moves the queue rather than breaking it.`,
    };
  }

  if (/time|minute|short|busy|quick/.test(q)) {
    return {
      kind: 'plan',
      title: 'Shorter session',
      body: 'Use "I have less time" on Today. That keeps the primary movements and trims accessory volume, so the session still counts as whole-person coverage. A 6-10 minute minimum useful session is a valid outcome, not a failed day.',
    };
  }

  if (/travel|hotel|away|equipment|gym/.test(q)) {
    return {
      kind: 'plan',
      title: 'Equipment and travel',
      body: 'Travel and equipment changes are handled by substitution: when equipment is unavailable I swap to a compatible movement rather than dropping the pattern. Set the gym profile on Today and the swap is applied before the session starts.',
    };
  }

  if (/progress|improve|change|trend|stronger/.test(q)) {
    return {
      kind: 'status',
      title: `${recent.length} session${recent.length === 1 ? '' : 's'} recorded`,
      body: recent.length === 0
        ? 'No sessions recorded yet, so there is no trend to report. Progress appears after a few sessions rather than being inferred from one.'
        : 'Progress is measured from comparable working sets over repeated exposures, not from a single session. The Progress surface shows strength, cardio and consistency trajectories; a plateau needs at least four comparable exposures across 14 days before it is called a plateau.',
    };
  }

  return {
    kind: 'status',
    title: 'Deterministic answers only, for now',
    body: 'The model-backed Guide arrives with #150. Until then I answer from your local training state only, which is why I will not invent reasoning I cannot ground. Try asking about today, pain, time available, travel, or progress.',
  };
}

export function GuideSurface({ history, readiness, session }: {
  history: HistoryEntry[];
  readiness: ReadinessDecision;
  session: SessionId;
}) {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<DeterministicAnswer[]>([]);

  const suggestions = useMemo(() => [
    'Why this session?',
    'I only have 10 minutes',
    'My shoulder hurts',
    "I'm travelling",
    'What changed recently?',
  ], []);

  function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setAsked(previous => [{ ...answerDeterministically(trimmed, { history, readiness, session }) }, ...previous].slice(0, 4));
    setQuestion('');
  }

  return <>
    <section className="card">
      <div className="section-header">
        <Icon name="guide-outline" style={{ fontSize: '.92rem', color: 'var(--accent)' }} />
        <h3>ASK GUIDE</h3>
      </div>
      <p className="muted" style={{ marginTop: '10px', fontSize: '.86rem' }}>
        Answers come from your local training state. The model-backed Guide arrives with #150;
        this surface never invents reasoning it cannot ground.
      </p>
      <form
        onSubmit={event => { event.preventDefault(); ask(question); }}
        style={{ display: 'grid', gap: '10px', marginTop: '12px' }}
      >
        <label htmlFor="guide-question">Your question</label>
        <input
          id="guide-question"
          value={question}
          onChange={event => setQuestion(event.target.value)}
          placeholder="e.g. Why this session?"
          autoComplete="off"
        />
        <button className="primary" type="submit" disabled={!question.trim()}>Ask</button>
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        {suggestions.map(item => <button
          key={item}
          className="pill"
          style={{ border: '1px solid var(--line)', background: 'var(--surface)', minHeight: '40px', cursor: 'pointer' }}
          onClick={() => ask(item)}
        >{item}</button>)}
      </div>
    </section>

    {asked.map((answer, index) => <section className="card" key={`${answer.title}-${index}`}>
      <span className="coach-label">{answer.kind === 'safety' ? 'SAFETY' : answer.kind === 'plan' ? 'PLAN' : answer.kind === 'explanation' ? 'WHY' : 'STATUS'}</span>
      <h2 style={{ fontSize: '1.02rem', marginTop: '6px', marginBottom: '8px' }}>{answer.title}</h2>
      <p className="muted" style={{ marginBottom: '0', fontSize: '.9rem' }}>{answer.body}</p>
    </section>)}
  </>;
}
