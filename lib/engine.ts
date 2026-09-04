import { AdaptContext, HistoryEntry, WorkoutExercise } from './domain';
import { substitutions } from './program';

const priorityRank = { primary: 0, secondary: 1, accessory: 2 } as const;

export function workingLogs(exercise: WorkoutExercise) {
  return exercise.logs.filter(log => !log.warmup);
}

export function comparableStrengthLogs(exercise: WorkoutExercise) {
  return workingLogs(exercise).filter(log => !log.pain && log.formQuality !== 'poor' && Number.isFinite(log.weight) && log.weight >= 0 && Number.isFinite(log.reps) && log.reps > 0);
}

export function applyVolumeMultiplier(items: WorkoutExercise[], multiplier: number, options: { preservePrimary?: boolean } = {}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(multiplier) ? multiplier : 1));
  if (clamped >= 1) return { exercises: items.map(item => ({ ...item, logs: [...item.logs] })), changed: false };
  if (clamped <= 0) return { exercises: [], changed: items.length > 0 };
  let changed = false;
  const exercises = items.map(item => {
    if (options.preservePrimary && item.priority === 'primary' && clamped > 0.6) return { ...item, logs: [...item.logs] };
    const sets = Math.max(1, Math.floor(item.sets * clamped));
    if (sets !== item.sets) changed = true;
    return { ...item, sets: Math.min(item.sets, sets), logs: [...item.logs] };
  });
  return { exercises, changed };
}

export function adaptWorkout(items: WorkoutExercise[], context: AdaptContext): { exercises: WorkoutExercise[]; notes: string[] } {
  let exercises = items.map(item => ({ ...item, logs: [...item.logs] }));
  const notes: string[] = [];
  const unavailable = context.unavailable || [];

  if (context.gym) {
    exercises = exercises.map(item => {
      const missing = item.equipment.some(equipment => !context.gym!.equipment.includes(equipment) || unavailable.includes(equipment));
      if (!missing) return item;
      const preferredId = context.preferredSubstitutions?.[item.originalId || item.id];
      const swap = substitutions(item, context.gym!, unavailable, preferredId)[0];
      if (!swap) {
        notes.push(`${item.name} was removed because no compatible ${item.movement.replaceAll('-', ' ')} option is available with the current equipment.`);
        return null;
      }
      notes.push(`${item.name} → ${swap.name} to preserve ${item.movement.replaceAll('-', ' ')} work. Load history stays separate.`);
      return { ...swap, sets: item.sets, logs: [], originalId: item.id };
    }).filter(Boolean) as WorkoutExercise[];
  }

  let multiplier = context.volumeMultiplier ?? 1;
  if (context.lowEnergy) multiplier = Math.min(multiplier, 0.8);
  if (context.mode === 'travel') multiplier = Math.min(multiplier, 0.85);
  if (context.mode === 'return') multiplier = Math.min(multiplier, 0.65);
  if (context.mode === 'maintenance') multiplier = Math.min(multiplier, 0.75);

  if (multiplier < 1) {
    const scaled = applyVolumeMultiplier(exercises, multiplier, { preservePrimary: context.mode !== 'return' });
    exercises = scaled.exercises;
    if (multiplier <= 0) notes.push('Automatic exercise suggestions are paused because the current safety context does not support an app-generated workout.');
    else {
      const label = context.mode === 'return' ? 'Return-to-training' : context.mode === 'maintenance' ? 'Maintenance' : context.mode === 'travel' ? 'Travel' : 'Recovery-aware';
      if (scaled.changed) notes.push(`${label} mode reduced volume while preserving the session’s main movement intent.`);
    }
  }

  if (context.minutes && exercises.length) {
    const budget = Math.max(10, context.minutes);
    const indexed = exercises.map((exercise, index) => ({ exercise, index }));
    const ranked = [...indexed].sort((a, b) => priorityRank[a.exercise.priority] - priorityRank[b.exercise.priority] || a.index - b.index);
    let used = 0;
    const kept = new Set<number>();
    for (const item of ranked) {
      const estimate = Math.max(5, item.exercise.sets * 3);
      if (used + estimate <= budget || kept.size < Math.min(2, ranked.length)) {
        kept.add(item.index);
        used += estimate;
      }
    }
    if (kept.size < exercises.length) notes.push(`${budget}-minute mode deferred lower-priority work before primary movements.`);
    exercises = indexed.filter(item => kept.has(item.index)).map(item => item.exercise);
  }

  if (!exercises.length && !notes.some(note => note.includes('Automatic exercise suggestions are paused'))) notes.push('No compatible exercise remained. Change the equipment profile or choose a different session instead of improvising an unrelated movement.');
  return { exercises, notes };
}

export type LoadRecommendation = { action: 'baseline' | 'increase' | 'reps' | 'hold' | 'reduce'; message: string };
export function nextLoadRecommendation(exercise: WorkoutExercise, previous?: WorkoutExercise, context: { daysSincePrevious?: number; progressionAllowed?: boolean } = {}): LoadRecommendation {
  if (context.progressionAllowed === false) return { action: 'hold', message: 'Progression is paused for this session. Keep the load conservative and use clean reps.' };
  if (typeof context.daysSincePrevious === 'number' && context.daysSincePrevious > 21) return { action: 'reduce', message: 'A longer training gap was detected. Re-establish a comfortable baseline before resuming progression.' };
  if (workingLogs(exercise).some(log => log.pain)) return { action: 'hold', message: 'Pain or unusual discomfort was flagged. Stop progressing this exercise for now and reassess before continuing.' };
  if (workingLogs(exercise).some(log => log.formQuality === 'poor')) return { action: 'hold', message: 'A working set was marked with poor form. Keep or reduce the load and restore consistent technique before progressing.' };

  const logs = comparableStrengthLogs(exercise);
  if (!logs.length) return { action: 'baseline', message: 'Establish a comfortable working-set baseline and leave 2–3 reps in reserve.' };

  const [, high] = exercise.repRange;
  const sameWorkingLoad = new Set(logs.map(log => log.weight)).size === 1;
  const allTop = logs.length >= exercise.sets && logs.every(log => log.reps >= high);
  const effortOk = logs.every(log => (log.rir ?? 2) >= 1);
  if (sameWorkingLoad && allTop && effortOk) {
    const current = logs[0].weight;
    if (exercise.metadata?.loadType === 'bodyweight' && current <= 0) {
      return { action: 'increase', message: 'All working sets reached the top of the range with reserve. Progress to the next controlled variation or add a small external load rather than inventing a machine-equivalent weight.' };
    }
    const increment = current >= 60 ? 2.5 : 1;
    return { action: 'increase', message: `All working sets reached the top of the range with reserve and acceptable form. Try ${current + increment} kg next time.` };
  }

  if (previous) {
    const priorLogs = comparableStrengthLogs(previous);
    const sameLoadAsPrevious = logs.length > 0 && priorLogs.length > 0 && logs[0].weight === priorLogs[0].weight;
    if (sameLoadAsPrevious) {
      const currentReps = logs.reduce((sum, log) => sum + log.reps, 0);
      const priorReps = priorLogs.reduce((sum, log) => sum + log.reps, 0);
      if (currentReps > priorReps) return { action: 'reps', message: `You added ${currentReps - priorReps} total rep${currentReps - priorReps === 1 ? '' : 's'} at the same load. Keep the load and build reps.` };
    }
    if (logs.length >= exercise.sets && logs.every(log => log.reps < exercise.repRange[0])) return { action: 'reduce', message: 'Every working set missed the bottom of the target range. Reduce the load slightly and rebuild clean reps.' };
  }
  return { action: 'hold', message: 'Keep the load and aim to add a rep while maintaining form.' };
}

function performanceScore(exercise: WorkoutExercise, weight: number, reps: number) {
  if (exercise.metadata?.loadType === 'bodyweight' && weight <= 0) return reps;
  return weight * Math.max(1, reps);
}

export function summarizeWorkout(exercises: WorkoutExercise[], history: HistoryEntry[]) {
  const messages: string[] = [];
  let prs = 0;
  for (const exercise of exercises) {
    const prior = history.filter(entry => (entry.status || 'completed') !== 'abandoned').flatMap(entry => entry.exercises).filter(item => item.id === exercise.id);
    const bestPrior = Math.max(0, ...prior.flatMap(item => comparableStrengthLogs(item).map(log => performanceScore(item, log.weight, log.reps))));
    const bestNow = Math.max(0, ...comparableStrengthLogs(exercise).map(log => performanceScore(exercise, log.weight, log.reps)));
    if (bestNow > bestPrior && bestPrior > 0) {
      prs++;
      messages.push(`${exercise.name}: new performance best.`);
    }
  }
  if (exercises.some(exercise => exercise.logs.some(log => log.pain))) messages.push('Discomfort was flagged during this session. Progression is paused for the affected exercise until it is reassessed.');
  if (exercises.some(exercise => workingLogs(exercise).some(log => log.formQuality === 'poor'))) messages.push('A working set was marked with poor form. Keep the next exposure conservative and prioritize technique over load.');
  if (!messages.length) messages.push('Session recorded. Consistency is progress; use the next-session recommendations to continue building.');
  return { prs, messages };
}

/**
 * Returns an exact per-side plate combination using the configured plate denominations.
 * Denominations can be reused; physical pair quantities are intentionally not modelled in Phase 2.
 */
export function platePlan(target: number, bar = 20, plates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  if (!Number.isFinite(target) || !Number.isFinite(bar)) return null;
  const perSide = (target - bar) / 2;
  if (perSide < 0) return null;
  const scale = 100;
  const targetUnits = Math.round(perSide * scale);
  if (Math.abs(targetUnits / scale - perSide) > 0.0001) return null;
  if (targetUnits === 0) return [];
  const usable = [...new Set(plates.filter(plate => Number.isFinite(plate) && plate > 0).map(plate => Math.round(plate * scale)))]
    .filter(plate => plate > 0)
    .sort((a, b) => b - a);
  if (!usable.length || targetUnits > 100_000) return null;

  const best: (number[] | null)[] = Array.from({ length: targetUnits + 1 }, () => null);
  best[0] = [];
  for (let amount = 1; amount <= targetUnits; amount++) {
    for (const plate of usable) {
      if (plate > amount || !best[amount - plate]) continue;
      const candidate = [...best[amount - plate]!, plate];
      if (!best[amount] || candidate.length < best[amount]!.length) best[amount] = candidate;
    }
  }
  return best[targetUnits]?.map(plate => plate / scale).sort((a, b) => b - a) || null;
}
