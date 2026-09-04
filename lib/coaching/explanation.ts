import type { CoachingSnapshot } from './types';

export type CoachExplanationRequest = {
  deterministicActions: { id: string; title: string; instruction: string; rationale: string; evidenceIds: string[] }[];
  evidence: { id: string; label: string; observation: string; confidence: string }[];
  safetyBoundary: string;
  rules: string[];
};

export interface CoachExplanationProvider {
  explain(request: CoachExplanationRequest): Promise<string>;
}

declare global {
  interface Window {
    HumanHealthCoachAI?: CoachExplanationProvider;
  }
}

export function buildCoachExplanationRequest(snapshot: CoachingSnapshot): CoachExplanationRequest {
  return {
    deterministicActions: snapshot.actions.map(action => ({ id: action.id, title: action.title, instruction: action.instruction, rationale: action.rationale, evidenceIds: action.evidenceIds })),
    evidence: snapshot.evidence.map(item => ({ id: item.id, label: item.label, observation: item.observation, confidence: item.confidence })),
    safetyBoundary: snapshot.safetyBoundary,
    rules: [
      'Explain the supplied deterministic actions; do not add, remove, reorder, or materially change them.',
      'Do not upgrade confidence beyond the supplied evidence.',
      'State when evidence is insufficient, stale, partial, or missing.',
      'Do not diagnose, provide injury clearance, prescribe medication/insulin, calculate treatment carbohydrates, or give emergency-monitoring advice.',
      'Do not convert unlike fitness domains into a universal health score.',
    ],
  };
}

export function deterministicExplanation(snapshot: CoachingSnapshot) {
  if (!snapshot.actions.length) return 'There is not enough actionable evidence to recommend a change. Keep the current plan, collect comparable training data, and use readiness constraints when they are present.';
  return snapshot.actions.map((action, index) => `${index + 1}. ${action.title}: ${action.instruction} Why: ${action.rationale}`).join('\n');
}

export function getCoachExplanationProvider() {
  if (typeof window === 'undefined') return undefined;
  return window.HumanHealthCoachAI;
}

export async function requestAIExplanation(snapshot: CoachingSnapshot, provider = getCoachExplanationProvider()) {
  if (!provider) throw new Error('No optional AI explanation provider is connected. Deterministic coaching remains available.');
  const response = await provider.explain(buildCoachExplanationRequest(snapshot));
  const text = String(response || '').trim().slice(0, 4_000);
  if (!text) throw new Error('The AI explanation provider returned an empty explanation.');
  return text;
}
