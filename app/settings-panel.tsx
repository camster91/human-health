'use client';

import { useEffect, useState } from 'react';
import { Equipment, GymProfile, SessionId } from '@/lib/domain';
import { DomainPriority, UserPreferences } from '@/lib/preferences';
import { store } from '@/lib/storage';
import { CapabilityDomain } from '@/lib/whole-person';

const domains: CapabilityDomain[] = ['strength', 'cardio', 'mobility', 'core', 'bodyweight', 'balance', 'power', 'movement', 'recovery', 'consistency'];
const priorities: DomainPriority[] = ['focus', 'maintain', 'deprioritize', 'off'];
const temporaryEquipment: Equipment[] = ['rack', 'barbell', 'bench', 'cable', 'dumbbell', 'machine', 'pullup-bar', 'dip-station', 'cardio'];
const sessions: SessionId[] = ['upper-a', 'lower-a', 'upper-b', 'lower-b'];

function label(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
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
    setNotice('Plate denominations saved. Physical plate-pair quantities are not modelled in Phase 2.');
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

  function exportData() {
    const data = JSON.stringify(store.exportData(), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `human-health-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice('Local Human Health data exported as JSON.');
  }

  function clearData() {
    if (!window.confirm('Delete all Human Health data stored in this browser? This cannot be undone unless you exported a backup.')) return;
    if (!store.clearAll()) {
      setNotice('The browser did not allow all local Human Health data to be deleted. Your current in-memory view was left intact.');
      return;
    }
    setNotice('Local Human Health data deleted.');
    onDataCleared();
  }

  function toggleUnavailable(item: Equipment) {
    const selected = preferences.lastUnavailableEquipment.includes(item);
    update({ lastUnavailableEquipment: selected ? preferences.lastUnavailableEquipment.filter(value => value !== item) : [...preferences.lastUnavailableEquipment, item] });
  }

  return <>
    {notice && <div className="connection-state" role="status" aria-live="polite">{notice}</div>}
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
      <p className="muted">Phase 2 stores data on this device. Export before clearing or moving to another browser. Cloud sync and restore/import are later phases.</p>
      <div className="button-row"><button className="primary" onClick={exportData}>Export JSON backup</button><button className="danger" onClick={clearData}>Delete local data</button></div>
    </section>
  </>;
}
