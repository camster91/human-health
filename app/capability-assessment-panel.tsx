'use client';

import { useState } from 'react';
import { store } from '@/lib/storage';
import { Assessment, capabilityMetrics, latestAssessment } from '@/lib/whole-person';

const assessmentMetricIds = ['pullups', 'dead-hang', 'ankle-mobility', 'single-leg-balance', 'jump', 'carry'];

function noticeIsFailure(value: string) {
  const message = value.toLowerCase();
  return message.includes('valid') || message.includes('could not') || message.includes('failed') || message.includes('error');
}

export function CapabilityAssessmentPanel({ assessments, onChange }: { assessments: Assessment[]; onChange: (next: Assessment[]) => void }) {
  const [metricId, setMetricId] = useState('pullups');
  const [value, setValue] = useState(0);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const metrics = capabilityMetrics.filter(metric => assessmentMetricIds.includes(metric.id));
  const selected = metrics.find(metric => metric.id === metricId) || metrics[0];

  function record() {
    if (!selected || !Number.isFinite(value) || value < 0) {
      setNotice('Enter a valid non-negative assessment value.');
      return;
    }
    const next = [...assessments, { metricId: selected.id, value, note: note.trim() || undefined, recordedAt: new Date().toISOString() }];
    if (!store.saveAssessments(next)) { setNotice('The capability assessment could not be saved.'); return; }
    onChange(next);
    setNote('');
    setNotice('Capability assessment saved. Use the same test conditions next time.');
  }

  const failure = noticeIsFailure(notice);
  return <section className="card" aria-labelledby="assessment-title">
    <h2 id="assessment-title">Capability assessments</h2>
    <p className="muted">Use the same test conditions each time. Each capability remains separate rather than becoming an arbitrary universal health score.</p>
    {notice && <div className={failure ? 'connection-state storage-error' : 'connection-state'} role={failure ? 'alert' : 'status'} aria-live={failure ? 'assertive' : 'polite'}>{notice}</div>}
    <div className="settings-grid"><label><b>Assessment</b><select value={metricId} onChange={event => setMetricId(event.target.value)}>{metrics.map(metric => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><label><b>Value {selected ? `(${selected.unit})` : ''}</b><input type="number" min="0" step="0.1" value={value} onChange={event => setValue(Number(event.target.value))}/></label><label><b>Test conditions</b><input value={note} onChange={event => setNote(event.target.value)} placeholder="e.g. same shoes and surface"/></label></div>
    <button className="primary" onClick={record}>Record assessment</button>
    {metrics.map(metric => { const latest = latestAssessment(assessments, metric.id); return <div className="history" key={metric.id}><b>{metric.name}</b><span>{latest ? `${latest.value} ${metric.unit}` : 'No baseline'}</span><small>{latest?.note || metric.description}</small></div>; })}
  </section>;
}
