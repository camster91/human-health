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
export type ReadinessRecord = { recordedAt: string; input: ReadinessInput };

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

export function readinessTrend(records: ReadinessRecord[], now = new Date()) {
  const cutoff = now.getTime() - 7 * 86_400_000;
  const recent = records.filter(record => new Date(record.recordedAt).getTime() >= cutoff);
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
