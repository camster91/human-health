'use client';

import { useState } from 'react';
import { createMindCheck, hasMindCheckToday, mindCheckSummary, MindCheck, MindCheckLevel } from '@/lib/connected-health/mind';
import { createWeeklyReflection, getWeeklyPrompt, hasReflectionThisWeek, reflectionSummary, WeeklyReflection } from '@/lib/connected-health/weekly-reflection';
import { Icon } from './icon-component';

export function MindReflectionPanel({
  mindChecks,
  weeklyReflections,
  onMindChecksChange,
  onWeeklyReflectionsChange,
}: {
  mindChecks: MindCheck[];
  weeklyReflections: WeeklyReflection[];
  onMindChecksChange: (next: MindCheck[]) => void;
  onWeeklyReflectionsChange: (next: WeeklyReflection[]) => void;
}) {
  const [mindLevel, setMindLevel] = useState<MindCheckLevel>('okay');
  const [mindNote, setMindNote] = useState('');
  const [reflectionResponse, setReflectionResponse] = useState('');
  const [persistenceNotice, setPersistenceNotice] = useState('');

  const hasMindToday = hasMindCheckToday(mindChecks);
  const hasReflectionWeek = hasReflectionThisWeek(weeklyReflections);
  const weeklyPrompt = getWeeklyPrompt();
  const mindSummary = mindCheckSummary(mindChecks);
  const reflectSummary = reflectionSummary(weeklyReflections);

  function saveMindCheck() {
    const check = createMindCheck(mindLevel, mindNote);
    const next = [...mindChecks, check];
    
    // Apply retention in the module (180 days)
    const retained = next.slice(-180);
    
    onMindChecksChange(retained);
    setPersistenceNotice('Mind check saved.');
    setMindNote('');
    
    setTimeout(() => setPersistenceNotice(''), 3000);
  }

  function saveReflection() {
    const reflection = createWeeklyReflection(reflectionResponse);
    const next = [...weeklyReflections, reflection];
    
    // Apply retention in the module (52 weeks)
    const retained = next.slice(-52);
    
    onWeeklyReflectionsChange(retained);
    setPersistenceNotice('Weekly reflection saved.');
    setReflectionResponse('');
    
    setTimeout(() => setPersistenceNotice(''), 3000);
  }

  function skipReflection() {
    const reflection = createWeeklyReflection(undefined);
    const next = [...weeklyReflections, reflection];
    const retained = next.slice(-52);
    
    onWeeklyReflectionsChange(retained);
    setPersistenceNotice('Week marked—no reflection needed.');
    
    setTimeout(() => setPersistenceNotice(''), 3000);
  }

  return <>
    {persistenceNotice && (
      <div className="connection-state" role="status" aria-live="polite" style={{ marginBottom: '16px' }}>
        {persistenceNotice}
      </div>
    )}

    <details style={{ marginBottom: '20px' }}>
      <summary>Mind check-in</summary>
      <div style={{ marginTop: '16px' }}>
        <p className="muted" style={{ fontSize: '.88rem', marginBottom: '14px' }}>
          Optional.
        </p>
        
        {hasMindToday ? (
          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', marginBottom: '12px' }}>
            <Icon name="checkmark" style={{ fontSize: '1.2rem', color: 'var(--accent)', marginBottom: '8px' }} />
            <p style={{ fontSize: '.9rem', margin: 0 }}>Logged today.</p>
          </div>
        ) : (
          <>
            <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
              <button 
                className={mindLevel === 'calm' ? 'active' : ''} 
                onClick={() => setMindLevel('calm')}
                style={{ padding: '10px 8px', fontSize: '.88rem' }}
              >
                Calm
              </button>
              <button 
                className={mindLevel === 'okay' ? 'active' : ''} 
                onClick={() => setMindLevel('okay')}
                style={{ padding: '10px 8px', fontSize: '.88rem' }}
              >
                Okay
              </button>
              <button 
                className={mindLevel === 'stressed' ? 'active' : ''} 
                onClick={() => setMindLevel('stressed')}
                style={{ padding: '10px 8px', fontSize: '.88rem' }}
              >
                Stressed
              </button>
              <button 
                className={mindLevel === 'overwhelmed' ? 'active' : ''} 
                onClick={() => setMindLevel('overwhelmed')}
                style={{ padding: '10px 8px', fontSize: '.88rem' }}
              >
                Overwhelmed
              </button>
            </div>
            
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <span style={{ fontSize: '.88rem', display: 'block', marginBottom: '6px' }}>
                <b>Optional note</b> · 300 char max
              </span>
              <textarea
                value={mindNote}
                onChange={e => setMindNote(e.target.value)}
                placeholder=""
                maxLength={300}
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  fontSize: '.9rem',
                  resize: 'vertical'
                }}
              />
            </label>
            
            <button className="primary" style={{ width: '100%' }} onClick={saveMindCheck}>
              Log check-in
            </button>
          </>
        )}
        
        <p className="muted" style={{ fontSize: '.85rem', marginTop: '12px' }}>
          {mindSummary}
        </p>
      </div>
    </details>

    <details style={{ marginBottom: '20px' }}>
      <summary>Weekly reflection</summary>
      <div style={{ marginTop: '16px' }}>
        <p className="muted" style={{ fontSize: '.88rem', marginBottom: '14px' }}>
          One prompt per week.
        </p>
        
        {hasReflectionWeek ? (
          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', marginBottom: '12px' }}>
            <Icon name="checkmark" style={{ fontSize: '1.2rem', color: 'var(--accent)', marginBottom: '8px' }} />
            <p style={{ fontSize: '.9rem', margin: 0 }}>This week complete.</p>
          </div>
        ) : (
          <>
            <div style={{ 
              padding: '14px', 
              background: 'var(--card-bg)', 
              borderRadius: '8px', 
              marginBottom: '12px',
              borderLeft: '3px solid var(--accent)'
            }}>
              <p style={{ fontSize: '.95rem', fontWeight: 500, margin: 0 }}>
                {weeklyPrompt}
              </p>
            </div>
            
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <span style={{ fontSize: '.88rem', display: 'block', marginBottom: '6px' }}>
                <b>Optional</b> · 500 char max
              </span>
              <textarea
                value={reflectionResponse}
                onChange={e => setReflectionResponse(e.target.value)}
                placeholder=""
                maxLength={500}
                rows={4}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  fontSize: '.9rem',
                  resize: 'vertical'
                }}
              />
            </label>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="primary" style={{ flex: 1 }} onClick={saveReflection}>
                Save
              </button>
              <button className="ghost" onClick={skipReflection}>
                Skip
              </button>
            </div>
          </>
        )}
        
        <p className="muted" style={{ fontSize: '.85rem', marginTop: '12px' }}>
          {reflectSummary}
        </p>
      </div>
    </details>
  </>;
}
