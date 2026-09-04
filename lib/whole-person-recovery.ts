import { ActivityDose } from './whole-person-foundation';

export type ReadinessInput = {
  sleep?: 'poor' | 'okay' | 'good';
  sleepHours?: number;
  fatigue?: 'low' | 'moderate' | 'high';
  soreness?: 'low' | 'moderate' | 'high';
  stress?: 'low' | 'moderate' | 'high';
  subjective?: 1 | 2 | 3 | 4 | 5;
  illness?: boolean;
  pain?: boolean;
};
export type ReadinessDecision = { level: 'normal' | 'reduced' | 'recovery'; volumeMultiplier: number; allowProgression: boolean; reasons: string[] };
export type ReadinessRecord = { recordedAt: string; input: ReadinessInput; source?: 'manual' | 'connected-sleep'; sourceName?: string };
export type EffectiveReadinessDecision = ReadinessDecision & { checkInCount: number; latestRecordedAt: string | null; source: 'default' | 'check-in' };

export function readinessDecision(input: ReadinessInput): ReadinessDecision {
  const reasons: string[] = [];
  if (input.pain) reasons.push('Pain or unusual discomfort was reported.');
  if (input.illness) reasons.push('Illness was reported.');
  if (input.sleep === 'poor' || (typeof input.sleepHours === 'number' && input.sleepHours < 6)) reasons.push('Sleep was limited.');
  if (input.fatigue === 'high') reasons.push('Fatigue is high.');
  if (input.soreness === 'high') reasons.push('Soreness is high.');
  if (input.stress === 'high') reasons.push('Stress is high.');
  if (typeof input.subjective === 'number' && input.subjective <= 2) reasons.push('Subjective readiness is low.');
  if (input.pain || input.illness) return { level: 'recovery', volumeMultiplier: 0.5, allowProgression: false, reasons };
  const strain = [
    input.sleep === 'poor' || (typeof input.sleepHours === 'number' && input.sleepHours < 6),
    input.fatigue === 'high',
    input.soreness === 'high',
    input.stress === 'high',
    typeof input.subjective === 'number' && input.subjective <= 2,
  ].filter(Boolean).length;
  if (strain >= 2) return { level: 'reduced', volumeMultiplier: 0.7, allowProgression: false, reasons };
  if (strain === 1) return { level: 'reduced', volumeMultiplier: 0.85, allowProgression: false, reasons };
  return { level: 'normal', volumeMultiplier: 1, allowProgression: true, reasons };
}

function validReadinessRecords(records: ReadinessRecord[], now = new Date()) {
  return records
    .filter(record => {
      const timestamp = Date.parse(record.recordedAt);
      return Number.isFinite(timestamp) && timestamp <= now.getTime() + 5 * 60_000 && record.input && typeof record.input === 'object';
    })
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

/**
 * Uses only recent records for the current decision, then keeps progression conservative
 * when repeated constrained check-ins were recorded during the last week. Connected sleep
 * can contribute through the same record model, but a recent manual sleep entry remains the
 * authoritative override in storage.
 */
export function readinessDecisionFromRecords(records: ReadinessRecord[], now = new Date()): EffectiveReadinessDecision {
  const valid = validReadinessRecords(records, now);
  const recent = valid.filter(record => now.getTime() - Date.parse(record.recordedAt) <= 36 * 3_600_000);
  if (!recent.length) {
    return {
      ...readinessDecision({}),
      checkInCount: 0,
      latestRecordedAt: valid.at(-1)?.recordedAt || null,
      source: 'default',
      reasons: valid.length ? ['The latest readiness data is older than 36 hours, so normal readiness is not assumed from it.'] : [],
    };
  }

  const latest = recent.at(-1)!;
  const latestDecision = readinessDecision(latest.input);
  if (latestDecision.level !== 'normal') return { ...latestDecision, checkInCount: recent.length, latestRecordedAt: latest.recordedAt, source: 'check-in' };

  const cutoff = now.getTime() - 7 * 86_400_000;
  const weekly = valid.filter(record => Date.parse(record.recordedAt) >= cutoff);
  if (weekly.length < 3) return { ...latestDecision, checkInCount: weekly.length, latestRecordedAt: latest.recordedAt, source: 'check-in' };
  const constrained = weekly.filter(record => readinessDecision(record.input).level !== 'normal').length;
  if (constrained < Math.ceil(weekly.length / 2)) return { ...latestDecision, checkInCount: weekly.length, latestRecordedAt: latest.recordedAt, source: 'check-in' };
  return {
    level: 'reduced',
    volumeMultiplier: 0.85,
    allowProgression: false,
    reasons: ['Most readiness check-ins from the last seven days were constrained, so progression stays conservative even though the latest check-in is normal.'],
    checkInCount: weekly.length,
    latestRecordedAt: latest.recordedAt,
    source: 'check-in',
  };
}

export function readinessTrend(records: ReadinessRecord[], now = new Date()) {
  const cutoff = now.getTime() - 7 * 86_400_000;
  const recent = validReadinessRecords(records, now).filter(record => Date.parse(record.recordedAt) >= cutoff);
  if (!recent.length) return { normal: 0, reduced: 0, recovery: 0, message: 'No readiness trend yet.' };
  const counts = { normal: 0, reduced: 0, recovery: 0 };
  recent.forEach(record => counts[readinessDecision(record.input).level]++);
  const constrained = counts.reduced + counts.recovery;
  return { ...counts, message: constrained >= Math.ceil(recent.length / 2) ? 'Recovery constraints have been common this week. Keep progression conservative and prioritize consistency over catching up.' : 'Recovery has been mostly supportive of normal training this week.' };
}

export function cardioEquivalentMinutes(minutes: number, effort: 'easy' | 'moderate' | 'hard') {
  if (minutes <= 0) return 0;
  return effort === 'hard' ? minutes * 2 : effort === 'easy' ? minutes * 0.75 : minutes;
}
export function activityCountsTowardCardioTarget(dose: ActivityDose) {
  return dose.domain === 'cardio' && (dose.kind || 'planned') === 'planned';
}
export type CardioSessionType = 'recovery' | 'steady' | 'intervals' | 'finisher';
export type CardioOption = { type: CardioSessionType; name: string; minutes: number; effort: 'easy' | 'moderate' | 'hard'; description: string };
export function cardioOptions(equivalent: number, target = 150, readiness: 'normal' | 'reduced' | 'recovery' = 'normal', available = 30): CardioOption[] {
  const remaining = Math.max(0, target - equivalent);
  if (readiness === 'recovery') return [{ type: 'recovery', name: 'Recovery aerobic', minutes: Math.min(20, available), effort: 'easy', description: 'Easy conversational movement only.' }];
  const options: CardioOption[] = [
    { type: 'recovery', name: 'Easy aerobic', minutes: Math.min(25, available), effort: 'easy', description: 'Low-fatigue walking, cycling, rowing, or incline treadmill.' },
    { type: 'steady', name: 'Steady aerobic', minutes: Math.min(Math.max(10, Math.min(40, remaining || 30)), available), effort: 'moderate', description: 'Continuous work that builds weekly aerobic volume.' },
  ];
  if (available >= 8) options.push({ type: 'finisher', name: 'Short finisher', minutes: Math.min(12, available), effort: 'moderate', description: 'A short sustainable finish after strength work; it does not replace a full aerobic session.' });
  if (readiness === 'normal' && available >= 15) options.push({ type: 'intervals', name: 'Short intervals', minutes: Math.min(20, available), effort: 'hard', description: 'Brief harder efforts with generous recovery.' });
  return options;
}
export function cardioPrescription(equivalent: number, target = 150, available = 30) {
  const remaining = Math.max(0, target - equivalent);
  if (!remaining) return { minutes: 0, effort: 'easy' as const, message: 'Weekly aerobic target is covered. Optional easy cardio can be used for enjoyment or recovery.' };
  const minutes = Math.min(available, Math.max(10, Math.min(40, remaining)));
  return { minutes, effort: 'moderate' as const, message: `About ${Math.round(remaining)} equivalent planned minutes remain this week. ${minutes} moderate minutes is a useful next dose.` };
}
