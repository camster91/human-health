import type { CapabilityDomain } from './whole-person-types';

export type { CapabilityDomain } from './whole-person-types';

export type CapabilityMetric = {
  id: string;
  domain: CapabilityDomain;
  name: string;
  unit: string;
  direction: 'higher' | 'lower' | 'range';
  description: string;
};

export type CardioModality = 'walk' | 'run' | 'cycle' | 'row' | 'incline-treadmill' | 'other';
export type ActivityKind = 'planned' | 'incidental';
export type ActivityDose = {
  domain: CapabilityDomain;
  minutes?: number;
  sets?: number;
  effort?: 'easy' | 'moderate' | 'hard';
  sessionId?: string;
  completedAt: string;
  kind?: ActivityKind;
  modality?: CardioModality;
  source?: 'manual' | 'workout' | 'device';
  /** 0–1 completion/quality fraction when a session was partial. */
  quality?: number;
};

export type WeeklyTarget = {
  domain: CapabilityDomain;
  minutes?: number;
  sessions?: number;
  note: string;
};

export const weeklyTargets: WeeklyTarget[] = [
  { domain: 'strength', sessions: 4, note: 'Upper/lower strength backbone; adapt frequency when recovery or life requires it.' },
  { domain: 'cardio', minutes: 150, note: 'Default moderate-equivalent target; user goals and clinical guidance can override.' },
  { domain: 'mobility', sessions: 3, note: 'Short targeted sessions around current movement needs.' },
  { domain: 'core', sessions: 2, note: 'Trunk training embedded in strength or short standalone work.' },
  { domain: 'bodyweight', sessions: 2, note: 'Relative-strength skills such as pull-ups, push-ups, dips and hangs.' },
  { domain: 'balance', sessions: 2, note: 'Small repeatable doses of balance and coordination.' },
  { domain: 'power', sessions: 1, note: 'Low-volume explosive work only when readiness and preferences allow.' },
  { domain: 'movement', sessions: 2, note: 'Carries, locomotion and practical work capacity.' },
];

export const capabilityMetrics: CapabilityMetric[] = [
  { id: 'strength-primary', domain: 'strength', name: 'Primary lift trend', unit: 'relative trend', direction: 'higher', description: 'Progress across selected compound lifts without combining unlike equipment loads.' },
  { id: 'cardio-duration', domain: 'cardio', name: 'Weekly aerobic minutes', unit: 'min/week', direction: 'higher', description: 'Planned moderate/vigorous-equivalent aerobic work.' },
  { id: 'pullups', domain: 'bodyweight', name: 'Strict pull-ups', unit: 'reps', direction: 'higher', description: 'Best controlled set or assisted progression.' },
  { id: 'dead-hang', domain: 'bodyweight', name: 'Dead hang', unit: 'seconds', direction: 'higher', description: 'Grip and shoulder-tolerance benchmark where appropriate.' },
  { id: 'plank-quality', domain: 'core', name: 'Core progression', unit: 'level', direction: 'higher', description: 'Progress through trunk-control variations rather than duration alone.' },
  { id: 'ankle-mobility', domain: 'mobility', name: 'Ankle mobility', unit: 'cm/quality', direction: 'higher', description: 'Repeatable ankle benchmark.' },
  { id: 'single-leg-balance', domain: 'balance', name: 'Single-leg balance', unit: 'seconds/level', direction: 'higher', description: 'Repeatable balance benchmark with explicit conditions.' },
  { id: 'jump', domain: 'power', name: 'Jump benchmark', unit: 'cm', direction: 'higher', description: 'Optional power benchmark; high-impact testing can be disabled.' },
  { id: 'carry', domain: 'movement', name: 'Loaded carry', unit: 'distance/load', direction: 'higher', description: 'Practical work-capacity benchmark.' },
  { id: 'readiness-pattern', domain: 'recovery', name: 'Readiness pattern', unit: 'check-ins/week', direction: 'range', description: 'Derived from optional sleep, fatigue, soreness, stress, illness, pain, and subjective-readiness check-ins.' },
  { id: 'training-consistency', domain: 'consistency', name: 'Training consistency', unit: 'sessions/28 days', direction: 'higher', description: 'Derived from qualifying completed or meaningfully partial strength sessions; abandoned and very incomplete sessions are excluded.' },
];
