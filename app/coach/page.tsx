import Link from 'next/link';
import { CoachingPanel } from '../coaching-panel';
import { ConnectedReadinessGate } from '../connected-readiness-gate';

export default function CoachPage() {
  return <ConnectedReadinessGate><main className="app-shell coaching-page">
    <header><div><span className="eyebrow">HUMAN HEALTH</span><h1>Coach</h1></div><Link className="route-back" href="/">Back to training</Link></header>
    <CoachingPanel />
  </main></ConnectedReadinessGate>;
}
