'use client';

import { useState } from 'react';
import { createFuelCheck, FuelCheck, FuelCheckType, hasFuelCheckToday, fuelCheckSummary } from '@/lib/connected-health/fuel';
import {
  availableSoftHabits,
  completedToday,
  completeSoftHabit,
  enabledHabitsSummary,
  habitOverviewMessage,
  habitPattern,
  SoftHabitCompletion,
  SoftHabitId,
} from '@/lib/connected-health/soft-habits';
import { store } from '@/lib/storage';

function title(value: string) {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function FuelHabitsPanel({
  fuelChecks,
  softHabitCompletions,
  enabledHabits,
  onFuelChecksChange,
  onSoftHabitCompletionsChange,
}: {
  fuelChecks: FuelCheck[];
  softHabitCompletions: SoftHabitCompletion[];
  enabledHabits: SoftHabitId[];
  onFuelChecksChange: (next: FuelCheck[]) => void;
  onSoftHabitCompletionsChange: (next: SoftHabitCompletion[]) => void;
}) {
  const [fuelNote, setFuelNote] = useState('');
  const [habitNote, setHabitNote] = useState('');
  const [persistenceNotice, setPersistenceNotice] = useState('');

  const hasFuelToday = hasFuelCheckToday(fuelChecks);
  const fuelSummary = fuelCheckSummary(fuelChecks, 7);
  const habitMessage = habitOverviewMessage(softHabitCompletions, enabledHabits);
  const habitSummaries = enabledHabitsSummary(softHabitCompletions, enabledHabits, 7);

  function logFuelCheck(type: FuelCheckType) {
    try {
      const check = createFuelCheck(type, fuelNote || undefined);
      const next = [...fuelChecks, check];
      if (!store.saveFuelChecks(next)) {
        setPersistenceNotice('Fuel check could not be saved in this browser.');
        return;
      }
      setPersistenceNotice('Fuel check saved.');
      onFuelChecksChange(next);
      setFuelNote('');
    } catch (error) {
      setPersistenceNotice(error instanceof Error ? error.message : 'Invalid fuel check');
    }
  }

  function logHabitCompletion(habitId: SoftHabitId) {
    try {
      const completion = completeSoftHabit(habitId, habitNote || undefined);
      const next = [...softHabitCompletions, completion];
      if (!store.saveSoftHabitCompletions(next)) {
        setPersistenceNotice('Habit completion could not be saved in this browser.');
        return;
      }
      setPersistenceNotice('Ritual saved.');
      onSoftHabitCompletionsChange(next);
      setHabitNote('');
    } catch (error) {
      setPersistenceNotice(error instanceof Error ? error.message : 'Invalid habit completion');
    }
  }

  return <>
    {persistenceNotice && <div className="connection-state" role="status" aria-live="polite">{persistenceNotice}</div>}

    <details style={{ marginBottom: '20px' }}>
      <summary>Fuel check</summary>
      <div style={{ marginTop: '16px' }}>
        <p className="muted" style={{ fontSize: '.88rem', marginBottom: '14px' }}>
          Optional quick check-in. Light awareness without tracking every meal.
        </p>
        
        {hasFuelToday ? (
          <div className="coach-note" style={{ marginBottom: '16px' }}>
            <b>Already checked in today</b><br />
            You can log another check if the day changed, but one is enough. Skip is always allowed.
          </div>
        ) : null}

        <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: '12px' }}>
          <button onClick={() => logFuelCheck('ate-well')}>Ate well</button>
          <button onClick={() => logFuelCheck('under')}>Under</button>
          <button onClick={() => logFuelCheck('over')}>Over</button>
        </div>

        <label className="wide-field" style={{ marginBottom: '12px' }}>
          Note (optional)
          <input 
            value={fuelNote} 
            onChange={event => setFuelNote(event.target.value)} 
            placeholder="Light note about today's fuel"
            maxLength={500}
          />
        </label>

        {fuelNote && (
          <button 
            className="primary" 
            style={{ marginBottom: '12px' }}
            onClick={() => logFuelCheck('note')}
          >
            Save note only
          </button>
        )}

        <p className="muted" style={{ fontSize: '.86rem' }}>{fuelSummary}</p>
      </div>
    </details>

    {enabledHabits.length > 0 && (
      <details style={{ marginBottom: '20px' }}>
        <summary>Rituals</summary>
        <div style={{ marginTop: '16px' }}>
          <p className="muted" style={{ fontSize: '.88rem', marginBottom: '14px' }}>
            {habitMessage}
          </p>

          {enabledHabits.map(habitId => {
            const habit = availableSoftHabits.find(h => h.id === habitId);
            if (!habit) return null;

            const isDone = completedToday(softHabitCompletions, habitId);
            const pattern = habitPattern(softHabitCompletions, habitId, { days: 7 });

            return (
              <div className="history" key={habitId} style={{ opacity: isDone ? 0.7 : 1 }}>
                <b>{habit.name}</b>
                <span>{pattern.daysWithCompletions}/{pattern.totalDays} days</span>
                <small>{habit.description}</small>
                {isDone ? (
                  <small style={{ color: 'var(--text-muted)' }}>✓ Done today</small>
                ) : (
                  <button className="link" onClick={() => logHabitCompletion(habitId)}>
                    Mark complete
                  </button>
                )}
              </div>
            );
          })}

          <label className="wide-field" style={{ marginTop: '12px' }}>
            Optional note
            <input 
              value={habitNote} 
              onChange={event => setHabitNote(event.target.value)} 
              placeholder="How did it feel?"
              maxLength={300}
            />
          </label>

          <p className="muted" style={{ fontSize: '.86rem', marginTop: '12px' }}>
            Missing days are fine—this is about building, not perfection.
          </p>
        </div>
      </details>
    )}
  </>;
}
