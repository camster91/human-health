import { HumanHealthApp } from './human-health-app';
import { TrainingIntegrityGate } from './training-integrity-gate';

export default function Page() {
  return <TrainingIntegrityGate><HumanHealthApp /></TrainingIntegrityGate>;
}
