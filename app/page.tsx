import { ConnectedReadinessGate } from './connected-readiness-gate';
import { HumanHealthApp } from './human-health-app';
import { TrainingIntegrityGate } from './training-integrity-gate';

export default function Page() {
  return <TrainingIntegrityGate><ConnectedReadinessGate><HumanHealthApp /></ConnectedReadinessGate></TrainingIntegrityGate>;
}
