import type { AdaptContext, HistoryEntry, TrainingMode } from '../domain';
import type { DomainPriority, UserPreferences } from '../preferences';
import type { ActivityDose, CapabilityDomain, ReadinessRecord } from '../whole-person';

export type CoachConfidence = 'insufficient' | 'low' | 'medium' | 'high';
export type CoachTrendDirection = 'improving' | 'stable' | 'declining' | 'mixed' | 'unknown';

export type CoachEvidence = {
  id: string;
  domain: CapabilityDomain | 'connected-health';
  label: string;
  observation: string;
  sampleCount: number;
  window: string;
  confidence: CoachConfidence;
  current?: number | null;
  previous?: number | null;
  unit?: string;
};

export type CoachTrend = {
  id: string;
  domain: CapabilityDomain | 'connected-health';
  label: string;
  direction: CoachTrendDirection;
  confidence: CoachConfidence;
  message: string;
  evidenceIds: string[];
};

export type PlateauStatus = 'insufficient' | 'progressing' | 'stable' | 'plateau' | 'regressing';
export type PlateauAssessment = {
  exerciseId: string;
  exerciseName: string;
  status: PlateauStatus;
  exposures: number;
  spanDays: number;
  changePercent: number | null;
  deloadSuggested: boolean;
  reasons: string[];
};

export type GoalAllocation = {
  domain: CapabilityDomain;
  priority: DomainPriority;
  share: number;
  reason: string;
};

export type CoachActionKind = 'recover' | 'deload' | 'progress' | 'hold' | 'balance-goals' | 'schedule' | 'minimum-dose' | 'maintain';
export type CoachAction = {
  id: string;
  kind: CoachActionKind;
  priority: 1 | 2 | 3;
  title: string;
  instruction: string;
  rationale: string;
  evidenceIds: string[];
  reversible: true;
};

export type ConnectedCoachSignal = {
  id: string;
  label: string;
  status: 'current' | 'stale' | 'partial' | 'failed' | 'insufficient';
  direction: 'up' | 'down' | 'stable' | 'insufficient';
  currentAverage: number | null;
  previousAverage: number | null;
  unit: string;
  sampleDays: number;
  note: string;
};

export type CoachingInput = {
  history: HistoryEntry[];
  activity: ActivityDose[];
  readiness: ReadinessRecord[];
  preferences: UserPreferences;
  connectedSignals?: ConnectedCoachSignal[];
  now?: Date;
};

export type CoachingSnapshot = {
  generatedAt: string;
  evidence: CoachEvidence[];
  trends: CoachTrend[];
  plateaus: PlateauAssessment[];
  goals: GoalAllocation[];
  actions: CoachAction[];
  readinessLevel: 'normal' | 'reduced' | 'recovery';
  safetyBoundary: string;
};

export type ConversationInterpretation = {
  original: string;
  recognized: string[];
  unrecognized: string[];
  adaptContext: AdaptContext;
  mode?: TrainingMode;
  goalHints: CapabilityDomain[];
  safetyFlags: string[];
  summary: string;
};
