'use client';

import { connectedHealthTrends } from '@/lib/connected-health';
import { useMemo } from 'react';
import { useConnectedHealthSnapshot } from './use-connected-health';

function display(value: number | null, unit: string) {
  if (value === null) return 'Need more data';
  if (unit === 'minute') return `${(value / 60).toFixed(1)} h average`;
  if (unit === 'count') return `${Math.round(value).toLocaleString()} average`;
  if (unit === 'bpm') return `${value.toFixed(1)} bpm average`;
  if (unit === 'ml/kg/min') return `${value.toFixed(1)} mL/kg/min`;
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

export function ConnectedHealthTrendPanel() {
  const snapshot = useConnectedHealthSnapshot();
  const trends = useMemo(() => connectedHealthTrends(snapshot.observations, snapshot.sources, snapshot.preferences), [snapshot.observations, snapshot.sources, snapshot.preferences]);
  return <section className="card" aria-labelledby="connected-trends-title">
    <div className="section-heading"><div><span className="eyebrow">TRENDS</span><h2 id="connected-trends-title">Connected patterns</h2></div><span className="muted">One source per metric</span></div>
    <p className="muted">Trends compare recent averages with the preceding period. They describe recorded data and do not diagnose a condition.</p>
    {snapshot.error && <p className="connection-state storage-error" role="alert">{snapshot.error}</p>}
    <div className="trend-grid">{trends.map(trend => <article className="trend-card" key={trend.metric}>
      <div className="section-heading"><h3>{trend.label}</h3><span className={`status-badge status-${trend.status}`}>{trend.status}</span></div>
      <strong>{display(trend.currentAverage, trend.unit)}</strong>
      <p>{trend.changePercent === null ? 'No comparable prior window yet.' : `${trend.changePercent >= 0 ? '+' : ''}${trend.changePercent.toFixed(1)}% versus the preceding ${trend.days} days · ${trend.direction}`}</p>
      <small>{trend.note}</small>
    </article>)}</div>
  </section>;
}
