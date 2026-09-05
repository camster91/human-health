'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { preflightTrainingStorage } from '@/lib/training-storage-preflight';
import { FullArchiveControls } from './full-archive-controls';

export function TrainingIntegrityGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const check = useCallback(() => {
    setChecking(true);
    // This preflight is deliberately read-only. It discovers corruption across
    // every authoritative training key before runtime loaders are allowed to
    // replay finalization, migrate timers, or clean stale state.
    setErrors(preflightTrainingStorage().errors);
    setChecking(false);
  }, []);

  useEffect(() => { check(); }, [check]);

  if (checking) return <main className="app-shell"><section className="card" role="status"><h1>Human Health</h1><p>Validating your local training data…</p></section></main>;
  if (!errors.length) return <>{children}</>;

  return <main className="app-shell">
    <section className="hero">
      <span className="pill">LOCAL DATA SAFETY HOLD</span>
      <h1>Training recommendations are paused</h1>
      <p>Human Health found persisted training data that cannot be trusted. The app will not turn fallback or partially readable values into a workout recommendation.</p>
    </section>
    <section className="card" aria-labelledby="training-integrity-title">
      <h2 id="training-integrity-title">Training storage needs recovery</h2>
      <div className="connection-state storage-error" role="alert">{errors.join(' ')}</div>
      <p>Restore a validated complete archive in <b>Replace</b> mode or delete local Human Health data. The integrity check itself does not alter stored values. After a successful recovery, this screen rechecks automatically.</p>
      <button className="ghost" onClick={check}>Recheck local training data</button>
    </section>
    <FullArchiveControls initialMode="replace" onStateRecovered={check} />
  </main>;
}
