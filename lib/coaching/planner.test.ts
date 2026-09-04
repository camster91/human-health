import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../preferences';
import { gyms } from '../program';
import { interpretCoachMessage } from './conversation';
import { previewConversationPlan } from './planner';

describe('conversational plan preview', () => {
  it('builds a short travel workout without mutating stored inputs', () => {
    const history: never[] = [];
    const activity: never[] = [];
    const readiness: never[] = [];
    const preferences = { ...defaultPreferences };
    const before = JSON.stringify({ history, activity, readiness, preferences });
    const interpretation = interpretCoachMessage('I have 20 minutes at a hotel, low energy, with no rack', gyms);
    const preview = previewConversationPlan({ interpretation, history, activity, readiness, preferences, now: new Date('2026-09-03T12:00:00Z') });
    expect(preview.blocked).toBe(false);
    expect(preview.mode).toBe('travel');
    expect(preview.gymName).toContain('Hotel');
    expect(preview.exercises.length).toBeGreaterThan(0);
    expect(preview.notes.at(-1)).toContain('Preview only');
    expect(JSON.stringify({ history, activity, readiness, preferences })).toBe(before);
  });

  it('withholds a workout preview when symptom or treatment language is detected', () => {
    const interpretation = interpretCoachMessage('I am dizzy and want an insulin correction before a 20 minute workout', gyms);
    const preview = previewConversationPlan({ interpretation, history: [], activity: [], readiness: [], preferences: defaultPreferences, now: new Date('2026-09-03T12:00:00Z') });
    expect(preview.blocked).toBe(true);
    expect(preview.exercises).toEqual([]);
    expect(preview.progressionAllowed).toBe(false);
    expect(preview.notes.join(' ')).toContain('withheld');
  });

  it('carries reduced readiness into the preview without overriding progression safety', () => {
    const interpretation = interpretCoachMessage('I have 30 minutes at the work gym', gyms);
    const preview = previewConversationPlan({
      interpretation,
      history: [],
      activity: [],
      readiness: [{ recordedAt: '2026-09-03T08:00:00Z', input: { sleep: 'poor', fatigue: 'high' } }],
      preferences: defaultPreferences,
      now: new Date('2026-09-03T12:00:00Z'),
    });
    expect(preview.blocked).toBe(false);
    expect(preview.progressionAllowed).toBe(false);
    expect(preview.notes.join(' ')).toContain('readiness');
  });
});
