'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnectedHealthSnapshot } from './use-connected-health';
import { store, type HumanHealthExport } from '@/lib/storage';
import {
  buildClinicianSummary,
  capabilityModelRegistry,
  canClaimValidated,
  clinicianSummaryMarkdown,
  createIntegrationBundle,
  createPersonalModelSnapshot,
  integrationScopes,
  phase5RegulatoryCheckpoints,
  platformStore,
  preventiveSafetyNote,
  regulatoryGate,
  reminderState,
  type IntegrationScope,
  type PlatformLocalData,
  type PreventiveRecordCategory,
} from '@/lib/platform';
import styles from './platform/platform.module.css';

const categories: PreventiveRecordCategory[] = ['checkup','screening','vaccination','dental','vision','lab','other'];

function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function PlatformPanel() {
  const connected = useConnectedHealthSnapshot();
  const [training, setTraining] = useState<HumanHealthExport | null>(null);
  const [data, setData] = useState<PlatformLocalData>({ schemaVersion: 1, records: [], reminders: [] });
  const [notice, setNotice] = useState('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordCategory, setRecordCategory] = useState<PreventiveRecordCategory>('checkup');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDue, setReminderDue] = useState('');
  const [reminderCategory, setReminderCategory] = useState<PreventiveRecordCategory>('checkup');
  const [scopes, setScopes] = useState<IntegrationScope[]>(['preventive:read']);
  const [riskName, setRiskName] = useState('Proposed wellness feature');
  const [diagnostic, setDiagnostic] = useState(false);
  const [treatment, setTreatment] = useState(false);
  const [dosing, setDosing] = useState(false);
  const [emergency, setEmergency] = useState(false);

  useEffect(() => { setTraining(store.exportData()); setData(platformStore.load()); }, []);
  const personal = useMemo(() => training ? createPersonalModelSnapshot(training) : null, [training]);
  const clinician = useMemo(() => training ? buildClinicianSummary({ training, connectedObservations: connected.observations, connectedSources: connected.sources, preventiveRecords: data.records, preventiveReminders: data.reminders }) : null, [training, connected.observations, connected.sources, data]);
  const risk = useMemo(() => regulatoryGate({ id: 'ui-review', name: riskName || 'Proposed feature', diagnosticClaim: diagnostic, treatmentRecommendation: treatment, medicationOrInsulinDose: dosing, emergencyMonitoring: emergency, wellnessEducationOnly: !diagnostic && !treatment && !dosing && !emergency }), [riskName, diagnostic, treatment, dosing, emergency]);

  function addRecord() {
    if (!recordTitle.trim() || !recordDate) return setNotice('Enter a title and date first.');
    try {
      const next = platformStore.addRecord({ id: crypto.randomUUID(), title: recordTitle, category: recordCategory, occurredAt: new Date(`${recordDate}T12:00:00`).toISOString(), source: 'manual', createdAt: new Date().toISOString() });
      setData(next); setRecordTitle(''); setRecordDate(''); setNotice('Preventive record saved locally.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save record.'); }
  }
  function addReminder() {
    if (!reminderTitle.trim() || !reminderDue) return setNotice('Enter a reminder title and due date first.');
    try {
      const next = platformStore.addReminder({ id: crypto.randomUUID(), title: reminderTitle, category: reminderCategory, dueOn: reminderDue, source: 'manual', enabled: true, createdAt: new Date().toISOString() });
      setData(next); setReminderTitle(''); setReminderDue(''); setNotice('Reminder saved locally. Human Health did not choose the interval.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save reminder.'); }
  }
  function toggleScope(scope: IntegrationScope) { setScopes(current => current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]); }
  function exportIntegration() {
    if (!training) return;
    try {
      const bundle = createIntegrationBundle({ scopes, training, connectedObservations: connected.observations, connectedSources: connected.sources, preventiveRecords: data.records, preventiveReminders: data.reminders });
      download('human-health-integration.json', JSON.stringify(bundle, null, 2));
      setNotice('Scoped integration bundle exported locally. No background sharing occurred.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not create integration bundle.'); }
  }

  return <>
    <section className="hero"><span className="pill">PHASE 5 · LONG-HORIZON PLATFORM</span><h2>User-owned health context, without pretending to be a medical authority</h2><p>Phase 5 adds preventive records/reminders, clinician discussion exports, validation gates, on-device personal baselines, scoped integration contracts and regulatory escalation checkpoints.</p></section>
    {notice && <div className="coach-note" role="status">{notice}</div>}

    <section className="card" aria-labelledby="preventive-title"><h2 id="preventive-title">Preventive records and reminders</h2><p className="muted">{preventiveSafetyNote}</p><div className={styles.grid}>
      <div className={styles.item}><h3>Add record</h3><div className={styles.form}><input value={recordTitle} onChange={e=>setRecordTitle(e.target.value)} placeholder="Example: dental cleaning" aria-label="Preventive record title"/><select value={recordCategory} onChange={e=>setRecordCategory(e.target.value as PreventiveRecordCategory)} aria-label="Record category">{categories.map(c=><option key={c}>{c}</option>)}</select><input type="date" value={recordDate} onChange={e=>setRecordDate(e.target.value)} aria-label="Record date"/><button className="primary" onClick={addRecord}>Save local record</button></div></div>
      <div className={styles.item}><h3>Add reminder</h3><div className={styles.form}><input value={reminderTitle} onChange={e=>setReminderTitle(e.target.value)} placeholder="Enter a reminder you chose or were given" aria-label="Preventive reminder title"/><select value={reminderCategory} onChange={e=>setReminderCategory(e.target.value as PreventiveRecordCategory)} aria-label="Reminder category">{categories.map(c=><option key={c}>{c}</option>)}</select><input type="date" value={reminderDue} onChange={e=>setReminderDue(e.target.value)} aria-label="Reminder due date"/><button className="primary" onClick={addReminder}>Save local reminder</button></div></div>
    </div><div className={styles.grid}>{data.records.map(record=><article className={styles.item} key={record.id}><span className="pill">{record.category}</span><h3>{record.title}</h3><p>{record.occurredAt.slice(0,10)} · {record.source}</p><button className="link" onClick={()=>setData(platformStore.removeRecord(record.id))}>Delete</button></article>)}{data.reminders.map(reminder=><article className={styles.item} key={reminder.id}><span className="pill">{reminderState(reminder)}</span><h3>{reminder.title}</h3><p>Due {reminder.dueOn} · {reminder.source}</p><button className="link" onClick={()=>setData(platformStore.removeReminder(reminder.id))}>Delete</button></article>)}</div></section>

    <section className="card" aria-labelledby="clinician-title"><h2 id="clinician-title">Clinician discussion export</h2><p>Generated locally with source/provenance notes and explicit non-diagnostic framing.</p><div className={styles.actions}><button className="primary" disabled={!clinician} onClick={()=>clinician&&download('human-health-clinician-summary.md', clinicianSummaryMarkdown(clinician), 'text/markdown')}>Export Markdown summary</button><button className="ghost" disabled={!clinician} onClick={()=>clinician&&download('human-health-clinician-summary.json', JSON.stringify(clinician,null,2))}>Export JSON summary</button></div>{clinician&&<div className="metrics"><span><b>Training sessions</b>{clinician.training.sessions}</span><span><b>Connected metrics</b>{clinician.connectedHealth.metrics.length}</span><span><b>Preventive records</b>{clinician.preventive.records.length}</span></div>}</section>

    <section className="card" aria-labelledby="models-title"><h2 id="models-title">Capability-model validation registry</h2><p>No current model is allowed to claim validation merely because it exists in the app.</p><div className={styles.grid}>{capabilityModelRegistry.map(model=><article className={styles.item} key={model.id}><span className="pill">{model.validationStatus}</span><h3>{model.name}</h3><p>{model.intendedUse}</p><p className={styles.muted}>{canClaimValidated(model)?'Recorded evidence satisfies the current claim gate.':'Not validated for clinical use.'}</p></article>)}</div></section>

    <section className="card" aria-labelledby="personal-title"><h2 id="personal-title">On-device personal baseline</h2><p>Deterministic, local-only and descriptive. No cross-user training or automatic sharing.</p>{personal&&<><div className="metrics"><span><b>Window</b>{personal.historyWindowDays} days</span><span><b>Training sessions</b>{personal.trainingSessions}</span><span><b>Readiness check-ins</b>{personal.readinessCheckIns}</span><span><b>Planned cardio</b>{personal.plannedCardioMinutes} min</span></div><button className="ghost" onClick={()=>download('human-health-personal-baseline.json',JSON.stringify(personal,null,2))}>Export my local baseline</button></>}</section>

    <section className="card" aria-labelledby="integration-title"><h2 id="integration-title">Scoped integration export</h2><p>Select exactly what a future integration bundle may contain. Export is explicit; there is no background third-party sharing.</p>{integrationScopes.map(scope=><label className={styles.scope} key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={()=>toggleScope(scope)}/>{scope}</label>)}<button className="primary" onClick={exportIntegration}>Export selected scopes</button></section>

    <section className="card" aria-labelledby="regulatory-title"><h2 id="regulatory-title">Regulatory escalation checkpoint</h2><p>This is an internal product-scope gate, not legal advice or regulatory clearance.</p><div className={styles.form}><input value={riskName} onChange={e=>setRiskName(e.target.value)} aria-label="Proposed feature name"/><label className={styles.scope}><input type="checkbox" checked={diagnostic} onChange={e=>setDiagnostic(e.target.checked)}/>Diagnostic claim</label><label className={styles.scope}><input type="checkbox" checked={treatment} onChange={e=>setTreatment(e.target.checked)}/>Patient-specific treatment recommendation</label><label className={styles.scope}><input type="checkbox" checked={dosing} onChange={e=>setDosing(e.target.checked)}/>Medication or insulin dosing</label><label className={styles.scope}><input type="checkbox" checked={emergency} onChange={e=>setEmergency(e.target.checked)}/>Emergency monitoring</label></div><div className={risk.decision==='blocked'?styles.danger:risk.decision==='specialist-review-required'?styles.warning:'coach-note'}><b>{risk.decision}</b><br/>{risk.message}</div><details><summary>Phase 5 review checkpoints</summary><ul>{phase5RegulatoryCheckpoints.map(item=><li key={item}>{item}</li>)}</ul></details></section>
  </>;
}
