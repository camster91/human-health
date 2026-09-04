import type {WorkoutExercise} from './domain';

export type TrainingRecommendation={action:'baseline'|'increase'|'reps'|'hold';message:string};

export function nextTrainingRecommendation(exercise:WorkoutExercise,previous?:WorkoutExercise):TrainingRecommendation{
  const working=exercise.logs.filter(log=>!log.warmup);
  if(working.some(log=>log.pain))return {action:'hold',message:'Pain or unusual discomfort was flagged. Stop progressing this exercise and reassess before continuing.'};
  if(working.some(log=>(log.formRating??5)<=2))return {action:'hold',message:'Form quality was rated low. Keep or reduce the load and rebuild clean repetitions before progressing.'};
  const valid=working.filter(log=>!log.pain);
  if(!valid.length)return {action:'baseline',message:'Establish a comfortable working-set baseline and leave 2–3 reps in reserve.'};
  const [,high]=exercise.repRange;
  const allTop=valid.length>=exercise.sets&&valid.every(log=>log.reps>=high);
  const effortOkay=valid.every(log=>(log.rir??2)>=1);
  const formOkay=valid.every(log=>(log.formRating??4)>=3);
  if(allTop&&effortOkay&&formOkay){
    const current=valid[0].weight;
    const increment=current>=60?2.5:1;
    return {action:'increase',message:`All working sets reached the top of the range with reserve and acceptable form. Try ${current+increment} kg next time.`};
  }
  if(previous){
    const prior=previous.logs.filter(log=>!log.warmup&&!log.pain);
    const currentReps=valid.reduce((sum,log)=>sum+log.reps,0);
    const priorReps=prior.reduce((sum,log)=>sum+log.reps,0);
    if(currentReps>priorReps)return {action:'reps',message:`You added ${currentReps-priorReps} working rep${currentReps-priorReps===1?'':'s'}. Keep the load and continue building clean reps.`};
  }
  return {action:'hold',message:'Keep the load and aim to add a clean working rep while maintaining form and reserve.'};
}
