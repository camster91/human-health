'use client';

import { ConnectedMetric, ConnectedMetricSummary, habitCoverage, habitMetrics, habitTarget, metricDefinitions } from '@/lib/connected-health';
import { useConnectedHealthSnapshot } from './use-connected-health';

export function ConnectedHabitCoveragePanel() {
  const snapshot = useConnectedHealthSnapshot();
  const summaries: Partial<Record<ConnectedMetric, ConnectedMetricSummary>> = {
    water: snapshot.summary.waterToday,
    protein: snapshot.summary.proteinToday,
    fibre: snapshot.summary.fibreToday,
    'fruit-vegetable-servings': snapshot.summary.fruitVegetablesToday,
    'meal-quality': snapshot.summary.mealQualityToday,
  };
  const enabled = habitMetrics.filter(metric => snapshot.preferences.enabledHabits.includes(metric));
  return <section className="card" aria-labelledby="habit-coverage-title">
    <div className="section-heading"><div><span className="eyebrow">HABITS</span><h2 id="habit-coverage-title">Seven-day coverage</h2></div><span className="muted">Missing days stay unknown</span></div>
    <p className="muted">Coverage uses one selected source per habit so provider and manual totals are not silently added together.</p>
    {snapshot.loading ? <p role="status">Loading habit history…</p> : enabled.length === 0 ? <p>All optional habit tracking is disabled.</p> : <div className="trend-grid">{enabled.map(metric => {
      const summary = summaries[metric];
      const coverage = habitCoverage(snapshot.observations, metric, habitTarget(metric, snapshot.preferences), { sourceId: summary?.sourceId });
      return <article className="trend-card" key={metric}><div className="section-heading"><h3>{metricDefinitions[metric].label}</h3><span className="status-badge">{coverage.daysMeetingTarget}/7 days</span></div><strong>{coverage.currentStreak} day streak</strong><p>{coverage.average === null ? 'No recent average' : `${coverage.average.toFixed(coverage.average >= 100 ? 0 : 1)} ${metricDefinitions[metric].unit} average on logged days`}</p><small>{coverage.note}{summary?.sourceName ? ` Source: ${summary.sourceName}.` : ''}</small></article>;
    })}</div>}
  </section>;
}
