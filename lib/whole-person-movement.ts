import { Equipment, SessionId } from './domain';
import type { CapabilityDomain } from './whole-person-types';

export type CorePattern = 'anti-extension' | 'anti-rotation' | 'lateral-stability' | 'flexion-hip-flexion' | 'carry';
export type CoreSession = { id: string; pattern: CorePattern; name: string; equipment: Equipment[]; minutes: number; items: string[]; fatigue: 'low' | 'moderate' };
export const coreSessions: CoreSession[] = [
  { id: 'core-anti-extension', pattern: 'anti-extension', name: 'Anti-extension control', equipment: ['bodyweight'], minutes: 6, fatigue: 'low', items: ['Dead bug 3 × 6–10/side', 'Plank or rollout progression 3 sets'] },
  { id: 'core-anti-rotation', pattern: 'anti-rotation', name: 'Anti-rotation control', equipment: ['cable'], minutes: 6, fatigue: 'low', items: ['Pallof press 3 × 8–12/side', 'Tall-kneeling cable hold 2 × 20 sec/side'] },
  { id: 'core-lateral', pattern: 'lateral-stability', name: 'Lateral stability', equipment: ['bodyweight'], minutes: 6, fatigue: 'low', items: ['Side plank 3 × 20–40 sec/side', 'Supported Copenhagen plank 2 × 10–20 sec/side'] },
  { id: 'core-flexion', pattern: 'flexion-hip-flexion', name: 'Controlled trunk/hip flexion', equipment: ['bodyweight'], minutes: 7, fatigue: 'moderate', items: ['Reverse crunch 3 × 8–15', 'Hanging or lying knee raise 3 × 6–12'] },
  { id: 'core-carry', pattern: 'carry', name: 'Loaded carry', equipment: ['dumbbell'], minutes: 8, fatigue: 'moderate', items: ['Suitcase carry 3 × 30–45 sec/side', 'Farmer carry 3 × 30–45 sec'] },
];

export function corePrescription(options: { session?: SessionId; equipment: Equipment[]; readiness: 'normal' | 'reduced' | 'recovery'; recentLowerBody?: boolean }): CoreSession[] {
  const available = coreSessions.filter(item => item.equipment.every(equipment => options.equipment.includes(equipment)));
  if (options.readiness === 'recovery') return [];
  const avoidHipFlexion = options.recentLowerBody || options.session?.startsWith('lower');
  const preferred: CorePattern[] = options.session?.startsWith('upper')
    ? ['anti-extension', 'lateral-stability', 'carry', 'anti-rotation', 'flexion-hip-flexion']
    : ['anti-rotation', 'lateral-stability', 'anti-extension', 'carry', 'flexion-hip-flexion'];
  return available
    .filter(item => !(avoidHipFlexion && item.pattern === 'flexion-hip-flexion'))
    .sort((a, b) => preferred.indexOf(a.pattern) - preferred.indexOf(b.pattern))
    .slice(0, options.readiness === 'reduced' ? 1 : 2);
}

export type MobilityKind = 'prepare' | 'restore';
export type MobilityPrescription = { id: string; kind: MobilityKind; name: string; areas: string[]; minutes: number; items: string[]; reason: string };
export function mobilityPrescription(session: SessionId, kind: MobilityKind, availableMinutes = kind === 'prepare' ? 5 : 10): MobilityPrescription {
  const lower = session.startsWith('lower');
  const minutes = Math.max(kind === 'prepare' ? 4 : 8, Math.min(kind === 'prepare' ? 8 : 15, availableMinutes));
  if (lower && kind === 'prepare') return { id: 'lower-prepare', kind, name: 'Lower-body preparation', areas: ['ankles', 'hips'], minutes, items: ['Ankle rocks', '90/90 hip switches', 'Controlled bodyweight squat'], reason: 'Prepare the ranges used by the next lower-body session without fatiguing them.' };
  if (!lower && kind === 'prepare') return { id: 'upper-prepare', kind, name: 'Upper-body preparation', areas: ['shoulders', 'thoracic spine'], minutes, items: ['Wall slides', 'Thoracic rotation', 'Scapular push-up or pull'], reason: 'Prepare shoulder and thoracic motion for pressing and pulling.' };
  if (lower) return { id: 'lower-restore', kind, name: 'Hip + ankle mobility', areas: ['ankles', 'hips'], minutes, items: ['Ankle mobility 2 × 10/side', '90/90 transitions 2 × 8', 'Hip-flexor stretch 2 × 30 sec/side'], reason: 'Longer mobility work develops comfortable range; it is not a diagnosis of restriction.' };
  return { id: 'upper-restore', kind, name: 'Shoulder + thoracic mobility', areas: ['shoulders', 'thoracic spine'], minutes, items: ['Wall slide 2 × 8', 'Open-book rotation 2 × 8/side', 'Controlled shoulder rotation 2 × 5/side'], reason: 'Longer mobility work develops controllable range without forcing end positions.' };
}

export type MicroSession = { id: string; domain: CapabilityDomain; name: string; minutes: number; items: string[]; requiredEquipment?: Equipment[] };
export const microSessions: MicroSession[] = [
  { id: 'strength-bodyweight-10', domain: 'strength', name: 'Minimum strength dose', minutes: 10, items: ['Choose one push or pull and one squat or hinge pattern', 'Complete 2 controlled working sets each'], requiredEquipment: ['bodyweight'] },
  { id: 'core-8', domain: 'core', name: 'Core control', minutes: 8, items: ['Dead bug', 'Side plank', 'Pallof press or reverse crunch'], requiredEquipment: ['bodyweight'] },
  { id: 'mobility-hips-8', domain: 'mobility', name: 'Hip + ankle mobility', minutes: 8, items: ['Ankle rocks', '90/90 hip switches', 'Hip-flexor mobility'], requiredEquipment: ['bodyweight'] },
  { id: 'mobility-upper-8', domain: 'mobility', name: 'Shoulder + thoracic mobility', minutes: 8, items: ['Wall slide', 'Thoracic rotation', 'Controlled shoulder circles'], requiredEquipment: ['bodyweight'] },
  { id: 'cardio-10', domain: 'cardio', name: 'Short aerobic dose', minutes: 10, items: ['Brisk walk, cycle, row, or incline treadmill at a sustainable effort'] },
  { id: 'cardio-20', domain: 'cardio', name: 'Easy aerobic session', minutes: 20, items: ['Brisk walk, cycle, row, or incline treadmill at conversational effort'] },
  { id: 'bodyweight-10', domain: 'bodyweight', name: 'Bodyweight skill practice', minutes: 10, items: ['Current pull/chin progression if equipment allows', 'Current push/dip progression', 'Optional hang'], requiredEquipment: ['bodyweight'] },
  { id: 'balance-8', domain: 'balance', name: 'Balance + coordination', minutes: 8, items: ['Single-leg balance', 'Heel-to-toe walk', 'Controlled step-down'], requiredEquipment: ['bodyweight'] },
  { id: 'power-10', domain: 'power', name: 'Low-volume power primer', minutes: 10, items: ['Low-volume jump or fast concentric drill', 'Full recovery between efforts'], requiredEquipment: ['bodyweight'] },
  { id: 'movement-10', domain: 'movement', name: 'Carry + locomotion', minutes: 10, items: ['Carry if an appropriate load is available', 'Backward walk or controlled march'], requiredEquipment: ['bodyweight'] },
];

export type ProgressionLevel = { id: string; name: string; items: string[]; target: string };
export type ProgressionTrack = { id: string; domain: 'core' | 'mobility'; name: string; levels: ProgressionLevel[] };
export const progressionTracks: ProgressionTrack[] = [
  { id: 'core-control', domain: 'core', name: 'Core control', levels: [
    { id: 'base', name: 'Base control', items: ['Dead bug 3 × 6/side', 'Side plank 3 × 20–30 sec/side', 'Pallof press 3 × 8/side', 'Reverse crunch 2 × 8–12'], target: 'Complete with steady breathing and no loss of trunk position.' },
    { id: 'intermediate', name: 'Anti-movement strength', items: ['Dead bug 3 × 10/side', 'Long-lever side plank 3 × 20 sec/side', 'Tall-kneeling Pallof press 3 × 10/side', 'Hanging knee raise 3 × 6–10'], target: 'Repeat cleanly for two sessions before advancing.' },
    { id: 'advanced', name: 'Loaded control', items: ['Ab-wheel or long-lever rollout 3 × 6–10', 'Suitcase carry 3 × 30–45 sec/side', 'Cable anti-rotation 3 × 10/side', 'Controlled hanging leg raise 3 × 6–10'], target: 'Progress difficulty only while control remains consistent.' },
  ] },
  { id: 'lower-mobility', domain: 'mobility', name: 'Hip + ankle mobility', levels: [
    { id: 'base', name: 'Restore range', items: ['Ankle rocks 2 × 10/side', '90/90 hip switches 2 × 8', 'Hip-flexor mobility 2 × 30 sec/side'], target: 'Move through a comfortable, repeatable range.' },
    { id: 'control', name: 'Control the range', items: ['Knee-over-toe ankle pulses 2 × 10', '90/90 lift-offs 2 × 6/side', 'Supported Cossack squat 2 × 6/side'], target: 'Own the available range without forcing end positions.' },
    { id: 'integrate', name: 'Integrate range', items: ['Deep squat hold 2 × 30 sec', 'Cossack squat 2 × 8/side', 'Split-squat mobility 2 × 8/side'], target: 'Use mobility in loaded or athletic movement without pain.' },
  ] },
  { id: 'upper-mobility', domain: 'mobility', name: 'Shoulder + thoracic mobility', levels: [
    { id: 'base', name: 'Restore motion', items: ['Wall slide 2 × 8', 'Thoracic rotation 2 × 8/side', 'Controlled shoulder circles 2 × 5/side'], target: 'Smooth motion without forcing range.' },
    { id: 'control', name: 'Control overhead range', items: ['Wall slide lift-off 2 × 6', 'Open-book rotation 2 × 8/side', 'Light cable external rotation 2 × 12'], target: 'Repeat overhead motion without compensating through the low back.' },
  ] },
];
