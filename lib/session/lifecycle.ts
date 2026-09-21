/**
 * Session lifecycle: pause / resume / interrupt recovery
 * (extracted from app/human-health-app.tsx for #148).
 *
 * The interrupted mapping is deliberate: a workout that was `active` when the app
 * lost the page is restored as `interrupted` on next load, never silently resumed.
 */
import type { Workout } from '../domain';

/** Map a persisted workout back into a safe to-render state on hydration. */
export function restoreActiveWorkout(saved: Workout | null): Workout | null {
  if (!saved) return null;
  return {
    ...saved,
    status: saved.status === 'active' ? ('interrupted' as const) : saved.status,
  };
}

export function pauseWorkout(active: Workout, pausedAt = new Date().toISOString()): Workout {
  return { ...active, status: 'paused', pausedAt };
}

export function resumeWorkout(active: Workout): Workout {
  return { ...active, status: 'active', pausedAt: undefined };
}

/** Human-facing label for a non-active workout state. */
export function lifecycleHeading(status: Workout['status']): string {
  return status === 'interrupted' ? 'Welcome back' : 'Paused';
}
