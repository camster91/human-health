import Link from 'next/link';
import { PlatformPanel } from '../platform-panel';

export default function PlatformPage() {
  return <main className="app-shell">
    <header><div><span className="eyebrow">HUMAN HEALTH</span><h1>Platform</h1></div><Link className="route-back" href="/">Back to training</Link></header>
    <PlatformPanel />
  </main>;
}
