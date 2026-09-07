/**
 * Phase C: Weekly reflection module
 * 
 * Philosophy:
 * - Sparse, one prompt, skip always OK
 * - Adult supported coach voice
 * - No streak shame, no mandatory cadence
 * - Progressive disclosure on Today/Lift
 * - Local storage only
 */

export type WeeklyReflection = {
  prompt: string;
  response?: string;
  recordedAt: string;
};

const MAX_RESPONSE_LENGTH = 500;
const RETENTION_DAYS = 365;

const REFLECTION_PROMPTS = [
  "What training moment felt most satisfying this week?",
  "What would you keep the same next week?",
  "What's one thing you learned about your recovery this week?",
  "What workout surprised you (in a good way or challenging way)?",
  "What non-training win are you carrying into next week?",
  "What's working well with your current routine?",
  "What adjustment would you try next week if you could?",
  "What made you feel strongest this week?",
];

/**
 * Get a reflection prompt for this week
 * Uses ISO week number (Monday is start of week) as a deterministic seed
 */
export function getWeeklyPrompt(now = new Date()): string {
  // Calculate ISO week number (Monday = start of week)
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = target.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0 offset
  const monday = new Date(target.getTime() - diff * 86_400_000);
  
  // Get week number from start of year
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((monday.getTime() - startOfYear.getTime()) / 86_400_000);
  const weekNumber = Math.floor(daysSinceStart / 7);
  
  const promptIndex = weekNumber % REFLECTION_PROMPTS.length;
  return REFLECTION_PROMPTS[promptIndex];
}

/**
 * Create a weekly reflection entry
 */
export function createWeeklyReflection(
  response?: string,
  at = new Date()
): WeeklyReflection {
  const prompt = getWeeklyPrompt(at);
  const trimmed = response?.trim() || '';
  
  return {
    prompt,
    response: trimmed.length > 0 && trimmed.length <= MAX_RESPONSE_LENGTH ? trimmed : undefined,
    recordedAt: at.toISOString(),
  };
}

/**
 * Get the start of the current week (Monday at midnight)
 */
function getWeekStart(now: Date): number {
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return weekStart.getTime();
}

/**
 * Check if there's a reflection for the current week
 */
export function hasReflectionThisWeek(reflections: WeeklyReflection[], now = new Date()): boolean {
  const weekStart = getWeekStart(now);
  const weekEnd = weekStart + 7 * 86_400_000;
  
  return reflections.some(reflection => {
    const timestamp = Date.parse(reflection.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= weekStart && timestamp < weekEnd;
  });
}

/**
 * Get recent reflections within the specified number of weeks
 */
export function recentReflections(
  reflections: WeeklyReflection[],
  options: { weeks?: number; now?: Date } = {}
): WeeklyReflection[] {
  const { weeks = 4, now = new Date() } = options;
  const cutoff = now.getTime() - weeks * 7 * 86_400_000;
  const ceiling = now.getTime() + 5 * 60_000; // Allow slight future tolerance
  
  return reflections.filter(reflection => {
    const timestamp = Date.parse(reflection.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= ceiling;
  });
}

/**
 * Get a summary message for reflection patterns
 */
export function reflectionSummary(reflections: WeeklyReflection[], weeks = 4): string {
  const recent = recentReflections(reflections, { weeks });
  
  if (recent.length === 0) {
    return `No reflections yet.`;
  }
  
  const withResponse = recent.filter(r => r.response && r.response.length > 0).length;
  const skipped = recent.length - withResponse;
  
  if (withResponse === 0) {
    return `${recent.length} prompt${recent.length === 1 ? '' : 's'} viewed, none completed.`;
  }
  
  if (withResponse === recent.length) {
    return `${withResponse} reflection${withResponse === 1 ? '' : 's'} in ${weeks} weeks.`;
  }
  
  return `${withResponse} reflection${withResponse === 1 ? '' : 's'}, ${skipped} skipped.`;
}

/**
 * Apply retention policy to reflections
 */
export function applyReflectionRetention(
  reflections: WeeklyReflection[],
  retentionDays = RETENTION_DAYS,
  now = new Date()
): WeeklyReflection[] {
  const cutoff = now.getTime() - retentionDays * 86_400_000;
  
  return reflections.filter(reflection => {
    const timestamp = Date.parse(reflection.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
}

/**
 * Validate a weekly reflection entry
 */
export function validateWeeklyReflection(value: unknown): value is WeeklyReflection {
  if (typeof value !== 'object' || value === null) return false;
  const reflection = value as Partial<WeeklyReflection>;
  
  if (typeof reflection.prompt !== 'string' || reflection.prompt.length === 0) return false;
  if (typeof reflection.recordedAt !== 'string') return false;
  if (reflection.response !== undefined && typeof reflection.response !== 'string') return false;
  
  const timestamp = Date.parse(reflection.recordedAt);
  if (!Number.isFinite(timestamp)) return false;
  
  return true;
}
