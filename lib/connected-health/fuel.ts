import { deviceLocalDayKey } from './local-day';
import { ConnectedHealthPreferences, HealthObservation } from './types';
import { createManualObservation, habitMetrics } from './habits';

export type FuelCheckType = 'ate-well' | 'under' | 'over' | 'note';

export type FuelCheck = {
  type: FuelCheckType;
  note?: string;
  recordedAt: string;
};

export type FuelPreferences = {
  enableFuelTracking: boolean;
  fuelCheckReminder: boolean;
};

export const defaultFuelPreferences: FuelPreferences = {
  enableFuelTracking: false,
  fuelCheckReminder: false,
};

/**
 * Create a simple fuel check observation. This is intentionally separate from detailed
 * nutrition tracking to keep the UX light. Users can optionally add a note.
 */
export function createFuelCheck(check: FuelCheckType, note?: string, at = new Date()): FuelCheck {
  if (!['ate-well', 'under', 'over', 'note'].includes(check)) {
    throw new Error('Invalid fuel check type. Must be ate-well, under, over, or note.');
  }
  
  if (note && note.length > 500) {
    throw new Error('Fuel note must be 500 characters or fewer.');
  }

  return {
    type: check,
    note: note?.trim() || undefined,
    recordedAt: at.toISOString(),
  };
}

/**
 * Get fuel checks for the last N days from device-local perspective.
 * Skip allowed: missing days are intentionally missing, not counted as failures.
 */
export function recentFuelChecks(
  checks: FuelCheck[],
  options: { now?: Date; days?: number } = {}
): { checks: FuelCheck[]; daysWithChecks: number } {
  const now = options.now || new Date();
  const days = Math.max(1, Math.min(31, Math.floor(options.days || 7)));
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  const recent = checks.filter(
    item => Date.parse(item.recordedAt) >= cutoff.getTime() && Date.parse(item.recordedAt) <= now.getTime()
  );

  const dayKeys = new Set(recent.map(item => deviceLocalDayKey(item.recordedAt)).filter(Boolean));

  return {
    checks: recent.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt)),
    daysWithChecks: dayKeys.size,
  };
}

/**
 * Check if a fuel check exists for today (device-local day)
 */
export function hasFuelCheckToday(checks: FuelCheck[], now = new Date()): boolean {
  const todayKey = deviceLocalDayKey(now);
  return checks.some(check => deviceLocalDayKey(check.recordedAt) === todayKey);
}

/**
 * Get the most recent fuel check
 */
export function latestFuelCheck(checks: FuelCheck[]): FuelCheck | null {
  if (!checks.length) return null;
  return checks.reduce((latest, current) => 
    Date.parse(current.recordedAt) > Date.parse(latest.recordedAt) ? current : latest
  );
}

/**
 * Fuel check summary for display
 */
export function fuelCheckSummary(checks: FuelCheck[], days = 7, now?: Date): string {
  const { daysWithChecks } = recentFuelChecks(checks, { days, now });
  
  if (daysWithChecks === 0) {
    return `No checks logged in the last ${days} days.`;
  }

  return `${daysWithChecks}/${days} days logged.`;
}
