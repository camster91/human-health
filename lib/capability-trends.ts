import { HistoryEntry } from './domain';
import { ActivityDose, Assessment, cardioEquivalentMinutes } from './whole-person';

export type ExerciseStrengthTrend={exerciseId:string;first:number;latest:number;percentChange:number;samples:number};

function estimatedOneRepMax(weight:number,reps:number){
  if(weight<=0||reps<=0)return 0;
  return weight*(1+reps/30);
}

export function strengthTrends(history:HistoryEntry[]):ExerciseStrengthTrend[]{
  const byExercise=new Map<string,{date:number;value:number}[]>();
  history.forEach(entry=>entry.exercises.filter(e=>e.priority==='primary').forEach(exercise=>{
    const best=exercise.logs.reduce((max,set)=>Math.max(max,estimatedOneRepMax(set.weight,set.reps)),0);
    if(!best)return;
    const current=byExercise.get(exercise.id)||[];
    current.push({date:new Date(entry.completedAt).getTime(),value:best});
    byExercise.set(exercise.id,current);
  }));
  return [...byExercise.entries()].flatMap(([exerciseId,values])=>{
    const sorted=values.sort((a,b)=>a.date-b.date);
    if(sorted.length<2||sorted[0].value<=0)return [];
    const first=sorted[0].value;
    const latest=sorted[sorted.length-1].value;
    return [{exerciseId,first,latest,percentChange:(latest-first)/first*100,samples:sorted.length}];
  });
}

export function normalizedStrengthTrend(history:HistoryEntry[]){
  const trends=strengthTrends(history);
  if(!trends.length)return {percentChange:null as number|null,exerciseCount:0,message:'More repeated primary-lift data is needed before a strength trend can be calculated.'};
  const ordered=trends.map(t=>t.percentChange).sort((a,b)=>a-b);
  const mid=Math.floor(ordered.length/2);
  const median=ordered.length%2?ordered[mid]:(ordered[mid-1]+ordered[mid])/2;
  return {percentChange:median,exerciseCount:trends.length,message:`Median relative change across ${trends.length} repeatedly measured primary lift${trends.length===1?'':'s'}. Loads from different exercise variants are not treated as interchangeable.`};
}

export function cardioCoverage(activity:ActivityDose[],target=150,now=new Date()){
  const cutoff=now.getTime()-7*24*60*60*1000;
  const equivalent=activity
    .filter(a=>a.domain==='cardio'&&new Date(a.completedAt).getTime()>=cutoff)
    .reduce((sum,a)=>sum+cardioEquivalentMinutes(a.minutes||0,a.effort||'moderate'),0);
  return {equivalentMinutes:equivalent,target,coverage:target>0?Math.min(1,equivalent/target):0,remaining:Math.max(0,target-equivalent)};
}

export function assessmentDue(assessments:Assessment[],metricId:string,now=new Date(),intervalDays=42){
  const values=assessments.filter(a=>a.metricId===metricId).sort((a,b)=>new Date(b.recordedAt).getTime()-new Date(a.recordedAt).getTime());
  if(!values.length)return {due:true,daysSince:null as number|null,message:'No baseline has been recorded yet.'};
  const daysSince=Math.floor((now.getTime()-new Date(values[0].recordedAt).getTime())/(24*60*60*1000));
  return {due:daysSince>=intervalDays,daysSince,message:daysSince>=intervalDays?`Last comparable assessment was ${daysSince} days ago; a repeat test is due.`:`Last comparable assessment was ${daysSince} days ago.`};
}

export function dueAssessments(assessments:Assessment[],metricIds:string[],now=new Date(),intervalDays=42){
  return metricIds.filter(id=>assessmentDue(assessments,id,now,intervalDays).due);
}
