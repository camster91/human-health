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
  getIntegrationHost,
  integrationScopes,
  phase5RegulatoryCheckpoints,
  platformStore,
  preventiveSafetyNote,
  regulatoryGate,
  reminderState,
  shareIntegrationBundle,
  type IntegrationScope,
  type PlatformLocalData,
  type PreventiveEntrySource,
  type PreventiveRecordCategory,
} from '@/lib/platform';
import styles from './platform/platform.module.css';

const categories: PreventiveRecordCategory[] = ['checkup', 'screening', 'vaccination', 'dental', 'vision', 'lab', 'other'];

function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function PlatformPanel() {
  const connected = useConnectedHealthSnapshot();
  const [training, setTraining] = useState<HumanHealthExport | null>(null);
  const [data, setData] = useState<PlatformLocalData>({ schemaVersion: 1, records: [], reminders: [] });
  const [notice, setNotice] = useState('');

  const [recordTitle, setRecordTitle] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordCategory, setRecordCategory] = useState<PreventiveRecordCategory>('checkup');
  const [recordSource, setRecordSource] = useState<PreventiveEntrySource>('manual');
  const [recordProvider, setRecordProvider] = useState('');
  const [recordNote, setRecordNote] = useState('');

  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDue, setReminderDue] = useState('');
  const [reminderCategory, setReminderCategory] = useState<PreventiveRecordCategory>('checkup');
  const [reminderSource, setReminderSource] = useState<PreventiveEntrySource>('manual');
  const [reminderProvider, setReminderProvider] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [repeatMonths, setRepeatMonths] = useState('');

  const [scopes, setScopes] = useState<IntegrationScope[]>(['preventive:read']);
  const [integrationHostName, setIntegrationHostName] = useState('');
  const [sharing, setSharing] = useState(false);

  const [riskName, setRiskName] = useState('Proposed wellness feature');
  const [diagnostic, setDiagnostic] = useState(false);
  const [treatment, setTreatment] = useState(false);
  const [dosing, setDosing] = useState(false);
  const [emergency, setEmergency] = useState(false);

  useEffect(() => {
    setTraining(store.exportData());
    const loaded = platformStore.load();
    setData(loaded);
    const localWarning = platformStore.getMutationError();
    if (localWarning) setNotice(localWarning);
    const host = getIntegrationHost();
    if (host) host.describe().then(description => setIntegrationHostName(description.name)).catch(() => setIntegrationHostName('Connected integration'));
  }, []);

  const personal = useMemo(() => training ? createPersonalModelSnapshot(training) : null, [training]);
  const clinician = useMemo(() => training ? buildClinicianSummary({ training, connectedObservations: connected.observations, connectedSources: connected.sources, preventiveRecords: data.records, preventiveReminders: data.reminders }) : null, [training, connected.observations, connected.sources, data]);
  const risk = useMemo(() => regulatoryGate({ id: 'ui-review', name: riskName || 'Proposed feature', diagnosticClaim: diagnostic, treatmentRecommendation: treatment, medicationOrInsulinDose: dosing, emergencyMonitoring: emergency, wellnessEducationOnly: !diagnostic && !treatment && !dosing && !emergency }), [riskName, diagnostic, treatment, dosing, emergency]);

  function addRecord() {
    if (!recordTitle.trim() || !recordDate) return setNotice('Enter a title and date first.');
    try {
      const next = platformStore.addRecord({
        id: crypto.randomUUID(),
        title: recordTitle,
        category: recordCategory,
        occurredAt: new Date(`${recordDate}T12:00:00Z`).toISOString(),
        source: recordSource,
        provider: recordProvider,
        note: recordNote,
        createdAt: new Date().toISOString(),
      });
      setData(next);
      setRecordTitle(''); setRecordDate(''); setRecordProvider(''); setRecordNote('');
      setNotice('Preventive record saved locally.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save record.'); }
  }

  function addReminder() {
    if (!reminderTitle.trim() || !reminderDue) return setNotice('Enter a reminder title and due date first.');
    try {
      const next = platformStore.addReminder({
        id: crypto.randomUUID(),
        title: reminderTitle,
        category: reminderCategory,
        dueOn: reminderDue,
        repeatMonths: repeatMonths.trim() ? Number(repeatMonths) : undefined,
        source: reminderSource,
        provider: reminderProvider,
        note: reminderNote,
        enabled: true,
        createdAt: new Date().toISOString(),
      });
      setData(next);
      setReminderTitle(''); setReminderDue(''); setReminderProvider(''); setReminderNote(''); setRepeatMonths('');
      setNotice('Reminder saved locally. Human Health did not choose the date or interval.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save reminder.'); }
  }

  function completePreventiveReminder(id: string) {
    if (!window.confirm('Mark this reminder complete today? If you explicitly entered a repeat interval, the next reminder will be created from today.')) return;
    try {
      setData(platformStore.completeReminder(id, new Date()));
      setNotice('Reminder marked complete and recorded locally.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not complete reminder.'); }
  }

  function deleteRecord(id: string) {
    if (!window.confirm('Delete this preventive record from this browser?')) return;
    try { setData(platformStore.removeRecord(id)); setNotice('Preventive record deleted locally.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not delete record.'); }
  }

  function deleteReminder(id: string) {
    if (!window.confirm('Delete this preventive reminder from this browser?')) return;
    try { setData(platformStore.removeReminder(id)); setNotice('Preventive reminder deleted locally.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not delete reminder.'); }
  }

  function toggleScope(scope: IntegrationScope) {
    setScopes(current => current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]);
  }

  function createSelectedBundle() {
    if (!training) throw new Error('Training data is still loading.');
    return createIntegrationBundle({ scopes, training, connectedObservations: connected.observations, connectedSources: connected.sources, preventiveRecords: data.records, preventiveReminders: data.reminders });
  }

  function exportIntegration() {
    try {
      const bundle = createSelectedBundle();
      download('human-health-integration.json', JSON.stringify(bundle, null, 2));
      setNotice('Scoped integration bundle exported locally. No background sharing occurred.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not create integration bundle.'); }
  }

  async function shareIntegration() {
    try {
      const bundle = createSelectedBundle();
      const destination = integrationHostName || 'the connected integration';
      if (!window.confirm(`Share the selected scope(s) (${bundle.scopes.join(', ')}) with ${destination}? This sends the included data outside this browser.`)) return;
      setSharing(true);
      const result = await shareIntegrationBundle(bundle, { confirmed: true });
      setNotice(result.accepted ? `Shared with ${destination}${result.receipt ? ` · receipt ${result.receipt}` : ''}.` : result.message || `${destination} did not accept the bundle.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not share integration bundle.'); }
    finally { setSharing(false); }
  }

  return <>
    <section className="hero"><span className="pill">PHASE 5 · LONG-HORIZON PLATFORM</span><h2>User-owned health context, without pretending to be a medical authority</h2><p>Phase 5 adds preventive records/reminders, clinician discussion exports, validation gates, on-device personal baselines, scoped integration contracts and regulatory escalation checkpoints.</p></section>
    {notice && <div className="coach-note" role="status" aria-live="polite">{notice}</div>}

    <section className="card" aria-labelledby="preventive-title"><h2 id="preventive-title">Preventive records and reminders</h2><p className="muted">{preventiveSafetyNote}</p><div className={styles.grid}>
      <div className={styles.item}><h3>Add record</h3><div className={styles.form}>
        <label><b>Title</b><input value={recordTitle} onChange={e=>setRecordTitle(e.target.value)} placeholder="Example: dental cleaning"/></label>
        <label><b>Category</b><select value={recordCategory} onChange={e=>setRecordCategory(e.target.value as PreventiveRecordCategory)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
        <label><b>Date</b><input type="date" value={recordDate} onChange={e=>setRecordDate(e.target.value)}/></label>
        <label><b>Source</b><select value={recordSource} onChange={e=>setRecordSource(e.target.value as PreventiveEntrySource)}><option value="manual">Entered by me</option><option value="clinician-provided">From clinician/public-health guidance</option></select></label>
        <label><b>Provider/source name (optional)</b><input value={recordProvider} onChange={e=>setRecordProvider(e.target.value)} placeholder="Clinic, clinician, or public-health source"/></label>
        <label><b>Note (optional)</b><textarea rows={2} value={recordNote} onChange={e=>setRecordNote(e.target.value)}/></label>
        <button className="primary" onClick={addRecord}>Save local record</button>
      </div></div>
      <div className={styles.item}><h3>Add reminder</h3><div className={styles.form}>
        <label><b>Title</b><input value={reminderTitle} onChange={e=>setReminderTitle(e.target.value)} placeholder="Enter a reminder you chose or were given"/></label>
        <label><b>Category</b><select value={reminderCategory} onChange={e=>setReminderCategory(e.target.value as PreventiveRecordCategory)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
        <label><b>Due date</b><input type="date" value={reminderDue} onChange={e=>setReminderDue(e.target.value)}/></label>
        <label><b>Source</b><select value={reminderSource} onChange={e=>setReminderSource(e.target.value as PreventiveEntrySource)}><option value="manual">Entered by me</option><option value="clinician-provided">From clinician/public-health guidance</option></select></label>
        <label><b>Provider/source name (optional)</b><input value={reminderProvider} onChange={e=>setReminderProvider(e.target.value)} placeholder="Clinic, clinician, or public-health source"/></label>
        <label><b>Repeat every N months (optional)</b><input inputMode="numeric" type="number" min="1" max="120" value={repeatMonths} onChange={e=>setRepeatMonths(e.target.value)} placeholder="No repeat by default"/></label>
        <label><b>Note (optional)</b><textarea rows={2} value={reminderNote} onChange={e=>setReminderNote(e.target.value)}/></label>
        <button className="primary" onClick={addReminder}>Save local reminder</button>
      </div></div>
    </div><div className={styles.grid}>
      {data.records.map(record=><article className={styles.item} key={record.id}><span className="pill">{record.category}</span><h3>{record.title}</h3><p>{record.occurredAt.slice(0,10)} · {record.source}{record.provider ? ` · ${record.provider}` : ''}</p>{record.note&&<p className={styles.muted}>{record.note}</p>}<button className="link" onClick={()=>deleteRecord(record.id)}>Delete</button></article>)}
      {data.reminders.map(reminder=><article className={styles.item} key={reminder.id}><span className="pill">{reminderState(reminder)}</span><h3>{reminder.title}</h3><p>Due {reminder.dueOn} · {reminder.source}{reminder.provider ? ` · ${reminder.provider}` : ''}{reminder.repeatMonths ? ` · every ${reminder.repeatMonths} month${reminder.repeatMonths===1?'':'s'}` : ''}</p>{reminder.note&&<p className={styles.muted}>{reminder.note}</p>}<div className={styles.actions}><button className="primary" onClick={()=>completePreventiveReminder(reminder.id)}>Complete today</button><button className="link" onClick={()=>deleteReminder(reminder.id)}>Delete</button></div></article>)}
    </div></section>

    <section className="card" aria-labelledby="clinician-title"><h2 id="clinician-title">Clinician discussion export</h2><p>Generated locally with source/provenance notes and explicit non-diagnostic framing.</p><div className={styles.actions}><button className="primary" disabled={!clinician} onClick={()=>clinician&&download('human-health-clinician-summary.md', clinicianSummaryMarkdown(clinician), 'text/markdown')}>Export Markdown summary</button><button className="ghost" disabled={!clinician} onClick={()=>clinician&&download('human-health-clinician-summary.json', JSON.stringify(clinician,null,2))}>Export JSON summary</button></div>{clinician&&<div className="metrics"><span><b>Training sessions</b>{clinician.training.sessions}</span><span><b>Source-separated metrics</b>{clinician.connectedHealth.metrics.length}</span><span><b>Preventive records</b>{clinician.preventive.records.length}</span></div>}</section>

    <section className="card" aria-labelledby="models-title"><h2 id="models-title">Capability-model validation registry</h2><p>No current model is allowed to claim validation merely because it exists in the app.</p><div className={styles.grid}>{capabilityModelRegistry.map(model=><article className={styles.item} key={model.id}><span className="pill">{model.validationStatus}</span><h3>{model.name}</h3><p>{model.intendedUse}</p><p className={styles.muted}>{canClaimValidated(model)?'Recorded evidence satisfies the software claim gate; intended-use applicability still requires specialist review.':'Not validated for intended clinical use.'}</p></article>)}</div></section>

    <section className="card" aria-labelledby="personal-title"><h2 id="personal-title">On-device personal baseline</h2><p>Deterministic, local-only and descriptive. No cross-user training or automatic sharing.</p>{personal&&<><div className="metrics"><span><b>Window</b>{personal.historyWindowDays} days</span><span><b>Training sessions</b>{personal.trainingSessions}</span><span><b>Readiness check-ins</b>{personal.readinessCheckIns}</span><span><b>Planned cardio</b>{personal.plannedCardioMinutes} min</span></div><button className="ghost" onClick={()=>download('human-health-personal-baseline.json',JSON.stringify(personal,null,2))}>Export my local baseline</button></>}</section>

    <section className="card" aria-labelledby="integration-title"><h2 id="integration-title">Scoped integration export/share</h2><p>Select exactly what an integration bundle may contain. Local export is explicit. A connected host is only sent data after an additional confirmation that lists the selected scopes.</p>{integrationScopes.map(scope=><label className={styles.scope} key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={()=>toggleScope(scope)}/>{scope}</label>)}<div className={styles.actions}><button className="primary" onClick={exportIntegration}>Export selected scopes</button>{integrationHostName&&<button className="ghost" disabled={sharing} onClick={()=>void shareIntegration()}>{sharing?'Sharing…':`Share with ${integrationHostName}`}</button>}</div></section>

    <section className="card" aria-labelledby="regulatory-title"><h2 id="regulatory-title">Regulatory escalation checkpoint</h2><p>This is an internal product-scope gate, not legal advice or regulatory clearance.</p><div className={styles.form}><label><b>Proposed feature</b><input value={riskName} onChange={e=>setRiskName(e.target.value)}/></label><label className={styles.scope}><input type="checkbox" checked={diagnostic} onChange={e=>setDiagnostic(e.target.checked)}/>Diagnostic claim</label><label className={styles.scope}><input type="checkbox" checked={treatment} onChange={e=>setTreatment(e.target.checked)}/>Patient-specific treatment recommendation</label><label className={styles.scope}><input type="checkbox" checked={dosing} onChange={e=>setDosing(e.target.checked)}/>Medication or insulin dosing</label><label className={styles.scope}><input type="checkbox" checked={emergency} onChange={e=>setEmergency(e.target.checked)}/>Emergency monitoring</label></div><div className={risk.decision==='blocked'?styles.danger:risk.decision==='specialist-review-required'?styles.warning:'coach-note'}><b>{risk.decision}</b><br/>{risk.message}</div><details><summary>Phase 5 review checkpoints</summary><ul>{phase5RegulatoryCheckpoints.map(item=><li key={item}>{item}</li>)}</ul></details></section>
  </>;
}
