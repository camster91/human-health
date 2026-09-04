import type { FeatureRiskProfile, RegulatoryGateResult } from './types';

export function regulatoryGate(profile: FeatureRiskProfile): RegulatoryGateResult {
  const blocked: string[] = [];
  const review: string[] = [];
  if (profile.medicationOrInsulinDose) blocked.push('medication or insulin dosing');
  if (profile.emergencyMonitoring) blocked.push('emergency monitoring');
  if (profile.diagnosticClaim) review.push('diagnostic claim');
  if (profile.treatmentRecommendation) review.push('patient-specific treatment recommendation');
  if (profile.clinicianDecisionSupport) review.push('clinician decision support');
  if (profile.patientSpecificRiskScore) review.push('patient-specific health risk score');
  if (profile.cameraForClinicalAssessment) review.push('camera/video used for clinical assessment');

  if (blocked.length) return {
    decision: 'blocked', triggers: blocked,
    message: `This feature profile enters a scope Human Health does not permit in the current product: ${blocked.join(', ')}. Do not implement or release it as a normal wellness feature.`,
    legalDetermination: false,
  };
  if (review.length) return {
    decision: 'specialist-review-required', triggers: review,
    message: `Specialist regulatory, clinical-safety, privacy, security, and product review is required before implementation/release because the feature includes: ${review.join(', ')}. This gate is an internal escalation rule, not a legal determination.`,
    legalDetermination: false,
  };
  return {
    decision: 'wellness-scope', triggers: [],
    message: 'No high-risk trigger is declared in this feature profile. Normal product, privacy, security, accessibility, and evidence review still applies. This is not a legal determination.',
    legalDetermination: false,
  };
}

export const phase5RegulatoryCheckpoints = [
  'Before introducing any diagnostic or disease-risk claim',
  'Before patient-specific treatment or clinician decision-support logic',
  'Before any medication/insulin dosing or emergency-monitoring feature (currently blocked)',
  'Before movement/video is used for a clinical rather than fitness purpose',
  'Before sharing identifiable health data with a new external processor or integration',
  'Before materially changing intended use, target population, or jurisdictions',
];
