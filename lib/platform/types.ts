import type { ConnectedMetric, HealthObservation, HealthSourceState } from '../connected-health';
import type { HumanHealthExport } from '../storage';
import type { CapabilityDomain } from '../whole-person';

export type PreventiveRecordCategory = 'checkup' | 'screening' | 'vaccination' | 'dental' | 'vision' | 'lab' | 'other';
export type PreventiveEntrySource = 'manual' | 'clinician-provided';

export type PreventiveRecord = {
  id: string;
  category: PreventiveRecordCategory;
  title: string;
  occurredAt: string;
  provider?: string;
  note?: string;
  source: PreventiveEntrySource;
  createdAt: string;
};

export type PreventiveReminder = {
  id: string;
  title: string;
  dueOn: string;
  category: PreventiveRecordCategory;
  repeatMonths?: number;
  provider?: string;
  note?: string;
  source: PreventiveEntrySource;
  enabled: boolean;
  createdAt: string;
};

export type ReminderState = 'overdue' | 'due-soon' | 'scheduled' | 'disabled' | 'invalid';

export type ClinicianExportInput = {
  training: HumanHealthExport;
  connectedObservations: HealthObservation[];
  connectedSources: HealthSourceState[];
  preventiveRecords: PreventiveRecord[];
  preventiveReminders: PreventiveReminder[];
  generatedAt?: Date;
  lookbackDays?: number;
};

export type CapabilityValidationStatus = 'experimental' | 'internal-benchmark' | 'external-evidence-reviewed' | 'validated-for-intended-use';
export type CapabilityEvidence = {
  id: string;
  title: string;
  kind: 'internal-test' | 'external-study' | 'guideline' | 'replication';
  reference: string;
  population?: string;
  protocol?: string;
  outcome?: string;
  /** Replication evidence must explicitly state whether it was independent of the original validation work. */
  independent?: boolean;
  reviewedAt: string;
};
export type CapabilityModelDefinition = {
  id: string;
  domain: CapabilityDomain;
  name: string;
  intendedUse: string;
  inputs: string[];
  output: string;
  validationStatus: CapabilityValidationStatus;
  evidence: CapabilityEvidence[];
  limitations: string[];
  medicalUseAllowed: false;
};

export type PersonalModelSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  location: 'device-only';
  historyWindowDays: number;
  trainingSessions: number;
  readinessCheckIns: number;
  plannedCardioMinutes: number;
  preferredGymId: string;
  strengthExposureByExercise: Record<string, number>;
  domainPriorities: Partial<Record<CapabilityDomain, string>>;
  limitations: string[];
};

export type IntegrationScope = 'training:read' | 'connected-health:read' | 'preventive:read' | 'coaching:read';
export type IntegrationBundle = {
  schemaVersion: 1;
  generatedAt: string;
  scopes: IntegrationScope[];
  training?: HumanHealthExport;
  connectedHealth?: { observations: HealthObservation[]; sources: HealthSourceState[] };
  preventive?: { records: PreventiveRecord[]; reminders: PreventiveReminder[] };
  coaching?: { note: string };
  safety: string;
};

export type FeatureRiskProfile = {
  id: string;
  name: string;
  diagnosticClaim?: boolean;
  treatmentRecommendation?: boolean;
  medicationOrInsulinDose?: boolean;
  emergencyMonitoring?: boolean;
  clinicianDecisionSupport?: boolean;
  patientSpecificRiskScore?: boolean;
  cameraForClinicalAssessment?: boolean;
  wellnessEducationOnly?: boolean;
};
export type RegulatoryGateResult = {
  decision: 'wellness-scope' | 'specialist-review-required' | 'blocked';
  triggers: string[];
  message: string;
  legalDetermination: false;
};

export type ConnectedMetricSummary = {
  metric: ConnectedMetric;
  sourceId: string;
  sourceNames: string[];
  sampleCount: number;
  latestAt: string | null;
  latestValue: number | null;
  unit: string | null;
};
