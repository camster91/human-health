import { AdaptContext, Exercise, GymProfile, HistoryEntry, WorkoutExercise } from './domain';
import { substitutions } from './program';

const priorityRank = { primary:0, secondary:1, accessory:2 } as const;

export function adaptWorkout(items: WorkoutExercise[], context: AdaptContext): {exercises:WorkoutExercise[];notes:string[]} {
  let exercises = items.map(e=>({...e,logs:[...e.logs]}));
  const notes:string[]=[];
  if(context.gym){
    exercises = exercises.map(item => {
      const unavailable = item.equipment.some(eq => !context.gym!.equipment.includes(eq) || context.unavailable?.includes(eq));
      if(!unavailable) return item;
      const swap = substitutions(item, context.gym!)[0];
      if(!swap){ notes.push(`${item.name} removed because compatible equipment is unavailable.`); return null; }
      notes.push(`${item.name} → ${swap.name} to preserve ${item.movement.replaceAll('-',' ')} work.`);
      return {...swap,sets:item.sets,logs:[],originalId:item.id};
    }).filter(Boolean) as WorkoutExercise[];
  }
  if(context.lowEnergy){
    exercises = exercises.map(e => e.priority==='accessory' ? {...e,sets:Math.max(1,e.sets-1)} : e);
    notes.push('Low-energy mode: accessory volume reduced; primary work preserved.');
  }
  if(context.minutes){
    const budget = Math.max(10,context.minutes);
    const sorted=[...exercises].sort((a,b)=>priorityRank[a.priority]-priorityRank[b.priority]);
    let used=0; const kept:WorkoutExercise[]=[];
    for(const e of sorted){
      const estimate=Math.max(5,e.sets*3);
      if(used+estimate<=budget || kept.length<2){ kept.push(e); used+=estimate; }
    }
    if(kept.length<exercises.length) notes.push(`${budget}-minute mode: lower-priority work was deferred before primary movements.`);
    exercises=kept;
  }
  return {exercises,notes};
}

export function nextLoadRecommendation(exercise: WorkoutExercise, previous?: WorkoutExercise){
  const logs=exercise.logs.filter(l=>!l.pain);
  if(exercise.logs.some(l=>l.pain)) return {action:'hold',message:'Pain or unusual discomfort was flagged. Stop progressing this exercise for now and reassess before continuing.'};
  if(!logs.length) return {action:'baseline',message:'Establish a comfortable baseline and leave 2–3 reps in reserve.'};
  const [,high]=exercise.repRange;
  const allTop=logs.length>=exercise.sets && logs.every(l=>l.reps>=high);
  const effortOk=logs.every(l=>(l.rir ?? 2)>=1);
  if(allTop && effortOk){
    const current=logs[0].weight;
    const increment=current>=60?2.5:1;
    return {action:'increase',message:`All working sets reached the top of the range with reserve. Try ${current+increment} kg next time.`};
  }
  if(previous){
    const currentReps=logs.reduce((s,l)=>s+l.reps,0);
    const priorReps=previous.logs.reduce((s,l)=>s+l.reps,0);
    if(currentReps>priorReps) return {action:'reps',message:`You added ${currentReps-priorReps} total rep${currentReps-priorReps===1?'':'s'}. Keep the load and build reps.`};
  }
  return {action:'hold',message:'Keep the load and aim to add a rep while maintaining form.'};
}

export function summarizeWorkout(exercises: WorkoutExercise[], history: HistoryEntry[]){
  const messages:string[]=[];
  let prs=0;
  for(const e of exercises){
    const prior=history.flatMap(h=>h.exercises).filter(x=>x.id===e.id);
    const bestPrior=Math.max(0,...prior.flatMap(x=>x.logs.map(l=>l.weight*l.reps)));
    const bestNow=Math.max(0,...e.logs.map(l=>l.weight*l.reps));
    if(bestNow>bestPrior && bestPrior>0){ prs++; messages.push(`${e.name}: new performance best.`); }
  }
  if(exercises.some(e=>e.logs.some(l=>l.pain))) messages.push('Discomfort was flagged during this session. Progression is paused for the affected exercise until it is reassessed.');
  if(!messages.length) messages.push('Session completed. Consistency is progress; use the next-session recommendations to continue building.');
  return {prs,messages};
}

export function platePlan(target:number, bar=20, plates=[25,20,15,10,5,2.5,1.25]){
  let perSide=(target-bar)/2;
  if(perSide<0) return null;
  const result:number[]=[];
  for(const p of plates){ while(perSide+1e-9>=p){ result.push(p); perSide-=p; } }
  return perSide<0.001 ? result : null;
}
