'use client';
import { useMemo } from 'react';
import { assessmentDue, cardioCoverage, consistencyPattern, dueAssessments, normalizedStrengthTrend, recoveryPattern } from '@/lib/capability-trends';
import { HistoryEntry } from '@/lib/domain';
import { UserPreferences } from '@/lib/preferences';
import { ActivityDose, Assessment, ReadinessRecord, capabilityMetrics } from '@/lib/whole-person';

const assessmentMetricIds = ['pullups', 'dead-hang', 'ankle-mobility', 'single-leg-balance', 'jump', 'carry'];

export function CapabilityTrendPanel({ history, activity, readinessRecords, assessments, preferences }: { history: HistoryEntry[]; activity: ActivityDose[]; readinessRecords: ReadinessRecord[]; assessments: Assessment[]; preferences: UserPreferences }) {
  const strength = useMemo(() => normalizedStrengthTrend(history), [history]);
  const cardio = useMemo(() => cardioCoverage(activity, preferences.cardioTargetMinutes), [activity, preferences.cardioTargetMinutes]);
  const recovery = useMemo(() => recoveryPattern(readinessRecords), [readinessRecords]);
  const consistency = useMemo(() => consistencyPattern(history), [history]);
  const due = useMemo(() => dueAssessments(assessments, assessmentMetricIds), [assessments]);

  return <section className="card" aria-labelledby="longitudinal-title">
    <h2 id="longitudinal-title">Longitudinal capability</h2>
    <p className="muted">Relative change and repeatable tests stay separate by domain. The app does not turn unlike measures into one medical health score.</p>
    <div className="metrics capability-metrics">
      <span><b>Strength trend</b>{strength.percentChange === null ? 'Need repeat data' : `${strength.percentChange >= 0 ? '+' : ''}${strength.percentChange.toFixed(1)}% median`}</span>
      <span><b>Cardio coverage</b>{Math.round(cardio.coverage * 100)}% · {Math.round(cardio.remaining)} equivalent min left</span>
      <span><b>Recovery pattern</b>{recovery.checkIns ? `${recovery.normal}/${recovery.checkIns} normal check-ins` : 'No recent data'}</span>
      <span><b>Consistency</b>{consistency.sessions} sessions / 28 days</span>
      <span><b>Assessments due</b>{due.length}</span>
      <span><b>Repeated lifts</b>{strength.exerciseCount}</span>
    </div>
    <div className="coach-note">{strength.message}</div>
    <div className="coach-note">{recovery.message} {consistency.message}</div>
    {due.length > 0 && <div><b>Retest when convenient</b>{due.map(id => { const metric = capabilityMetrics.find(item => item.id === id); const state = assessmentDue(assessments, id); return <div className="history" key={id}><b>{metric?.name || id}</b><span>{state.daysSince === null ? 'No baseline' : `${state.daysSince} days`}</span><small>{state.message}</small></div>; })}</div>}
  </section>;
}
