/**
 * Phase C: Opt-in mind check-in module
 * 
 * Philosophy:
 * - Short, adult, anti-attention (not therapy, not diagnosis)
 * - Skip days are OK, no streak shame
 * - Supported coach tone, not clinical assessment
 * - Local storage only
 */

export type MindCheckLevel = 'calm' | 'okay' | 'stressed' | 'overwhelmed';

export type MindCheck = {
  level: MindCheckLevel;
  note?: string;
  recordedAt: string;
};

const MAX_NOTE_LENGTH = 300;
const RETENTION_DAYS = 180;

/**
 * Create a mind check-in entry
 */
export function createMindCheck(
  level: MindCheckLevel,
  note?: string,
  at = new Date()
): MindCheck {
  const trimmed = note?.trim() || '';
  return {
    level,
    note: trimmed.length > 0 && trimmed.length <= MAX_NOTE_LENGTH ? trimmed : undefined,
    recordedAt: at.toISOString(),
  };
}

/**
 * Get recent mind checks within the specified window
 */
export function recentMindChecks(
  checks: MindCheck[],
  options: { days?: number; now?: Date } = {}
): MindCheck[] {
  const { days = 7, now = new Date() } = options;
  const cutoff = now.getTime() - days * 86_400_000;
  const ceiling = now.getTime() + 5 * 60_000; // Allow slight future tolerance
  
  return checks.filter(check => {
    const timestamp = Date.parse(check.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= ceiling;
  });
}

/**
 * Check if there's a mind check-in for today
 */
export function hasMindCheckToday(checks: MindCheck[], now = new Date()): boolean {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86_400_000;
  
  return checks.some(check => {
    const timestamp = Date.parse(check.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= todayStart && timestamp < todayEnd;
  });
}

/**
 * Get a summary message for the mind check pattern
 */
export function mindCheckSummary(checks: MindCheck[], days = 7, now = new Date()): string {
  const recent = recentMindChecks(checks, { days, now });
  
  if (recent.length === 0) {
    return `No check-ins yet.`;
  }
  
  const counts: Record<MindCheckLevel, number> = {
    calm: 0,
    okay: 0,
    stressed: 0,
    overwhelmed: 0,
  };
  
  recent.forEach(check => counts[check.level]++);
  
  const calmDays = counts.calm;
  const overwhelmedDays = counts.overwhelmed;
  const totalDays = recent.length;
  
  if (overwhelmedDays > totalDays / 2) {
    return `${totalDays} check-ins · more overwhelmed days than calm — rest counts.`;
  }
  
  if (calmDays > totalDays / 2) {
    return `${totalDays} check-ins · mostly calm this week.`;
  }
  
  return `${totalDays} check-ins this week.`;
}

/**
 * Apply retention policy to mind checks
 */
export function applyMindCheckRetention(
  checks: MindCheck[],
  retentionDays = RETENTION_DAYS,
  now = new Date()
): MindCheck[] {
  const cutoff = now.getTime() - retentionDays * 86_400_000;
  
  return checks.filter(check => {
    const timestamp = Date.parse(check.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
}

/**
 * Validate a mind check entry
 */
export function validateMindCheck(value: unknown): value is MindCheck {
  if (typeof value !== 'object' || value === null) return false;
  const check = value as Partial<MindCheck>;
  
  if (typeof check.recordedAt !== 'string') return false;
  if (!['calm', 'okay', 'stressed', 'overwhelmed'].includes(check.level as string)) return false;
  if (check.note !== undefined && typeof check.note !== 'string') return false;
  
  const timestamp = Date.parse(check.recordedAt);
  if (!Number.isFinite(timestamp)) return false;
  
  return true;
}
