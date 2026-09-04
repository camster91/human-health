export type MovementVideoGateEvidence = {
  benchmarkDatasetReviewed: boolean;
  falsePositiveRateReviewed: boolean;
  devicePerformanceReviewed: boolean;
  privacyFlowReviewed: boolean;
  retentionPolicyReviewed: boolean;
  accessibilityReviewed: boolean;
};

export function movementVideoGate(evidence: Partial<MovementVideoGateEvidence> = {}) {
  const required: (keyof MovementVideoGateEvidence)[] = ['benchmarkDatasetReviewed','falsePositiveRateReviewed','devicePerformanceReviewed','privacyFlowReviewed','retentionPolicyReviewed','accessibilityReviewed'];
  const missing = required.filter(key => evidence[key] !== true);
  return {
    enabled: missing.length === 0,
    missing,
    message: missing.length
      ? 'Movement/video analysis remains disabled. Reliability, privacy, retention, device-performance, false-positive, and accessibility review must all pass before camera or video analysis can be enabled.'
      : 'Reliability gate passed in configuration. Runtime camera/video analysis still requires a separately reviewed implementation and explicit user permission.',
  };
}
