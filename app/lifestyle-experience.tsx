'use client';

import { useEffect, useMemo, useState } from 'react';
import { Equipment, HistoryEntry } from '@/lib/domain';
import {
  GlucoseExerciseContext,
  GlucoseTiming,
  GlucoseTrend,
  HealthContext,
  LifestyleDataset,
  LifestylePreferences,
  PersonalRangeRelation,
  TrackingDomain,
  createLifestyleRecord,
  defaultLifestylePreferences,
  localDateKey,
} from '@/lib/lifestyle';
import { buildLifestyleCoachDecision, lifestyleCoachSummary } from '@/lib/lifestyle-coach';
import { lifestyleSummary, sleepTrainingAssociation } from '@/lib/lifestyle-insights';
import { lifestyleStore } from '@/lib/lifestyle-storage';
import { store } from '@/lib/storage';
import { readinessDecision } from '@/lib/whole-person';

const trackingDomains: { id: TrackingDomain; name: string; description: string }[] = [
  { id: 'sleep', name: 'Sleep', description: 'Duration, quality, timing, and interruptions.' },
  { id: 'movement', name: 'Daily movement', description: 'Steps, active minutes, sedentary time, and movement breaks.' },
  { id: 'nutrition', name: 'Nutrition + hydration', description: 'Lightweight user-defined habits; detailed calorie tracking stays optional.' },
  { id: 'wellbeing', name: 'Wellbeing', description: 'Energy, mood, stress, illness, pain, and concerning symptoms.' },
  { id: 'health-context', name: 'Health context', description: 'Optional conditions, medications, allergies, and clinician restrictions.' },
  { id: 'glucose-context', name: 'Exercise/glucose context', description: 'Optional Type 1 diabetes context; never insulin or carbohydrate dosing.' },
];

const blankContext: HealthContext = { schemaVersion: 1, updatedAt: new Date(0).toISOString(), conditions: [], medications: [], allergies: [], clinicianRestrictions: [] };

function parseList(value: string) {
  return [...new Set(value.split(/[\n,]/).map(item => item.trim()).filter(Boolean))];
}

function latest<T extends { recordedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0] || null;
}

function useLifestyleSnapshot() {
  const [dataset, setDataset] = useState<LifestyleDataset>({ sleep: [], movement: [], nutrition: [], wellbeing: [], glucose: [], healthContext: blankContext, preferences: defaultLifestylePreferences });
  const refresh = () => setDataset(lifestyleStore.snapshot());
  useEffect(refresh, []);
  return { dataset, refresh };
}

export function LifestyleTodayCard({ history, equipment }: { history: HistoryEntry[]; equipment: Equipment[] }) {
  const { dataset, refresh } = useLifestyleSnapshot();
  const [phase2Activity, setPhase2Activity] = useState(store.loadActivity());
  const [phase2Readiness, setPhase2Readiness] = useState(store.loadReadiness());
  const [phase2Preferences, setPhase2Preferences] = useState(store.loadPreferences());
  useEffect(() => {
    setPhase2Activity(store.loadActivity());
    setPhase2Readiness(store.loadReadiness());
    setPhase2Preferences(store.loadPreferences());
  }, []);
  const decision = useMemo(() => buildLifestyleCoachDecision({
    dataset,
    baseReadiness: readinessDecision(phase2Readiness.at(-1)?.input || {}),
    readinessRecords: phase2Readiness,
    history,
    activity: phase2Activity,
    availableMinutes: 30,
    mode: phase2Preferences.lifeMode,
    equipment,
    cardioTargetMinutes: phase2Preferences.cardioTargetMinutes,
    priorities: phase2Preferences.domainPriorities,
  }), [dataset, equipment, history, phase2Activity, phase2Preferences, phase2Readiness]);

  return <section className="card" aria-labelledby="lifestyle-today-title">
    <div className="section-heading"><div><span className="eyebrow">LIFESTYLE CONTEXT</span><h3 id="lifestyle-today-title">Today’s human context</h3></div><button className="link" onClick={refresh}>Refresh</button></div>
    <p>{decision.level === 'normal' ? 'Current enabled context supports normal planning.' : decision.level === 'reduced' ? 'Enabled context suggests a conservative version of the plan.' : 'Enabled safety context takes priority over normal progression.'}</p>
    <div className="metrics">
      <span><b>Training state</b>{decision.level}</span>
      <span><b>High intensity</b>{decision.highIntensityAllowed ? 'available' : 'withheld'}</span>
      <span><b>Short plan</b>{decision.minutes ? `${decision.minutes} min` : 'optional/rest'}</span>
      <span><b>Data used</b>{decision.dataUsed.length} sources</span>
    </div>
    {decision.reasons.slice(0, 2).map((reason, index) => <p className="coach-note" key={index}>{reason}</p>)}
    <p className="muted">Missing or disabled data is not guessed. Open Lifestyle to record or change what the coach may use.</p>
  </section>;
}

export function LifestyleExperience({ history, equipment }: { history: HistoryEntry[]; equipment: Equipment[] }) {
  const { dataset, refresh } = useLifestyleSnapshot();
  const [date, setDate] = useState(localDateKey());
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [interruptions, setInterruptions] = useState('');
  const [steps, setSteps] = useState('');
  const [activeMinutes, setActiveMinutes] = useState('');
  const [sedentaryMinutes, setSedentaryMinutes] = useState('');
  const [movementBreaks, setMovementBreaks] = useState('');
  const [hydrationMl, setHydrationMl] = useState('');
  const [produceServings, setProduceServings] = useState('');
  const [proteinTargetMet, setProteinTargetMet] = useState(false);
  const [fibreTargetMet, setFibreTargetMet] = useState(false);
  const [mealsRegular, setMealsRegular] = useState(false);
  const [appetiteAdequate, setAppetiteAdequate] = useState(true);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [illness, setIllness] = useState(false);
  const [pain, setPain] = useState(false);
  const [concerningSymptoms, setConcerningSymptoms] = useState(false);
  const [wellbeingNote, setWellbeingNote] = useState('');
  const [saved, setSaved] = useState('');
  const [preferences, setPreferences] = useState<LifestylePreferences>(defaultLifestylePreferences);
  const [healthContext, setHealthContext] = useState<HealthContext>(blankContext);
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [glucoseTiming, setGlucoseTiming] = useState<GlucoseTiming>('before');
  const [glucoseValue, setGlucoseValue] = useState('');
  const [glucoseRelation, setGlucoseRelation] = useState<PersonalRangeRelation>('unknown');
  const [glucoseTrend, setGlucoseTrend] = useState<GlucoseTrend>('unknown');
  const [glucoseSymptoms, setGlucoseSymptoms] = useState(false);
  const [glucoseNote, setGlucoseNote] = useState('');
  const [phase2Activity, setPhase2Activity] = useState(store.loadActivity());
  const [phase2Readiness, setPhase2Readiness] = useState(store.loadReadiness());
  const [phase2Preferences, setPhase2Preferences] = useState(store.loadPreferences());

  useEffect(() => {
    const nextPreferences = lifestyleStore.loadPreferences();
    const nextContext = lifestyleStore.loadHealthContext();
    setPreferences(nextPreferences);
    setHealthContext(nextContext);
    setConditions(nextContext.conditions.join('\n'));
    setMedications(nextContext.medications.join('\n'));
    setAllergies(nextContext.allergies.join('\n'));
    setRestrictions(nextContext.clinicianRestrictions.join('\n'));
    setPhase2Activity(store.loadActivity());
    setPhase2Readiness(store.loadReadiness());
    setPhase2Preferences(store.loadPreferences());
  }, []);

  const summaries = useMemo(() => lifestyleSummary(dataset), [dataset]);
  const association = useMemo(() => sleepTrainingAssociation(dataset.sleep, history), [dataset.sleep, history]);
  const decision = useMemo(() => buildLifestyleCoachDecision({
    dataset,
    baseReadiness: readinessDecision(phase2Readiness.at(-1)?.input || {}),
    readinessRecords: phase2Readiness,
    history,
    activity: phase2Activity,
    availableMinutes: 30,
    mode: phase2Preferences.lifeMode,
    equipment,
    cardioTargetMinutes: phase2Preferences.cardioTargetMinutes,
    priorities: phase2Preferences.domainPriorities,
  }), [dataset, equipment, history, phase2Activity, phase2Preferences, phase2Readiness]);

  function numberValue(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && value.trim() !== '' ? parsed : undefined;
  }

  function saveDailyCheckIn() {
    const consent = preferences.consent;
    if (consent.sleep && (sleepHours || interruptions || sleepQuality)) {
      lifestyleStore.upsertSleep(createLifestyleRecord(date, { durationMinutes: sleepHours ? Math.round(Number(sleepHours) * 60) : undefined, quality: sleepQuality as 1 | 2 | 3 | 4 | 5, interruptions: numberValue(interruptions) }, `daily-sleep-${date}`));
    }
    if (consent.movement && (steps || activeMinutes || sedentaryMinutes || movementBreaks)) {
      lifestyleStore.upsertMovement(createLifestyleRecord(date, { steps: numberValue(steps), activeMinutes: numberValue(activeMinutes), sedentaryMinutes: numberValue(sedentaryMinutes), movementBreaks: numberValue(movementBreaks) }, `daily-movement-${date}`));
    }
    if (consent.nutrition) {
      lifestyleStore.upsertNutrition(createLifestyleRecord(date, { hydrationMl: numberValue(hydrationMl), produceServings: numberValue(produceServings), proteinTargetMet, fibreTargetMet, mealsRegular, appetiteAdequate }, `daily-nutrition-${date}`));
    }
    if (consent.wellbeing) {
      lifestyleStore.upsertWellbeing(createLifestyleRecord(date, { energy: energy as 1 | 2 | 3 | 4 | 5, mood: mood as 1 | 2 | 3 | 4 | 5, stress: stress as 1 | 2 | 3 | 4 | 5, illness, pain, concerningSymptoms, note: wellbeingNote.trim() || undefined }, `daily-wellbeing-${date}`));
    }
    refresh();
    setSaved('Daily context saved locally.');
  }

  function updateConsent(domain: TrackingDomain, enabled: boolean) {
    const next = { ...preferences, consent: { ...preferences.consent, [domain]: enabled } };
    if (domain === 'glucose-context') next.glucoseContextEnabled = enabled;
    lifestyleStore.savePreferences(next);
    setPreferences(next);
    refresh();
  }

  function savePreferences() {
    lifestyleStore.savePreferences(preferences);
    setPreferences(lifestyleStore.loadPreferences());
    refresh();
    setSaved('Lifestyle settings saved locally.');
  }

  function saveHealthContext() {
    const next: HealthContext = { schemaVersion: 1, updatedAt: new Date().toISOString(), conditions: parseList(conditions), medications: parseList(medications), allergies: parseList(allergies), clinicianRestrictions: parseList(restrictions) };
    const success = lifestyleStore.saveHealthContext(next);
    if (success) {
      setHealthContext(next);
      refresh();
      setSaved('Optional health context saved locally.');
    } else {
      setSaved('Enable health-context consent before saving sensitive context.');
    }
  }

  function saveGlucoseContext() {
    if (!preferences.glucoseContextEnabled || !preferences.consent['glucose-context']) {
      setSaved('Enable exercise/glucose context first.');
      return;
    }
    const value: GlucoseExerciseContext = createLifestyleRecord(date, {
      timing: glucoseTiming,
      valueMmolL: numberValue(glucoseValue),
      relationToPersonalRange: glucoseRelation,
      trend: glucoseTrend,
      symptoms: glucoseSymptoms,
      note: glucoseNote.trim() || undefined,
    });
    lifestyleStore.addGlucose(value);
    refresh();
    setSaved('Exercise/glucose context saved. No treatment or dosing recommendation was generated.');
  }

  function exportAll() {
    const payload = { exportVersion: 1, exportedAt: new Date().toISOString(), training: store.exportData(), lifestyle: lifestyleStore.exportData() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `human-health-export-${localDateKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function deleteDomain(domain: TrackingDomain) {
    if (!window.confirm(`Delete all locally stored ${domain} data? This cannot be undone.`)) return;
    lifestyleStore.clearDomain(domain);
    refresh();
    setSaved(`${domain} data deleted from this browser.`);
  }

  return <div className="lifestyle-grid">
    <section className="hero lifestyle-hero">
      <span className="eyebrow">PHASE 3</span>
      <h2>Lifestyle intelligence</h2>
      <p>Track only what helps. Missing data stays unknown, every recommendation lists its evidence, and medical treatment remains outside the app.</p>
      <div className="metrics">
        <span><b>Current coaching state</b>{decision.level}</span>
        <span><b>High intensity</b>{decision.highIntensityAllowed ? 'available' : 'withheld'}</span>
        <span><b>Enabled domains</b>{Object.values(preferences.consent).filter(Boolean).length}/6</span>
        <span><b>Suggested short plan</b>{decision.minutes ? `${decision.minutes} min` : 'rest/optional'}</span>
      </div>
      {decision.reasons.map((reason, index) => <p className="coach-note" key={index}>{reason}</p>)}
      <details><summary>What the coach used</summary><p>{decision.dataUsed.join(' · ') || 'No lifestyle data used.'}</p><p className="muted">Unknown/disabled: {decision.unknown.join(' · ') || 'None'}</p></details>
      <p className="medical-boundary">{decision.medicalBoundary}</p>
    </section>

    <section className="card" aria-labelledby="daily-context-title">
      <h3 id="daily-context-title">Quick daily context</h3>
      <label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      {preferences.consent.sleep && <fieldset><legend>Sleep</legend><div className="form-grid"><label>Hours<input inputMode="decimal" type="number" min="0" max="24" step="0.25" value={sleepHours} onChange={event => setSleepHours(event.target.value)} /></label><label>Quality (1–5)<input type="range" min="1" max="5" value={sleepQuality} onChange={event => setSleepQuality(Number(event.target.value))} /><span>{sleepQuality}</span></label><label>Interruptions<input inputMode="numeric" type="number" min="0" max="30" value={interruptions} onChange={event => setInterruptions(event.target.value)} /></label></div></fieldset>}
      {preferences.consent.movement && <fieldset><legend>Daily movement</legend><div className="form-grid"><label>Steps<input inputMode="numeric" type="number" min="0" value={steps} onChange={event => setSteps(event.target.value)} /></label><label>Active minutes<input inputMode="numeric" type="number" min="0" value={activeMinutes} onChange={event => setActiveMinutes(event.target.value)} /></label><label>Sedentary minutes<input inputMode="numeric" type="number" min="0" value={sedentaryMinutes} onChange={event => setSedentaryMinutes(event.target.value)} /></label><label>Movement breaks<input inputMode="numeric" type="number" min="0" value={movementBreaks} onChange={event => setMovementBreaks(event.target.value)} /></label></div></fieldset>}
      {preferences.consent.nutrition && <fieldset><legend>Nutrition + hydration</legend><div className="form-grid"><label>Hydration (mL)<input inputMode="numeric" type="number" min="0" value={hydrationMl} onChange={event => setHydrationMl(event.target.value)} /></label><label>Produce servings<input inputMode="decimal" type="number" min="0" step="0.5" value={produceServings} onChange={event => setProduceServings(event.target.value)} /></label></div><div className="check-grid"><label><input type="checkbox" checked={proteinTargetMet} onChange={event => setProteinTargetMet(event.target.checked)} /> My protein habit was met</label><label><input type="checkbox" checked={fibreTargetMet} onChange={event => setFibreTargetMet(event.target.checked)} /> My fibre habit was met</label><label><input type="checkbox" checked={mealsRegular} onChange={event => setMealsRegular(event.target.checked)} /> Meals felt regular</label><label><input type="checkbox" checked={appetiteAdequate} onChange={event => setAppetiteAdequate(event.target.checked)} /> Appetite/energy intake felt adequate</label></div></fieldset>}
      {preferences.consent.wellbeing && <fieldset><legend>Wellbeing</legend><div className="form-grid"><label>Energy (1–5)<input type="range" min="1" max="5" value={energy} onChange={event => setEnergy(Number(event.target.value))} /><span>{energy}</span></label><label>Mood (1–5)<input type="range" min="1" max="5" value={mood} onChange={event => setMood(Number(event.target.value))} /><span>{mood}</span></label><label>Stress (1–5)<input type="range" min="1" max="5" value={stress} onChange={event => setStress(Number(event.target.value))} /><span>{stress}</span></label></div><div className="check-grid"><label><input type="checkbox" checked={illness} onChange={event => setIllness(event.target.checked)} /> Illness</label><label><input type="checkbox" checked={pain} onChange={event => setPain(event.target.checked)} /> Pain/unusual discomfort</label><label><input type="checkbox" checked={concerningSymptoms} onChange={event => setConcerningSymptoms(event.target.checked)} /> Concerning symptoms</label></div><label>Optional note<textarea value={wellbeingNote} maxLength={500} onChange={event => setWellbeingNote(event.target.value)} /></label></fieldset>}
      <button className="primary" onClick={saveDailyCheckIn}>Save daily context</button>
      {saved && <p className="save-state" role="status">{saved}</p>}
    </section>

    <section className="card" aria-labelledby="lifestyle-trends-title">
      <h3 id="lifestyle-trends-title">Your logged patterns</h3>
      <div className="metrics">
        <span><b>Sleep</b>{summaries.sleep.averageHours === null ? 'Insufficient data' : `${summaries.sleep.averageHours.toFixed(1)} h average`}</span>
        <span><b>Movement</b>{summaries.movement.averageSteps === null ? 'Insufficient data' : `${Math.round(summaries.movement.averageSteps)} steps average`}</span>
        <span><b>Hydration</b>{summaries.nutrition.averageHydrationMl === null ? 'Insufficient data' : `${Math.round(summaries.nutrition.averageHydrationMl)} mL average`}</span>
        <span><b>Energy</b>{summaries.wellbeing.averageEnergy === null ? 'Insufficient data' : `${summaries.wellbeing.averageEnergy.toFixed(1)} / 5`}</span>
      </div>
      <p className="coach-note"><b>{association.label}</b><br />{association.message}</p>
      {lifestyleCoachSummary(dataset).map((message, index) => <p className="muted" key={index}>{message}</p>)}
    </section>

    <section className="card" aria-labelledby="tracking-settings-title">
      <h3 id="tracking-settings-title">Tracking consent</h3>
      <p className="muted">Each domain is independent. Turning one off stops it from being used by the lifestyle coach; delete its saved records separately below.</p>
      {trackingDomains.map(domain => <div className="setting-row" key={domain.id}><div><b>{domain.name}</b><small>{domain.description}</small></div><label className="switch-label"><input type="checkbox" checked={preferences.consent[domain.id]} onChange={event => updateConsent(domain.id, event.target.checked)} /> Enable</label><button className="danger-link" onClick={() => deleteDomain(domain.id)}>Delete data</button></div>)}
      <div className="form-grid"><label>Optional hydration target (mL)<input type="number" min="250" max="10000" value={preferences.hydrationTargetMl || ''} onChange={event => setPreferences({ ...preferences, hydrationTargetMl: event.target.value ? Number(event.target.value) : undefined })} /></label><label>Optional produce target<input type="number" min="1" max="20" value={preferences.produceTargetServings || ''} onChange={event => setPreferences({ ...preferences, produceTargetServings: event.target.value ? Number(event.target.value) : undefined })} /></label><label>Local retention<select value={preferences.retainDays === null ? 'forever' : String(preferences.retainDays)} onChange={event => setPreferences({ ...preferences, retainDays: event.target.value === 'forever' ? null : Number(event.target.value) })}><option value="forever">Until I delete it</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label></div>
      <button className="secondary" onClick={savePreferences}>Save settings</button>
    </section>

    {preferences.consent['health-context'] && <section className="card" aria-labelledby="health-context-title">
      <h3 id="health-context-title">Optional health context</h3>
      <p className="muted">This sensitive context can constrain coaching. It cannot diagnose, prescribe, or provide medical clearance.</p>
      <div className="form-grid"><label>Conditions<textarea value={conditions} onChange={event => setConditions(event.target.value)} placeholder="One per line" /></label><label>Medications<textarea value={medications} onChange={event => setMedications(event.target.value)} placeholder="One per line; dosing is not used" /></label><label>Allergies<textarea value={allergies} onChange={event => setAllergies(event.target.value)} placeholder="One per line" /></label><label>Clinician restrictions<textarea value={restrictions} onChange={event => setRestrictions(event.target.value)} placeholder="For example: avoid impact until reassessed" /></label></div>
      <button className="secondary" onClick={saveHealthContext}>Save health context</button>
      {healthContext.updatedAt !== new Date(0).toISOString() && <p className="muted">Last saved: {new Date(healthContext.updatedAt).toLocaleString()}</p>}
    </section>}

    {preferences.glucoseContextEnabled && preferences.consent['glucose-context'] && <section className="card" aria-labelledby="glucose-context-title">
      <h3 id="glucose-context-title">Exercise/glucose context</h3>
      <p className="medical-boundary">For pattern review only. Human Health does not calculate insulin, carbohydrates, corrections, or treatment decisions.</p>
      <div className="form-grid"><label>Timing<select value={glucoseTiming} onChange={event => setGlucoseTiming(event.target.value as GlucoseTiming)}><option value="before">Before exercise</option><option value="during">During exercise</option><option value="after">After exercise</option><option value="later">Later</option></select></label><label>Optional value (mmol/L)<input type="number" min="0" step="0.1" value={glucoseValue} onChange={event => setGlucoseValue(event.target.value)} /></label><label>Relative to my personal range<select value={glucoseRelation} onChange={event => setGlucoseRelation(event.target.value as PersonalRangeRelation)}><option value="unknown">Unknown</option><option value="below">Below</option><option value="within">Within</option><option value="above">Above</option></select></label><label>Trend<select value={glucoseTrend} onChange={event => setGlucoseTrend(event.target.value as GlucoseTrend)}><option value="unknown">Unknown</option><option value="rapidly-falling">Rapidly falling</option><option value="falling">Falling</option><option value="stable">Stable</option><option value="rising">Rising</option><option value="rapidly-rising">Rapidly rising</option></select></label></div><label><input type="checkbox" checked={glucoseSymptoms} onChange={event => setGlucoseSymptoms(event.target.checked)} /> Symptoms are present</label><label>Optional note<textarea maxLength={500} value={glucoseNote} onChange={event => setGlucoseNote(event.target.value)} /></label>
      <button className="secondary" onClick={saveGlucoseContext}>Save context</button>
    </section>}

    <section className="card" aria-labelledby="lifestyle-data-title">
      <h3 id="lifestyle-data-title">Your data</h3>
      <p className="muted">Export training and lifestyle data together as JSON. Deleting lifestyle data affects this browser only.</p>
      <div className="quick-grid"><button className="secondary" onClick={exportAll}>Export all JSON</button><button className="danger" onClick={() => { if (window.confirm('Delete all locally stored lifestyle data and settings? This cannot be undone.')) { lifestyleStore.clearAll(); refresh(); setPreferences(defaultLifestylePreferences); setSaved('All lifestyle data was deleted from this browser.'); } }}>Delete all lifestyle data</button></div>
    </section>
  </div>;
}
