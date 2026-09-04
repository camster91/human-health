'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ConnectedHealthPreferences,
  ConnectedMetric,
  ConnectedMetricSummary,
  HealthDataAdapter,
  HealthObservation,
  HealthSourceState,
  connectAdapter,
  createAppleHealthAdapter,
  createConnectedHealthJson,
  createFullHealthArchive,
  createHealthConnectAdapter,
  createManualObservation,
  disconnectAdapter,
  downloadJson,
  habitMetrics,
  habitTarget,
  healthRepository,
  importAppleHealthXmlFile,
  metricDefinitions,
  parseConnectedJson,
  refreshAdapterState,
  saveImportedSourceStates,
  saveImportedSourceSummaries,
  sourceFreshness,
  syncAdapter,
} from '@/lib/connected-health';
import { useConnectedHealthSnapshot } from './use-connected-health';

const sourceMetricChoices: ConnectedMetric[] = ['steps', 'sleep-duration', 'sleep-stage', 'resting-heart-rate', 'heart-rate', 'cardio-fitness', 'distance', 'active-energy', 'water', 'protein', 'fibre'];

function title(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function displayMetric(summary: ConnectedMetricSummary) {
  if (summary.value === null) return 'No data';
  if (summary.metric === 'sleep-duration') return `${(summary.value / 60).toFixed(1)} h`;
  if (summary.metric === 'water') return summary.value >= 1_000 ? `${(summary.value / 1_000).toFixed(1)} L` : `${Math.round(summary.value)} mL`;
  if (summary.unit === 'count') return Math.round(summary.value).toLocaleString();
  if (summary.unit === 'bpm') return `${Math.round(summary.value)} bpm`;
  if (summary.unit === 'ml/kg/min') return `${summary.value.toFixed(1)} mL/kg/min`;
  return `${summary.value.toFixed(summary.value >= 100 ? 0 : 1)} ${summary.unit}`;
}

function observationValue(observation: HealthObservation) {
  if (observation.metric === 'sleep-duration' || observation.metric === 'sleep-stage' || observation.metric === 'workout-duration') return `${(observation.value / 60).toFixed(1)} h`;
  if (observation.metric === 'water' && observation.value >= 1_000) return `${(observation.value / 1_000).toFixed(1)} L`;
  return `${observation.value.toFixed(observation.value >= 100 ? 0 : 1)} ${observation.unit}`;
}

function formatDate(value?: string) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown';
}

function SourceCard({ adapter, source, busy, onConnect, onSync, onDisconnect, onDelete }: {
  adapter: HealthDataAdapter;
  source?: HealthSourceState;
  busy: boolean;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
}) {
  const status = source ? sourceFreshness(source) : 'not-connected';
  const unavailable = status === 'unavailable';
  const connected = Boolean(source?.grantedMetrics.length);
  return <article className="source-card">
    <div className="section-heading"><div><h3>{adapter.displayName}</h3><p className="muted">{adapter.provider === 'health-connect' ? 'Android native bridge' : 'Apple native HealthKit bridge'}</p></div><span className={`status-badge status-${status}`}>{title(status)}</span></div>
    <p>{source?.error || source?.partialReason || (unavailable ? 'A compatible native host is not present. File import remains available below.' : connected ? `${source?.recordCount || 0} local records · last successful sync ${formatDate(source?.lastSuccessAt)}` : 'Connection and granular permission requests are always user initiated.')}</p>
    {source?.grantedMetrics.length ? <p className="muted">Permission scope: {source.grantedMetrics.map(title).join(', ')}</p> : null}
    <div className="button-row">
      <button className="primary" disabled={busy || unavailable} onClick={connected ? onSync : onConnect}>{busy ? 'Working…' : connected ? 'Sync now' : 'Connect'}</button>
      {connected && <button className="ghost" disabled={busy} onClick={onDisconnect}>Disconnect</button>}
      {source && source.recordCount ? <button className="danger" disabled={busy} onClick={onDelete}>Delete source data</button> : null}
    </div>
  </article>;
}

function MetricCard({ summary }: { summary: ConnectedMetricSummary }) {
  return <article className="metric-card">
    <div className="section-heading"><h3>{summary.label}</h3><span className={`status-badge status-${summary.status}`}>{title(summary.status)}</span></div>
    <strong>{displayMetric(summary)}</strong>
    <p>{summary.note}</p>
    <small>{summary.sourceName ? `Source: ${summary.sourceName}` : 'Source unavailable'}{summary.recordedAt ? ` · recorded ${formatDate(summary.recordedAt)}` : ''}</small>
  </article>;
}

export function ConnectedHealthPanel() {
  const snapshot = useConnectedHealthSnapshot();
  const adapters = useMemo(() => [createHealthConnectAdapter(), createAppleHealthAdapter()], []);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [habitValues, setHabitValues] = useState<Record<ConnectedMetric, number>>({
    steps: 0,
    'sleep-duration': 0,
    'sleep-stage': 0,
    'heart-rate': 0,
    'resting-heart-rate': 0,
    'cardio-fitness': 0,
    distance: 0,
    'active-energy': 0,
    'workout-duration': 0,
    water: 250,
    protein: 25,
    fibre: 5,
    'fruit-vegetable-servings': 1,
    'meal-quality': 3,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all(adapters.map(adapter => refreshAdapterState(adapter))).finally(() => { if (!cancelled) void snapshot.refresh(); });
    return () => { cancelled = true; };
  }, [adapters, snapshot.refresh]);

  async function run(label: string, action: () => Promise<string | void>) {
    setBusy(label);
    setMessage('');
    try {
      const result = await action();
      await snapshot.refresh();
      setMessage(result || 'Completed. Source, freshness, and provenance details were updated locally.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The connected-health operation failed.');
    } finally {
      setBusy('');
    }
  }

  async function connect(adapter: HealthDataAdapter) {
    await run(adapter.sourceId, async () => {
      const state = await connectAdapter(adapter);
      return state.status === 'current' ? `${adapter.displayName} connected and synchronized.` : `${adapter.displayName}: ${title(state.status)}${state.error ? ` — ${state.error}` : ''}`;
    });
  }

  async function sync(adapter: HealthDataAdapter) {
    await run(adapter.sourceId, async () => {
      const state = await syncAdapter(adapter);
      return `${adapter.displayName} sync finished as ${title(state.status)}${state.partialReason ? ` — ${state.partialReason}` : state.error ? ` — ${state.error}` : ''}`;
    });
  }

  async function disconnect(adapter: HealthDataAdapter) {
    await run(adapter.sourceId, async () => {
      await disconnectAdapter(adapter, false);
      return `${adapter.displayName} disconnected. Locally imported observations remain until you delete the source data.`;
    });
  }

  async function deleteSource(sourceId: string, adapter?: HealthDataAdapter) {
    if (!window.confirm('Delete every connected-health observation stored from this source? Other sources and training history will remain.')) return;
    await run(`delete:${sourceId}`, async () => {
      await adapter?.disconnect?.();
      await healthRepository.deleteSource(sourceId);
      return 'The selected source and its locally stored observations were deleted.';
    });
  }

  async function importApple(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run('apple-import', async () => {
      const report = await importAppleHealthXmlFile(file, async batch => {
        const groups = new Map<string, HealthObservation[]>();
        batch.forEach(observation => groups.set(observation.sourceId, [...(groups.get(observation.sourceId) || []), observation]));
        for (const [sourceId, observations] of groups) await healthRepository.upsertBatch(sourceId, { observations, deletedExternalIds: [], complete: true });
      });
      await saveImportedSourceSummaries(report.sourceSummaries);
      return `Imported ${report.importedCount.toLocaleString()} supported Apple Health observations without retaining the complete parsed file in memory. ${report.warnings.join(' ')}`.trim();
    });
  }

  async function importConnectedJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run('json-import', async () => {
      const data = parseConnectedJson(await file.text());
      const result = await healthRepository.importData(data, 'merge');
      return `Merged ${result.accepted.toLocaleString()} connected-health observations. ${result.rejected ? `${result.rejected} invalid observations were rejected.` : ''}`.trim();
    });
  }

  async function exportConnected() {
    await run('connected-export', async () => {
      downloadJson(`human-health-connected-${new Date().toISOString().slice(0, 10)}.json`, await createConnectedHealthJson());
      return 'Connected-health data was prepared as a local JSON download.';
    });
  }

  async function exportFull() {
    await run('full-export', async () => {
      downloadJson(`human-health-full-${new Date().toISOString().slice(0, 10)}.json`, await createFullHealthArchive());
      return 'The complete local Human Health archive was prepared.';
    });
  }

  async function updatePreferences(patch: Partial<ConnectedHealthPreferences>) {
    await run('preferences', async () => {
      await healthRepository.savePreferences({ ...snapshot.preferences, ...patch });
      return 'Connected-health preferences were saved locally.';
    });
  }

  async function logHabit(metric: ConnectedMetric) {
    await run(`habit:${metric}`, async () => {
      const observation = createManualObservation(metric, habitValues[metric]);
      await healthRepository.upsertBatch(observation.sourceId, { observations: [observation], deletedExternalIds: [], complete: true });
      await saveImportedSourceStates([observation]);
      return `${metricDefinitions[metric].label} was recorded locally.`;
    });
  }

  const summaryCards = [snapshot.summary.stepsToday, snapshot.summary.sleepLastNight, snapshot.summary.restingHeartRate, snapshot.summary.heartRate, snapshot.summary.cardioFitness, snapshot.summary.distanceToday, snapshot.summary.activeEnergyToday];
  const habitSummaries: Record<string, ConnectedMetricSummary> = {
    water: snapshot.summary.waterToday,
    protein: snapshot.summary.proteinToday,
    fibre: snapshot.summary.fibreToday,
    'fruit-vegetable-servings': snapshot.summary.fruitVegetablesToday,
    'meal-quality': snapshot.summary.mealQualityToday,
  };
  const recent = [...snapshot.observations].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt)).slice(0, 25);

  return <>
    <section className="hero health-hero">
      <span className="pill">PHASE 3 · LOCAL-FIRST</span>
      <h2>Connected health context</h2>
      <p>Bring in only the signals that improve decisions. Native connections require explicit permission in a compatible app host; browser imports stay on this device and are never uploaded by this implementation.</p>
      <div className="button-row"><button className="primary" disabled={Boolean(busy)} onClick={exportFull}>Export complete archive</button><button className="ghost" disabled={Boolean(busy)} onClick={exportConnected}>Export connected data</button></div>
    </section>

    {snapshot.loading && <p className="connection-state" role="status">Loading connected-health storage…</p>}
    {(snapshot.error || message) && <p className={snapshot.error || message.toLowerCase().includes('fail') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('rejected') ? 'connection-state storage-error' : 'connection-state online'} role={snapshot.error ? 'alert' : 'status'}>{snapshot.error || message}</p>}

    <section className="card" aria-labelledby="connected-overview-title">
      <div className="section-heading"><div><span className="eyebrow">OBSERVE</span><h2 id="connected-overview-title">Current signals</h2></div><span className="muted">{snapshot.observations.length.toLocaleString()} observations</span></div>
      <div className="metric-card-grid">{summaryCards.map(item => <MetricCard key={item.metric} summary={item}/>)}</div>
    </section>

    <section className="card" aria-labelledby="sources-title">
      <h2 id="sources-title">Sources and permissions</h2>
      <p className="muted">The PWA does not request native health permissions automatically. Health Connect and Apple Health become available only through a compatible native bridge.</p>
      <div className="source-card-grid">{adapters.map(adapter => <SourceCard key={adapter.sourceId} adapter={adapter} source={snapshot.sources.find(source => source.id === adapter.sourceId)} busy={busy === adapter.sourceId || busy === `delete:${adapter.sourceId}`} onConnect={() => void connect(adapter)} onSync={() => void sync(adapter)} onDisconnect={() => void disconnect(adapter)} onDelete={() => void deleteSource(adapter.sourceId, adapter)}/>)}</div>
      {snapshot.sources.filter(source => !adapters.some(adapter => adapter.sourceId === source.id)).map(source => <article className="source-card" key={source.id}><div className="section-heading"><div><h3>{source.displayName}</h3><p className="muted">{title(source.provider)} · local {source.provider === 'manual' ? 'entry' : 'import'}</p></div><span className={`status-badge status-${sourceFreshness(source)}`}>{title(sourceFreshness(source))}</span></div><p>{source.recordCount || 0} records · imported {formatDate(source.lastSuccessAt)}</p><button className="danger" disabled={Boolean(busy)} onClick={() => void deleteSource(source.id)}>Delete source data</button></article>)}
    </section>

    <section className="card" aria-labelledby="import-title">
      <h2 id="import-title">Private file import</h2>
      <p className="muted">Files are parsed locally in the browser. Apple Health XML is processed in chunks and unsupported record types are reported rather than guessed.</p>
      <div className="import-grid">
        <label className="file-button"><b>Import Apple Health XML</b><span>Choose export.xml</span><input type="file" accept=".xml,text/xml,application/xml" disabled={Boolean(busy)} onChange={event => void importApple(event)}/></label>
        <label className="file-button"><b>Import connected-health JSON</b><span>Merge a Human Health connected export</span><input type="file" accept=".json,application/json" disabled={Boolean(busy)} onChange={event => void importConnectedJson(event)}/></label>
      </div>
    </section>

    <section className="card" aria-labelledby="habits-title">
      <h2 id="habits-title">Nutrition and hydration habits</h2>
      <p className="muted">Optional, quick habit context only. This does not calculate insulin, medication, carbohydrate treatment, or a medical diet.</p>
      <div className="habit-grid">{habitMetrics.filter(metric => snapshot.preferences.enabledHabits.includes(metric)).map(metric => {
        const summary = habitSummaries[metric];
        const target = habitTarget(metric, snapshot.preferences);
        return <article className="habit-card" key={metric}><div className="section-heading"><h3>{metricDefinitions[metric].label}</h3><span>{displayMetric(summary)} / {target} {metricDefinitions[metric].unit}</span></div><label><b>Add {metricDefinitions[metric].unit}</b><input type="number" min="0" max={metric === 'meal-quality' ? 5 : undefined} step={metric === 'water' ? 50 : 1} value={habitValues[metric]} onChange={event => setHabitValues({ ...habitValues, [metric]: Number(event.target.value) })}/></label><button className="primary" disabled={Boolean(busy)} onClick={() => void logHabit(metric)}>Log</button></article>;
      })}</div>
      <div className="settings-grid"><label><b>Water target (mL)</b><input type="number" min="0" max="10000" step="100" value={snapshot.preferences.waterTargetMl} onChange={event => void updatePreferences({ waterTargetMl: Number(event.target.value) })}/></label><label><b>Protein target (g)</b><input type="number" min="0" max="500" step="5" value={snapshot.preferences.proteinTargetG} onChange={event => void updatePreferences({ proteinTargetG: Number(event.target.value) })}/></label><label><b>Fibre target (g)</b><input type="number" min="0" max="100" step="1" value={snapshot.preferences.fibreTargetG} onChange={event => void updatePreferences({ fibreTargetG: Number(event.target.value) })}/></label><label><b>Fruit/vegetable target</b><input type="number" min="0" max="30" step="1" value={snapshot.preferences.fruitVegetableTarget} onChange={event => void updatePreferences({ fruitVegetableTarget: Number(event.target.value) })}/></label><label><b>Daily step target</b><input type="number" min="0" max="100000" step="500" value={snapshot.preferences.stepTarget} onChange={event => void updatePreferences({ stepTarget: Number(event.target.value) })}/></label></div>
      <button className={snapshot.preferences.useFreshSleepForReadiness ? 'primary' : 'ghost'} onClick={() => void updatePreferences({ useFreshSleepForReadiness: !snapshot.preferences.useFreshSleepForReadiness })}>Fresh connected sleep {snapshot.preferences.useFreshSleepForReadiness ? 'can inform' : 'does not inform'} readiness</button>
    </section>

    <section className="card" aria-labelledby="source-preferences-title">
      <h2 id="source-preferences-title">Primary sources</h2>
      <p className="muted">When multiple providers contain the same metric, Human Health selects one source instead of adding duplicate totals. Leave “Automatic” to prefer current, recently synced data.</p>
      <div className="settings-grid">{sourceMetricChoices.map(metric => {
        const candidates = snapshot.sources.filter(source => snapshot.observations.some(observation => observation.sourceId === source.id && observation.metric === metric));
        if (candidates.length < 2) return null;
        return <label key={metric}><b>{metricDefinitions[metric].label}</b><select value={snapshot.preferences.primarySourceByMetric[metric] || ''} onChange={event => void updatePreferences({ primarySourceByMetric: { ...snapshot.preferences.primarySourceByMetric, [metric]: event.target.value || undefined } })}><option value="">Automatic</option>{candidates.map(source => <option key={source.id} value={source.id}>{source.displayName}</option>)}</select></label>;
      })}</div>
    </section>

    <section className="card" aria-labelledby="provenance-title">
      <h2 id="provenance-title">Recent observations and provenance</h2>
      {recent.length === 0 ? <p>No connected-health observations have been imported or recorded yet.</p> : recent.map(observation => <details className="observation-detail" key={observation.id}><summary><span>{metricDefinitions[observation.metric].label}</span><b>{observationValue(observation)}</b><small>{observation.provenance.sourceName} · {formatDate(observation.recordedAt)}</small></summary><dl><div><dt>Provider</dt><dd>{title(observation.provenance.provider)}</dd></div><div><dt>Ingestion</dt><dd>{title(observation.provenance.ingestionMethod)}</dd></div><div><dt>Original type</dt><dd>{observation.provenance.originalType}</dd></div><div><dt>Original unit</dt><dd>{observation.provenance.originalUnit || 'Not supplied'}</dd></div><div><dt>Device</dt><dd>{observation.provenance.device || 'Not supplied'}</dd></div><div><dt>External ID</dt><dd>{observation.provenance.externalId}</dd></div><div><dt>Quality</dt><dd>{title(observation.quality)}</dd></div><div><dt>Time range</dt><dd>{formatDate(observation.startTime)}{observation.endTime ? ` → ${formatDate(observation.endTime)}` : ''}</dd></div></dl></details>)}
    </section>
  </>;
}
