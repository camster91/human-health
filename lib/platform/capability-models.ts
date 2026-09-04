import type { CapabilityEvidence, CapabilityModelDefinition, CapabilityValidationStatus } from './types';

export const capabilityModelRegistry: CapabilityModelDefinition[] = [
  {
    id: 'strength-e1rm-trend-v1', domain: 'strength', name: 'Comparable primary-lift trend',
    intendedUse: 'Describe longitudinal change in the same exercise using logged working-set load and repetitions.',
    inputs: ['exercise id', 'working-set load', 'repetitions', 'date', 'pain/form exclusions'], output: 'relative strength trend',
    validationStatus: 'experimental', evidence: [], medicalUseAllowed: false,
    limitations: ['Estimated strength is not a laboratory measurement.', 'Different exercise variants are never treated as equivalent.', 'Not intended for diagnosis, rehabilitation clearance, or injury risk prediction.'],
  },
  {
    id: 'cardio-coverage-v1', domain: 'cardio', name: 'Planned aerobic coverage',
    intendedUse: 'Describe recorded planned aerobic work against a user-configured weekly training target.',
    inputs: ['planned cardio minutes', 'effort category', 'user target'], output: 'weekly target coverage',
    validationStatus: 'experimental', evidence: [], medicalUseAllowed: false,
    limitations: ['Coverage is a training-planning measure, not a cardiovascular-risk score.', 'Missing device or manually omitted sessions lower observed coverage.'],
  },
  {
    id: 'readiness-pattern-v1', domain: 'recovery', name: 'Readiness pattern',
    intendedUse: 'Summarize optional subjective readiness check-ins and current training constraints.',
    inputs: ['sleep/fatigue/soreness/stress/illness/pain check-ins'], output: 'normal/reduced/recovery training context',
    validationStatus: 'experimental', evidence: [], medicalUseAllowed: false,
    limitations: ['Subjective and incomplete by design.', 'Does not diagnose illness, injury, overtraining, or sleep disorders.'],
  },
];

function nonEmpty(value?: string) {
  return Boolean(value?.trim());
}

function validReviewedAt(value: string) {
  return Number.isFinite(Date.parse(value));
}

function completeExternalEvidence(item: CapabilityEvidence) {
  return item.kind === 'external-study'
    && nonEmpty(item.id)
    && nonEmpty(item.title)
    && nonEmpty(item.reference)
    && nonEmpty(item.population)
    && nonEmpty(item.protocol)
    && nonEmpty(item.outcome)
    && validReviewedAt(item.reviewedAt);
}

function completeIndependentReplication(item: CapabilityEvidence) {
  return item.kind === 'replication'
    && item.independent === true
    && nonEmpty(item.id)
    && nonEmpty(item.title)
    && nonEmpty(item.reference)
    && nonEmpty(item.population)
    && nonEmpty(item.protocol)
    && nonEmpty(item.outcome)
    && validReviewedAt(item.reviewedAt);
}

export function validationEvidenceSatisfiesClaim(evidence: CapabilityEvidence[]) {
  const ids = evidence.map(item => item.id.trim()).filter(Boolean);
  if (new Set(ids).size !== ids.length) return false;
  const external = evidence.find(completeExternalEvidence);
  const replication = evidence.find(completeIndependentReplication);
  if (!external || !replication) return false;
  // A replication cannot be represented by the same reference as the original
  // external study. This is still only a software claim gate; evidence quality
  // and applicability require real specialist review outside the codebase.
  return external.reference.trim() !== replication.reference.trim();
}

export function canClaimValidated(model: CapabilityModelDefinition) {
  return model.medicalUseAllowed === false
    && model.validationStatus === 'validated-for-intended-use'
    && nonEmpty(model.intendedUse)
    && validationEvidenceSatisfiesClaim(model.evidence);
}

export function withValidationStatus(model: CapabilityModelDefinition, status: CapabilityValidationStatus, evidence: CapabilityEvidence[]): CapabilityModelDefinition {
  if (status === 'validated-for-intended-use' && !validationEvidenceSatisfiesClaim(evidence)) {
    throw new Error('Validated-for-intended-use status requires complete external-study evidence and a distinct independent replication record.');
  }
  return { ...model, validationStatus: status, evidence: evidence.map(item => ({ ...item })) };
}

export function validationLabel(model: CapabilityModelDefinition) {
  return canClaimValidated(model) ? 'Validated for recorded intended use' : model.validationStatus.replaceAll('-', ' ');
}
