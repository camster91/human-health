'use client';

import { useMemo } from 'react';
import { consistencyPattern, normalizedStrengthTrend, recoveryPattern, strengthTrends } from '@/lib/capability-trends';
import { HistoryEntry } from '@/lib/domain';
import { recentTrainingLoad } from '@/lib/load-management';
import { readinessDecisionFromRecords, ActivityDose, ReadinessRecord } from '@/lib/whole-person';
import { Icon } from './icon-component';

function title(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function LiftProgressPanel({
  history,
  activity,
  readinessRecords,
}: {
  history: HistoryEntry[];
  activity: ActivityDose[];
  readinessRecords: ReadinessRecord[];
}) {
  const now = useMemo(() => new Date(), []);
  const latestReadiness = readinessDecisionFromRecords(readinessRecords);
  const recentLoad = useMemo(() => recentTrainingLoad(history, activity, now), [history, activity, now]);
  const consistency = useMemo(() => consistencyPattern(history, now), [history, now]);
  const strengthTrend = useMemo(() => normalizedStrengthTrend(history, now), [history, now]);
  const exerciseTrends = useMemo(() => strengthTrends(history, now), [history, now]);
  const recovery = useMemo(() => recoveryPattern(readinessRecords, now), [readinessRecords, now]);

  const recentSessions = useMemo(() => {
    return [...history]
      .filter(entry => (entry.status || 'completed') !== 'abandoned')
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 7);
  }, [history]);

  if (history.length === 0) {
    return <section className="card">
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Icon name="lift-outline" style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No training data yet</h2>
        <p className="muted">Complete your first workout to see strength progress, volume trends, and readiness patterns here.</p>
      </div>
    </section>;
  }

  return <>
    <section className="card">
      <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Training Volume</h2>
      <div className="metrics-row" style={{ marginBottom: '16px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <Icon name="dumbbell" style={{ fontSize: '1.1rem', color: 'var(--accent)' }} />
            <span className="metric-label">28 DAYS</span>
          </div>
          <div className="metric-value">{consistency.sessions}</div>
          <p className="muted" style={{ fontSize: '.82rem', marginTop: '4px' }}>sessions</p>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <Icon name="activity" style={{ fontSize: '1.1rem', color: 'var(--accent)' }} />
            <span className="metric-label">WEEKLY</span>
          </div>
          <div className="metric-value">{consistency.weeklyAverage.toFixed(1)}</div>
          <p className="muted" style={{ fontSize: '.82rem', marginTop: '4px' }}>avg sessions</p>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '.88rem' }}>{consistency.message}</p>
    </section>

    {strengthTrend.percentChange !== null && (
      <section className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Strength Progress</h2>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 600, color: strengthTrend.percentChange >= 0 ? 'var(--accent)' : 'inherit' }}>
            {strengthTrend.percentChange > 0 ? '+' : ''}{strengthTrend.percentChange.toFixed(1)}%
          </span>
          <span className="muted" style={{ fontSize: '.9rem' }}>median trend</span>
        </div>
        <p className="muted" style={{ fontSize: '.88rem', marginBottom: '16px' }}>{strengthTrend.message}</p>
        
        {exerciseTrends.length > 0 && (
          <details style={{ marginTop: '12px' }}>
            <summary style={{ fontSize: '.9rem', fontWeight: 500, marginBottom: '8px' }}>Exercise breakdown</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {exerciseTrends.map(trend => (
                <div key={trend.exerciseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '.88rem' }}>{title(trend.exerciseId)}</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 500, color: trend.percentChange >= 0 ? 'var(--accent)' : 'inherit' }}>
                    {trend.percentChange > 0 ? '+' : ''}{trend.percentChange.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    )}

    {recovery.checkIns > 0 && (
      <section className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Readiness Pattern</h2>
        <div className="metrics-row" style={{ marginBottom: '12px' }}>
          <div className="metric-card">
            <div className="metric-header">
              <Icon name="checkmark" style={{ fontSize: '1.1rem', color: 'var(--accent)' }} />
              <span className="metric-label">CHECK-INS</span>
            </div>
            <div className="metric-value">{recovery.checkIns}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <Icon name="energy" style={{ fontSize: '1.1rem', color: 'var(--accent)' }} />
              <span className="metric-label">NORMAL</span>
            </div>
            <div className="metric-value">{recovery.normal}</div>
          </div>
        </div>
        {recovery.normalShare !== null && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '.85rem' }}>
              <span className="muted">Normal readiness</span>
              <span>{(recovery.normalShare * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--card-bg)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${recovery.normalShare * 100}%`, transition: 'width 0.3s ease' }}></div>
            </div>
          </div>
        )}
        <p className="muted" style={{ fontSize: '.88rem' }}>{recovery.message}</p>
      </section>
    )}

    {recentLoad.hoursSinceAny !== null && (
      <section className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Recent Load Context</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentLoad.hoursSinceLower !== null && (
            <div className="coach-tip" style={{ margin: 0 }}>
              <Icon name="activity" style={{ fontSize: '1rem', color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '.88rem' }}>Lower · {recentLoad.lowerSets} sets · {Math.round(recentLoad.hoursSinceLower)}h ago</span>
            </div>
          )}
          {recentLoad.upperSets > 0 && recentLoad.hoursSinceLower === null && (
            <div className="coach-tip" style={{ margin: 0 }}>
              <Icon name="activity" style={{ fontSize: '1rem', color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '.88rem' }}>Upper · {recentLoad.upperSets} sets recent</span>
            </div>
          )}
          {recentLoad.hoursSinceHardCardio !== null && (
            <div className="coach-tip" style={{ margin: 0 }}>
              <Icon name="activity" style={{ fontSize: '1rem', color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '.88rem' }}>Hard cardio · {recentLoad.hardCardioMinutes}min · {Math.round(recentLoad.hoursSinceHardCardio)}h ago</span>
            </div>
          )}
        </div>
        <p className="muted" style={{ fontSize: '.88rem', marginTop: '12px' }}>{recentLoad.message}</p>
      </section>
    )}

    <section className="card">
      <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Current Readiness</h2>
      <div style={{ padding: '12px', background: latestReadiness.level === 'recovery' ? 'rgba(255, 100, 100, 0.1)' : latestReadiness.level === 'reduced' ? 'rgba(255, 200, 100, 0.1)' : 'var(--card-bg)', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '4px' }}>
          {title(latestReadiness.level)}
        </div>
        <div className="muted" style={{ fontSize: '.88rem' }}>
          Volume: {(latestReadiness.volumeMultiplier * 100).toFixed(0)}% · Progression: {latestReadiness.allowProgression ? 'allowed' : 'paused'}
        </div>
      </div>
      {latestReadiness.reasons.length > 0 && (
        <p className="muted" style={{ fontSize: '.88rem' }}>{latestReadiness.reasons.join(' ')}</p>
      )}
    </section>

    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Sessions</h2>
        <a href="/health" style={{ fontSize: '.88rem', color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
      </div>
      {recentSessions.map((entry, index) => {
        const date = new Date(entry.completedAt);
        const totalSets = entry.exercises.reduce((sum, ex) => sum + ex.logs.filter(log => !log.warmup).length, 0);
        const duration = entry.startedAt ? Math.floor((new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime()) / 60000) : 0;
        
        return (
          <div key={`${entry.completedAt}-${index}`} className="history" style={{ marginBottom: index < recentSessions.length - 1 ? '8px' : 0 }}>
            <b>{title(entry.session)}</b>
            <span>{date.toLocaleDateString()}</span>
            <small>{totalSets} sets · {duration}min{entry.status === 'ended-early' ? ' · partial' : ''}</small>
          </div>
        );
      })}
    </section>

    <section className="card">
      <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Connected Health</h2>
      <p className="muted" style={{ fontSize: '.88rem', marginBottom: '12px' }}>
        Import Apple Health data for sleep context, heart rate trends, and deeper readiness analysis.
      </p>
      <a href="/health" className="primary" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', padding: '10px 20px' }}>
        Open health tracking →
      </a>
    </section>
  </>;
}
