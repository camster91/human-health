'use client';

import { ChangeEvent, useState } from 'react';
import { clearAllHumanHealthData, createFullHealthArchive, downloadJson, importFullHealthArchive } from '@/lib/connected-health';

export function FullArchiveControls() {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function exportFull() {
    setBusy(true);
    setMessage('');
    try {
      downloadJson(`human-health-full-${new Date().toISOString().slice(0, 10)}.json`, await createFullHealthArchive());
      setMessage('Complete local archive prepared.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The archive could not be created.');
    } finally { setBusy(false); }
  }

  async function importFull(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (mode === 'replace' && !window.confirm('Replace all local Human Health training and connected data with this validated archive? A rollback is attempted if import fails.')) return;
    setBusy(true);
    setMessage('');
    try {
      await importFullHealthArchive(await file.text(), mode);
      setMessage(`Complete archive imported in ${mode} mode. Return to Training to reload imported workout state.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The complete archive could not be imported.');
    } finally { setBusy(false); }
  }

  async function clearAll() {
    if (!window.confirm('Delete all training and connected-health data stored by Human Health in this browser? This cannot be undone without an exported archive.')) return;
    setBusy(true);
    setMessage('');
    try {
      await clearAllHumanHealthData();
      setMessage('All local Human Health data was deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local data could not be fully deleted.');
    } finally { setBusy(false); }
  }

  return <section className="card" aria-labelledby="full-archive-title">
    <h2 id="full-archive-title">Complete data portability</h2>
    <p className="muted">The complete archive combines training, preferences, readiness, assessments, connected observations, source states, and sync cursors. Processing stays in this browser.</p>
    {message && <p className={message.toLowerCase().includes('could not') || message.toLowerCase().includes('invalid') ? 'connection-state storage-error' : 'connection-state online'} role="status">{message}</p>}
    <div className="settings-grid"><label><b>Import behaviour</b><select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="merge">Merge, keep current records</option><option value="replace">Replace after validation</option></select></label><label className="file-button"><b>Import complete archive</b><span>Choose a human-health-full JSON file</span><input type="file" accept=".json,application/json" disabled={busy} onChange={event => void importFull(event)}/></label></div>
    <div className="button-row"><button className="primary" disabled={busy} onClick={() => void exportFull()}>Export complete archive</button><button className="danger" disabled={busy} onClick={() => void clearAll()}>Delete all local data</button></div>
  </section>;
}
