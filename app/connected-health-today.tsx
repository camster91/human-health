'use client';

import { ConnectedHealthSummary, ConnectedMetricSummary } from '@/lib/connected-health';

function value(summary: ConnectedMetricSummary) {
  if (summary.value === null) return 'No data';
  if (summary.metric === 'sleep-duration') return `${(summary.value / 60).toFixed(1)} h`;
  if (summary.metric === 'water') return summary.value >= 1_000 ? `${(summary.value / 1_000).toFixed(1)} L` : `${Math.round(summary.value)} mL`;
  if (summary.unit === 'count') return Math.round(summary.value).toLocaleString();
  if (summary.unit === 'bpm') return `${Math.round(summary.value)} bpm`;
  if (summary.unit === 'ml/kg/min') return `${summary.value.toFixed(1)} mL/kg/min`;
  return `${summary.value.toFixed(summary.value >= 100 ? 0 : 1)} ${summary.unit}`;
}

export function ConnectedHealthToday({ summary, loading, error, onOpen }: { summary: ConnectedHealthSummary; loading: boolean; error?: string; onOpen: () => void }) {
  return <section className="card connected-today" aria-labelledby="connected-today-title">
    <div className="section-heading"><div><span className="eyebrow">CONNECTED CONTEXT</span><h2 id="connected-today-title">Health signals</h2></div><button className="link" onClick={onOpen}>Open health</button></div>
    {loading ? <p role="status">Loading connected data…</p> : error ? <p className="connection-state storage-error" role="alert">{error}</p> : <>
      <div className="metrics">
        <span><b>Steps today</b>{value(summary.stepsToday)}<small>{summary.stepsToday.status}</small></span>
        <span><b>Last sleep</b>{value(summary.sleepLastNight)}<small>{summary.sleepLastNight.status}</small></span>
        <span><b>Resting heart rate</b>{value(summary.restingHeartRate)}<small>{summary.restingHeartRate.status}</small></span>
        <span><b>Water today</b>{value(summary.waterToday)}<small>{summary.waterToday.status}</small></span>
      </div>
      <p className="muted">Connected sleep can inform training readiness only when it is fresh. Source details and overrides remain visible in Health.</p>
    </>}
  </section>;
}
