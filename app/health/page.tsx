import Link from 'next/link';
import { ConnectedHabitCoveragePanel } from '../connected-habit-coverage-panel';
import { ConnectedHealthPanel } from '../connected-health-panel';
import { ConnectedHealthTrendPanel } from '../connected-health-trend-panel';
import { FullArchiveControls } from '../full-archive-controls';

export default function HealthPage() {
  return <main className="app-shell health-page">
    <header><div><span className="eyebrow">HUMAN HEALTH</span><h1>Health</h1></div><Link className="route-back" href="/">Back to training</Link></header>
    <ConnectedHealthPanel />
    <ConnectedHealthTrendPanel />
    <ConnectedHabitCoveragePanel />
    <FullArchiveControls />
  </main>;
}
