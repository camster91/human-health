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

export function validationEvidenceSatisfiesClaim(evidence: CapabilityEvidence[]) {
  const external = evidence.some(item => item.kind === 'external-study' && item.reference.trim().length > 0 && item.protocol?.trim());
  const replication = evidence.some(item => item.kind === 'replication' && item.reference.trim().length > 0);
  return Boolean(external && replication);
}

export function canClaimValidated(model: CapabilityModelDefinition) {
  return model.validationStatus === 'validated-for-intended-use' && validationEvidenceSatisfiesClaim(model.evidence);
}

export function withValidationStatus(model: CapabilityModelDefinition, status: CapabilityValidationStatus, evidence: CapabilityEvidence[]): CapabilityModelDefinition {
  if (status === 'validated-for-intended-use' && !validationEvidenceSatisfiesClaim(evidence)) {
    throw new Error('Validated-for-intended-use status requires recorded external-study and replication evidence.');
  }
  return { ...model, validationStatus: status, evidence: [...evidence] };
}

export function validationLabel(model: CapabilityModelDefinition) {
  return canClaimValidated(model) ? 'Validated for recorded intended use' : model.validationStatus.replaceAll('-', ' ');
}
