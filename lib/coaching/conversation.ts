import type { Equipment, GymProfile } from '../domain';
import type { CapabilityDomain } from '../whole-person';
import type { ConversationInterpretation } from './types';

const equipmentTerms: [RegExp, Equipment][] = [
  [/\b(no|without)\s+(a\s+)?rack\b/i, 'rack'],
  [/\b(no|without)\s+(a\s+)?bench\b/i, 'bench'],
  [/\b(no|without)\s+(a\s+)?cable(s)?\b/i, 'cable'],
  [/\b(no|without)\s+(a\s+)?barbell\b/i, 'barbell'],
  [/\b(no|without)\s+dumbbells?\b/i, 'dumbbell'],
  [/\b(no|without)\s+(a\s+)?machine(s)?\b/i, 'machine'],
  [/\b(no|without)\s+(a\s+)?pull[- ]?up\s*bar\b/i, 'pullup-bar'],
];

const goalTerms: [RegExp, CapabilityDomain][] = [
  [/\b(strength|stronger|lift)\b/i, 'strength'],
  [/\b(cardio|aerobic|run|running|conditioning)\b/i, 'cardio'],
  [/\b(mobility|flexibility|stiff)\b/i, 'mobility'],
  [/\b(core|abs|trunk)\b/i, 'core'],
  [/\b(pull[- ]?up|push[- ]?up|dip|bodyweight)\b/i, 'bodyweight'],
  [/\b(balance|coordination)\b/i, 'balance'],
  [/\b(power|jump|explosive)\b/i, 'power'],
  [/\b(recovery|recover|rest)\b/i, 'recovery'],
  [/\b(consistency|habit|routine)\b/i, 'consistency'],
];

function pickGym(text: string, gyms: GymProfile[]) {
  if (/\b(hotel|travel|away)\b/i.test(text)) return gyms.find(gym => gym.id === 'hotel');
  if (/\b(home|at home)\b/i.test(text)) return gyms.find(gym => gym.id === 'home');
  if (/\b(commercial|full gym|big gym)\b/i.test(text)) return gyms.find(gym => gym.id === 'commercial');
  if (/\b(work gym|office gym)\b/i.test(text)) return gyms.find(gym => gym.id === 'work');
  return undefined;
}

export function interpretCoachMessage(text: string, gyms: GymProfile[]): ConversationInterpretation {
  const original = text.trim();
  const recognized: string[] = [];
  const safetyFlags: string[] = [];
  const goalHints: CapabilityDomain[] = [];
  const adaptContext: ConversationInterpretation['adaptContext'] = {};

  const minutes = original.match(/\b(\d{1,3})\s*(?:min|mins|minute|minutes)\b/i);
  if (minutes) {
    const value = Math.max(10, Math.min(180, Number(minutes[1])));
    adaptContext.minutes = value;
    recognized.push(`${value} minutes available`);
  }
  if (/\b(tired|low energy|exhausted|drained|rough day)\b/i.test(original)) {
    adaptContext.lowEnergy = true;
    adaptContext.volumeMultiplier = 0.8;
    recognized.push('low-energy context');
  }
  if (/\b(returning|back after|coming back|long break)\b/i.test(original)) {
    adaptContext.mode = 'return';
    recognized.push('return-to-training mode');
  } else if (/\b(hotel|travel|travelling|traveling|away)\b/i.test(original)) {
    adaptContext.mode = 'travel';
    recognized.push('travel mode');
  } else if (/\b(maintenance|maintain only|busy season)\b/i.test(original)) {
    adaptContext.mode = 'maintenance';
    recognized.push('maintenance mode');
  }

  const gym = pickGym(original, gyms);
  if (gym) {
    adaptContext.gym = gym;
    recognized.push(`${gym.name} equipment profile`);
  }

  const unavailable = equipmentTerms.filter(([pattern]) => pattern.test(original)).map(([, equipment]) => equipment);
  if (unavailable.length) {
    adaptContext.unavailable = [...new Set(unavailable)];
    recognized.push(`unavailable: ${adaptContext.unavailable.join(', ')}`);
  }

  for (const [pattern, domain] of goalTerms) {
    if (pattern.test(original) && !goalHints.includes(domain)) goalHints.push(domain);
  }
  if (goalHints.length) recognized.push(`goal hints: ${goalHints.join(', ')}`);

  if (/\b(pain|injury|injured|chest pain|dizzy|faint|hypogly|low blood sugar|high blood sugar|sick|ill|fever)\b/i.test(original)) {
    safetyFlags.push('Health/symptom language was detected. The coach will not diagnose it or provide medication, insulin, carbohydrate-treatment, injury-clearance, or emergency advice. Use your established care/safety plan and appropriate medical support.');
  }
  if (/\b(insulin|dose|bolus|correction|carbs? to treat|medication)\b/i.test(original)) {
    safetyFlags.push('Medication/insulin/treatment-dose requests are outside the coaching layer.');
  }

  const summaryParts = [
    adaptContext.minutes ? `${adaptContext.minutes}-minute` : '',
    adaptContext.lowEnergy ? 'low-energy' : '',
    adaptContext.mode ? `${adaptContext.mode} mode` : '',
    gym ? `at ${gym.name}` : '',
  ].filter(Boolean);
  const summary = recognized.length
    ? `Interpreted as ${summaryParts.join(', ') || recognized.join('; ')}. This is a reversible planning suggestion; no workout history or preferences were changed.`
    : 'No structured training context was recognized. Add a time limit, energy level, gym/equipment constraint, life mode, or goal for a more specific plan.';

  return { original, recognized, unrecognized: [], adaptContext, mode: adaptContext.mode, goalHints, safetyFlags, summary };
}
