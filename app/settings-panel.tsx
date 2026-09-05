'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAllHumanHealthData, createFullHealthArchive, downloadJson } from '@/lib/connected-health';
import { Equipment, GymProfile, SessionId } from '@/lib/domain';
import { DomainPriority, UserPreferences } from '@/lib/preferences';
import { CapabilityDomain } from '@/lib/whole-person';

const domains: CapabilityDomain[] = ['strength', 'cardio', 'mobility', 'core', 'bodyweight', 'balance', 'power', 'movement', 'recovery', 'consistency'];
const priorities: DomainPriority[] = ['focus', 'maintain', 'deprioritize', 'off'];
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
  const [platesText, setPlatesText] = useState(preferences.availablePlatesKg.join(', '));
  useEffect(() => { setPlatesText(preferences.availablePlatesKg.join(', ')); }, [preferences.availablePlatesKg]);

  function update(patch: Partial<UserPreferences>) {
    onChange({ ...preferences, ...patch });
  }

  function savePlates() {
    const plates = [...new Set(platesText.split(',').map(value => Number(value.trim())).filter(value => Number.isFinite(value) && value > 0))].sort((a, b) => b - a);
    if (!plates.length) {
      setNotice('Enter at least one positive metric plate denomination, such as 20, 10, 5, 2.5, 1.25.');
      return;
    }
    update({ availablePlatesKg: plates });
    setPlatesText(plates.join(', '));
    setNotice('Plate denominations saved. Physical plate-pair quantities are assumed available.');
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
      setNotice('Complete local archive prepared, including training, health tracking, and preventive care data.');
    } catch (error) {
      setNotice(error instanceof Error ? `Complete export failed: ${error.message}` : 'Complete export failed.');
    } finally {
      setDataBusy(false);
    }
  }

  async function clearData() {
    if (!window.confirm('Delete ALL Human Health data stored in this browser, including training, health tracking, and preventive care data? This cannot be undone unless you exported a complete backup.')) return;
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
      <h2 id="training-settings-title">Training settings</h2>
      <p className="muted">These settings change future recommendations. Existing workout history is never rewritten.</p>
      <div className="settings-grid">
        <label><b>Current gym</b><select value={preferences.selectedGymId} onChange={event => update({ selectedGymId: event.target.value })}>{gyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select></label>
        <label><b>Life mode</b><select value={preferences.lifeMode} onChange={event => update({ lifeMode: event.target.value as UserPreferences['lifeMode'] })}><option value="normal">Normal</option><option value="travel">Travel</option><option value="return">Return to training</option><option value="maintenance">Maintenance</option></select></label>
        <label><b>Default rest</b><input type="number" min="15" max="600" step="15" value={preferences.defaultRestSeconds} onChange={event => update({ defaultRestSeconds: Number(event.target.value) })}/><small>seconds</small></label>
        <label><b>Weekly cardio target</b><input type="number" min="0" max="600" step="10" value={preferences.cardioTargetMinutes} onChange={event => update({ cardioTargetMinutes: Number(event.target.value) })}/><small>moderate-equivalent minutes</small></label>
        <label><b>Units</b><select value={preferences.unitSystem} onChange={event => update({ unitSystem: event.target.value as UserPreferences['unitSystem'] })}><option value="metric">Metric</option><option value="imperial">Imperial display</option></select></label>
        <label><b>Next session override</b><select value={preferences.nextSessionOverride || ''} onChange={event => update({ nextSessionOverride: (event.target.value || null) as SessionId | null })}><option value="">Use rolling recommendation</option>{sessions.map(session => <option key={session} value={session}>{label(session)}</option>)}</select></label>
        <label><b>Bar weight (kg)</b><input type="number" min="0" max="50" step="0.5" value={preferences.plateBarKg} onChange={event => update({ plateBarKg: Number(event.target.value) })}/></label>
        <label><b>Available plate sizes (kg)</b><input value={platesText} onChange={event => setPlatesText(event.target.value)} onBlur={savePlates}/><small>Comma-separated denominations. Use Save plate sizes or leave the field to apply them.</small><button type="button" className="link" onClick={savePlates}>Save plate sizes</button></label>
      </div>
      <div className="toggle-grid">
        <button className={preferences.highImpactAllowed ? 'active' : ''} aria-pressed={preferences.highImpactAllowed} onClick={() => update({ highImpactAllowed: !preferences.highImpactAllowed })}>High-impact work {preferences.highImpactAllowed ? 'allowed' : 'disabled'}</button>
        <button className={preferences.notificationEnabled ? 'active' : ''} aria-pressed={preferences.notificationEnabled} onClick={toggleNotifications}>Rest notifications {preferences.notificationEnabled ? 'on' : 'off'}</button>
        <button className={preferences.vibrationEnabled ? 'active' : ''} aria-pressed={preferences.vibrationEnabled} onClick={() => update({ vibrationEnabled: !preferences.vibrationEnabled })}>Timer vibration {preferences.vibrationEnabled ? 'on' : 'off'}</button>
      </div>
    </section>

    <section className="card" aria-labelledby="equipment-state-title">
      <h2 id="equipment-state-title">Temporarily unavailable</h2>
      <p className="muted">Mark busy or unavailable equipment for the next workout without changing the permanent gym profile.</p>
      <div className="chip-grid">{temporaryEquipment.map(item => <button key={item} className={preferences.lastUnavailableEquipment.includes(item) ? 'active' : ''} aria-pressed={preferences.lastUnavailableEquipment.includes(item)} onClick={() => toggleUnavailable(item)}>{label(item)}</button>)}</div>
      {preferences.lastUnavailableEquipment.length > 0 && <button className="link" onClick={() => update({ lastUnavailableEquipment: [] })}>Clear temporary equipment limits</button>}
    </section>

    <section className="card" aria-labelledby="domain-priority-title">
      <h2 id="domain-priority-title">Capability priorities</h2>
      <p className="muted">Focus areas are recommended first. “Off” removes that domain from automatic catch-up planning, not from your history.</p>
      <div className="settings-grid">{domains.map(domain => <label key={domain}><b>{label(domain)}</b><select value={preferences.domainPriorities[domain]} onChange={event => update({ domainPriorities: { ...preferences.domainPriorities, [domain]: event.target.value as DomainPriority } })}>{priorities.map(priority => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label>)}</div>
    </section>

    <section className="card" aria-labelledby="data-controls-title">
      <h2 id="data-controls-title">Your local data</h2>
      <p className="muted">Human Health stores training, health tracking, and preventive care data locally in this browser. Export a complete archive before clearing or moving devices. Delete-all attempts every local domain even if one store is corrupt or unavailable; any partial failure is reported and already-deleted domains are not recreated.</p>
      <div className="button-row"><button className="primary" disabled={dataBusy} onClick={() => void exportData()}>{dataBusy ? 'Working…' : 'Export complete archive'}</button><button className="danger" disabled={dataBusy} onClick={() => void clearData()}>Delete all local data</button></div>
    </section>

    <section className="card">
      <h2>Privacy & Data Practices</h2>
      <p className="muted">Learn how Human Health handles your data, safety boundaries, and medical disclaimers.</p>
      <Link href="/privacy" className="primary" style={{display: 'inline-block', textDecoration: 'none', textAlign: 'center'}}>View privacy & data practices</Link>
    </section>
  </>;
}