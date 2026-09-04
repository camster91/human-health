import { AdaptContext, HistoryEntry, WorkoutExercise } from './domain';
import { substitutions } from './program';

const priorityRank = { primary: 0, secondary: 1, accessory: 2 } as const;

export function workingLogs(exercise: WorkoutExercise) {
  return exercise.logs.filter(log => !log.warmup);
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
    exercises = exercises.map(item => {
      const preservePrimary = item.priority === 'primary' && context.mode !== 'return' && multiplier > 0.6;
      if (preservePrimary) return item;
      const reduced = Math.max(1, Math.floor(item.sets * multiplier));
      return { ...item, sets: Math.min(item.sets, reduced) };
    });
    const label = context.mode === 'return' ? 'Return-to-training' : context.mode === 'maintenance' ? 'Maintenance' : context.mode === 'travel' ? 'Travel' : 'Recovery-aware';
    notes.push(`${label} mode reduced volume while preserving the session’s main movement intent.`);
  }

  if (context.minutes) {
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

  if (!exercises.length) notes.push('No compatible exercise remained. Change the equipment profile or choose a different session instead of improvising an unrelated movement.');
  return { exercises, notes };
}

export type LoadRecommendation = { action: 'baseline' | 'increase' | 'reps' | 'hold' | 'reduce'; message: string };
export function nextLoadRecommendation(exercise: WorkoutExercise, previous?: WorkoutExercise, context: { daysSincePrevious?: number; progressionAllowed?: boolean } = {}): LoadRecommendation {
  if (context.progressionAllowed === false) return { action: 'hold', message: 'Progression is paused for this session. Keep the load conservative and use clean reps.' };
  if (typeof context.daysSincePrevious === 'number' && context.daysSincePrevious > 21) return { action: 'reduce', message: 'A longer training gap was detected. Re-establish a comfortable baseline before resuming progression.' };
  if (exercise.logs.some(log => log.pain)) return { action: 'hold', message: 'Pain or unusual discomfort was flagged. Stop progressing this exercise for now and reassess before continuing.' };

  const logs = workingLogs(exercise).filter(log => !log.pain);
  if (!logs.length) return { action: 'baseline', message: 'Establish a comfortable working-set baseline and leave 2–3 reps in reserve.' };
  if (logs.some(log => log.formQuality === 'poor')) return { action: 'hold', message: 'A working set was marked with poor form. Keep or reduce the load and restore consistent technique before progressing.' };

  const [, high] = exercise.repRange;
  const sameWorkingLoad = new Set(logs.map(log => log.weight)).size === 1;
  const allTop = logs.length >= exercise.sets && logs.every(log => log.reps >= high);
  const effortOk = logs.every(log => (log.rir ?? 2) >= 1);
  if (sameWorkingLoad && allTop && effortOk) {
    const current = logs[0].weight;
    const increment = current >= 60 ? 2.5 : 1;
    return { action: 'increase', message: `All working sets reached the top of the range with reserve and acceptable form. Try ${current + increment} kg next time.` };
  }

  if (previous) {
    const priorLogs = workingLogs(previous).filter(log => !log.pain);
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
    const bestPrior = Math.max(0, ...prior.flatMap(item => workingLogs(item).filter(log => !log.pain).map(log => performanceScore(item, log.weight, log.reps))));
    const bestNow = Math.max(0, ...workingLogs(exercise).filter(log => !log.pain).map(log => performanceScore(exercise, log.weight, log.reps)));
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

export function platePlan(target: number, bar = 20, plates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  if (!Number.isFinite(target) || !Number.isFinite(bar)) return null;
  let perSide = (target - bar) / 2;
  if (perSide < 0) return null;
  const usable = [...new Set(plates.filter(plate => Number.isFinite(plate) && plate > 0))].sort((a, b) => b - a);
  const result: number[] = [];
  for (const plate of usable) {
    while (perSide + 1e-9 >= plate) {
      result.push(plate);
      perSide -= plate;
    }
  }
  return perSide < 0.001 ? result : null;
}
