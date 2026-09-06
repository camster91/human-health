import { deviceLocalDayKey } from './local-day';

export type SoftHabitId = 'morning-movement' | 'evening-wind-down' | 'hydration-check' | 'gratitude-moment' | 'breath-pause';

export type SoftHabit = {
  id: SoftHabitId;
  name: string;
  description: string;
  category: 'movement' | 'calm' | 'nourish' | 'connect';
};

export const availableSoftHabits: SoftHabit[] = [
  {
    id: 'morning-movement',
    name: 'Morning movement',
    description: '2-5 minutes of gentle stretching or light movement to wake up',
    category: 'movement',
  },
  {
    id: 'evening-wind-down',
    name: 'Evening wind-down',
    description: '5-10 minutes of calm activity before sleep',
    category: 'calm',
  },
  {
    id: 'hydration-check',
    name: 'Hydration check',
    description: 'Pause to drink water mindfully',
    category: 'nourish',
  },
  {
    id: 'gratitude-moment',
    name: 'Gratitude moment',
    description: 'Note one thing you appreciate today',
    category: 'connect',
  },
  {
    id: 'breath-pause',
    name: 'Breath pause',
    description: '3-5 conscious breaths to reset',
    category: 'calm',
  },
];

export type SoftHabitCompletion = {
  habitId: SoftHabitId;
  completedAt: string;
  note?: string;
};

export type SoftHabitPreferences = {
  enabledHabits: SoftHabitId[];
  showOnToday: boolean;
};

export const defaultSoftHabitPreferences: SoftHabitPreferences = {
  enabledHabits: [],
  showOnToday: false,
};

/**
 * Record a soft habit completion. No validation of "did you really do it" -
 * this is based on trust and self-awareness, not enforcement.
 */
export function completeSoftHabit(
  habitId: SoftHabitId,
  note?: string,
  at = new Date()
): SoftHabitCompletion {
  if (!availableSoftHabits.find(h => h.id === habitId)) {
    throw new Error(`Unknown habit: ${habitId}`);
  }

  if (note && note.length > 300) {
    throw new Error('Habit note must be 300 characters or fewer.');
  }

  return {
    habitId,
    completedAt: at.toISOString(),
    note: note?.trim() || undefined,
  };
}

/**
 * Get completions for a specific habit in the last N days.
 * Returns personal-best context, NOT streak counting.
 */
export function habitPattern(
  completions: SoftHabitCompletion[],
  habitId: SoftHabitId,
  options: { now?: Date; days?: number } = {}
): {
  habitId: SoftHabitId;
  completions: SoftHabitCompletion[];
  daysWithCompletions: number;
  totalDays: number;
  mostRecentCompletion: SoftHabitCompletion | null;
  message: string;
} {
  const now = options.now || new Date();
  const totalDays = Math.max(1, Math.min(90, Math.floor(options.days || 7)));
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (totalDays - 1));

  const filtered = completions.filter(
    item =>
      item.habitId === habitId &&
      Date.parse(item.completedAt) >= cutoff.getTime() &&
      Date.parse(item.completedAt) <= now.getTime()
  );

  const dayKeys = new Set(
    filtered.map(item => deviceLocalDayKey(item.completedAt)).filter(Boolean)
  );

  const mostRecent = filtered.length
    ? filtered.reduce((latest, current) =>
        Date.parse(current.completedAt) > Date.parse(latest.completedAt) ? current : latest
      )
    : null;

  let message = '';
  if (filtered.length === 0) {
    message = 'No recent practice. Start anytime—there\'s no "behind" here.';
  } else if (dayKeys.size === totalDays) {
    message = `Amazing—${totalDays} days in a row. Remember: rest is also practice.`;
  } else {
    message = `${dayKeys.size} days with practice in the last ${totalDays}. You're building something real.`;
  }

  return {
    habitId,
    completions: filtered,
    daysWithCompletions: dayKeys.size,
    totalDays,
    mostRecentCompletion: mostRecent,
    message,
  };
}

/**
 * Check if a habit has been completed today (device-local day)
 */
export function completedToday(
  completions: SoftHabitCompletion[],
  habitId: SoftHabitId,
  now = new Date()
): boolean {
  const todayKey = deviceLocalDayKey(now);
  return completions.some(
    c => c.habitId === habitId && deviceLocalDayKey(c.completedAt) === todayKey
  );
}

/**
 * Get summary for all enabled habits
 */
export function enabledHabitsSummary(
  completions: SoftHabitCompletion[],
  enabledHabits: SoftHabitId[],
  days = 7,
  now?: Date
): {
  habitId: SoftHabitId;
  name: string;
  daysWithCompletions: number;
  totalDays: number;
}[] {
  return enabledHabits.map(habitId => {
    const habit = availableSoftHabits.find(h => h.id === habitId);
    const pattern = habitPattern(completions, habitId, { days, now });
    return {
      habitId,
      name: habit?.name || habitId,
      daysWithCompletions: pattern.daysWithCompletions,
      totalDays: pattern.totalDays,
    };
  });
}

/**
 * Grace-based message for habit overview. NO red "you missed today" language.
 */
export function habitOverviewMessage(
  completions: SoftHabitCompletion[],
  enabledHabits: SoftHabitId[],
  now = new Date()
): string {
  if (enabledHabits.length === 0) {
    return 'Enable rituals in settings to track gentle daily practices.';
  }

  const todayCompletions = enabledHabits.filter(habitId =>
    completedToday(completions, habitId, now)
  );

  if (todayCompletions.length === 0) {
    return `${enabledHabits.length} rituals available. Check in when it feels right.`;
  }

  if (todayCompletions.length === enabledHabits.length) {
    return `All ${enabledHabits.length} rituals complete today. Well done.`;
  }

  return `${todayCompletions.length} of ${enabledHabits.length} rituals complete today. Nice work.`;
}
