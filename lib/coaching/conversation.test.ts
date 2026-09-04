import { describe, expect, it } from 'vitest';
import { gyms } from '../program';
import { interpretCoachMessage } from './conversation';
import { buildCoachExplanationRequest, deterministicExplanation } from './explanation';
import { movementVideoGate } from './movement-video';
import { defaultPreferences } from '../preferences';
import { createCoachingSnapshot } from './engine';

describe('conversational coaching input', () => {
  it('parses time, energy, travel gym, equipment and goals without changing history', () => {
    const result = interpretCoachMessage('I have 20 minutes, low energy, at a hotel with no rack. Keep strength and cardio moving.', gyms);
    expect(result.adaptContext.minutes).toBe(20);
    expect(result.adaptContext.lowEnergy).toBe(true);
    expect(result.adaptContext.mode).toBe('travel');
    expect(result.adaptContext.gym?.id).toBe('hotel');
    expect(result.adaptContext.unavailable).toContain('rack');
    expect(result.goalHints).toEqual(expect.arrayContaining(['strength','cardio']));
    expect(result.summary).toContain('reversible');
  });

  it('flags symptom and dosing language instead of interpreting it as training authority', () => {
    const result = interpretCoachMessage('I feel dizzy and need to know my insulin correction before training', gyms);
    expect(result.safetyFlags.length).toBeGreaterThanOrEqual(2);
    expect(result.safetyFlags.join(' ')).toContain('insulin');
  });
});

describe('deterministic-first explanations', () => {
  it('locks the AI request to deterministic actions and safety boundaries', () => {
    const snapshot = createCoachingSnapshot({ history: [], activity: [], readiness: [], preferences: defaultPreferences, now: new Date('2026-09-03T12:00:00Z') });
    const request = buildCoachExplanationRequest(snapshot);
    expect(request.rules.some(rule => rule.includes('do not add, remove, reorder'))).toBe(true);
    expect(request.safetyBoundary).toContain('medication');
    expect(deterministicExplanation(snapshot).length).toBeGreaterThan(0);
  });
});

describe('movement/video reliability gate', () => {
  it('remains disabled until every reliability/privacy review is explicitly complete', () => {
    expect(movementVideoGate().enabled).toBe(false);
    expect(movementVideoGate({ benchmarkDatasetReviewed: true, falsePositiveRateReviewed: true, devicePerformanceReviewed: true, privacyFlowReviewed: true, retentionPolicyReviewed: true, accessibilityReviewed: true }).enabled).toBe(true);
  });
});
