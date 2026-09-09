'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAllHumanHealthData, createFullHealthArchive, downloadJson } from '@/lib/connected-health';
import { Equipment, GymProfile, SessionId } from '@/lib/domain';
import { UserPreferences } from '@/lib/preferences';

const temporaryEquipment: Equipment[] = ['rack', 'barbell', 'bench', 'cable', 'dumbbell', 'machine', 'pullup-bar', 'dip-station', 'cardio'];
const sessions: SessionId[] = ['upper-a', 'lower-a', 'upper-b', 'lower-b'];

function label(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function isFailureNotice(value: string) {
  const message = value.toLowerCase();
  return message.includes('failed') || message.includes('could not') || message.includes('invalid') || message.includes('unavailable') || message.includes('incomplete') || message.includes('error');
}

export function SettingsPanel({
  preferences,
  gyms,
  onChange,
  onDataCleared,
}: {
  preferences: UserPreferences;
  gyms: GymProfile[];
  onChange: (next: UserPreferences) => void;
  onDataCleared: () => void;
}) {
  const [notice, setNotice] = useState('');
  const [dataBusy, setDataBusy] = useState(false);

  function update(patch: Partial<UserPreferences>) {
    onChange({ ...preferences, ...patch });
    setNotice('');
  }

  function updatePlates(text: string) {
    const plates = [...new Set(text.split(',').map(value => Number(value.trim())).filter(value => Number.isFinite(value) && value > 0))].sort((a, b) => b - a);
    if (plates.length > 0) {
      update({ availablePlatesKg: plates });
    }
  }

  async function toggleNotifications() {
    if (preferences.notificationEnabled) {
      update({ notificationEnabled: false });
      setNotice('Rest notifications disabled.');
      return;
    }
    if (typeof Notification === 'undefined') {
      setNotice('This browser does not expose notification permission to the app.');
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    update({ notificationEnabled: permission === 'granted' });
    setNotice(permission === 'granted' ? 'Rest notifications enabled.' : 'Notification permission was not granted.');
  }

  async function exportData() {
    setDataBusy(true);
    setNotice('');
    try {
      downloadJson(`human-health-full-${new Date().toISOString().slice(0, 10)}.json`, await createFullHealthArchive());
      setNotice('Complete local archive prepared, including training, connected-health, and preventive health data.');
    } catch (error) {
      setNotice(error instanceof Error ? `Complete export failed: ${error.message}` : 'Complete export failed.');
    } finally {
      setDataBusy(false);
    }
  }

  async function clearData() {
    if (!window.confirm('Delete ALL Human Health data stored in this browser, including training, connected-health, and preventive health data? This cannot be undone unless you exported a complete backup.')) return;
    setDataBusy(true);
    setNotice('');
    try {
      await clearAllHumanHealthData();
      setNotice('All local Human Health data was deleted.');
      onDataCleared();
    } catch (error) {
      setNotice(error instanceof Error ? `Delete-all failed: ${error.message}` : 'Delete-all failed. Some local data may remain; the app will not report success until the complete deletion finishes.');
    } finally {
      setDataBusy(false);
    }
  }

  function toggleUnavailable(item: Equipment) {
    const selected = preferences.lastUnavailableEquipment.includes(item);
    update({ lastUnavailableEquipment: selected ? preferences.lastUnavailableEquipment.filter(value => value !== item) : [...preferences.lastUnavailableEquipment, item] });
  }

  const noticeIsFailure = isFailureNotice(notice);
  return <>
    {notice && <div className={noticeIsFailure ? 'connection-state storage-error' : 'connection-state'} role={noticeIsFailure ? 'alert' : 'status'} aria-live={noticeIsFailure ? 'assertive' : 'polite'}>{notice}</div>}
    <section className="card" aria-labelledby="training-settings-title">
      <h2 id="training-settings-title" style={{fontSize: '1.05rem', fontWeight: 600}}>Training</h2>
      <div className="settings-grid">
        <label><b>Gym profile</b><select value={preferences.selectedGymId} onChange={event => update({ selectedGymId: event.target.value })}>{gyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select></label>
        <label><b>Life mode</b><select value={preferences.lifeMode} onChange={event => update({ lifeMode: event.target.value as UserPreferences['lifeMode'] })}><option value="normal">Normal</option><option value="travel">Travel</option><option value="return">Return to training</option><option value="maintenance">Maintenance</option></select></label>
        <label><b>Default rest</b><input type="number" min="15" max="600" step="15" value={preferences.defaultRestSeconds} onChange={event => update({ defaultRestSeconds: Number(event.target.value) })}/><small>seconds</small></label>
        <label><b>Units</b><select value={preferences.unitSystem} onChange={event => update({ unitSystem: event.target.value as UserPreferences['unitSystem'] })}><option value="metric">Metric (kg)</option><option value="imperial">Imperial (lb)</option></select></label>
        <label><b>Override next</b><select value={preferences.nextSessionOverride || ''} onChange={event => update({ nextSessionOverride: (event.target.value || null) as SessionId | null })}><option value="">Auto</option>{sessions.map(session => <option key={session} value={session}>{label(session)}</option>)}</select></label>
        <label><b>Cardio target</b><input type="number" min="0" max="600" step="10" value={preferences.cardioTargetMinutes} onChange={event => update({ cardioTargetMinutes: Number(event.target.value) })}/><small>minutes/week</small></label>
      </div>
      <div className="toggle-grid">
        <button className={preferences.highImpactAllowed ? 'active' : ''} aria-pressed={preferences.highImpactAllowed} onClick={() => update({ highImpactAllowed: !preferences.highImpactAllowed })}>High-impact {preferences.highImpactAllowed ? 'on' : 'off'}</button>
        <button className={preferences.notificationEnabled ? 'active' : ''} aria-pressed={preferences.notificationEnabled} onClick={toggleNotifications}>Rest alerts {preferences.notificationEnabled ? 'on' : 'off'}</button>
        <button className={preferences.vibrationEnabled ? 'active' : ''} aria-pressed={preferences.vibrationEnabled} onClick={() => update({ vibrationEnabled: !preferences.vibrationEnabled })}>Vibration {preferences.vibrationEnabled ? 'on' : 'off'}</button>
      </div>
    </section>

    <section className="card" aria-labelledby="equipment-state-title">
      <h2 id="equipment-state-title" style={{fontSize: '1.05rem', fontWeight: 600}}>Equipment unavailable</h2>
      <p className="muted" style={{marginBottom: '14px'}}>Mark equipment that's busy or broken. Next workout routes around it.</p>
      <div className="chip-grid">{temporaryEquipment.map(item => <button key={item} className={preferences.lastUnavailableEquipment.includes(item) ? 'active' : ''} aria-pressed={preferences.lastUnavailableEquipment.includes(item)} onClick={() => toggleUnavailable(item)}>{label(item)}</button>)}</div>
      {preferences.lastUnavailableEquipment.length > 0 && <button className="link" onClick={() => update({ lastUnavailableEquipment: [] })} style={{marginTop: '12px'}}>Clear all</button>}
    </section>

    <section className="card" aria-labelledby="plates-title">
      <h2 id="plates-title" style={{fontSize: '1.05rem', fontWeight: 600}}>Plates & bar</h2>
      <div className="settings-grid">
        <label><b>Bar weight (kg)</b><input type="number" min="0" max="50" step="0.5" value={preferences.plateBarKg} onChange={event => update({ plateBarKg: Number(event.target.value) })}/></label>
        <label><b>Plates (kg)</b><input value={preferences.availablePlatesKg.join(', ')} onChange={event => updatePlates(event.target.value)} placeholder="20, 10, 5, 2.5"/><small>Comma-separated</small></label>
      </div>
    </section>

    <section className="card" aria-labelledby="data-controls-title">
      <h2 id="data-controls-title" style={{fontSize: '1.05rem', fontWeight: 600}}>Data</h2>
      <p className="muted" style={{marginBottom: '14px'}}>All data stays on this device. Exports are files you control.</p>
      <div className="button-row"><button className="primary" disabled={dataBusy} onClick={() => void exportData()}>{dataBusy ? 'Preparing…' : 'Export backup'}</button><button className="danger" disabled={dataBusy} onClick={() => void clearData()}>Delete all data</button></div>
    </section>

    <section className="card">
      <h2 style={{fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px'}}>Privacy</h2>
      <p className="muted" style={{marginBottom: '12px'}}>Data practices, safety boundaries, medical disclaimers.</p>
      <Link href="/privacy" className="link" style={{display: 'inline-flex', alignItems: 'center', textDecoration: 'none'}}>View privacy policy</Link>
    </section>
  </>;
}
