import { HistoryEntry, SessionId } from './domain';
import { ActivityDose, CardioOption } from './whole-person';

export type RecentTrainingLoad={
  lowerSets:number;
  upperSets:number;
  lowerBodySets:number;
  lowerBodyRecent:boolean;
  hoursSinceLower:number|null;
  hoursSinceAny:number|null;
  hardCardioMinutes:number;
  hoursSinceHardCardio:number|null;
  message:string;
};

export function recentTrainingLoad(history:HistoryEntry[],activity:ActivityDose[]=[],now=new Date()):RecentTrainingLoad{
  let lowerSets=0,upperSets=0; let hoursSinceLower:number|null=null; let hoursSinceAny:number|null=null; let hardCardioMinutes=0; let hoursSinceHardCardio:number|null=null;
  const completed=[...history].filter(h=>(h.status||'completed')==='completed').sort((a,b)=>new Date(b.completedAt).getTime()-new Date(a.completedAt).getTime());
  if(completed.length)hoursSinceAny=(now.getTime()-new Date(completed[0].completedAt).getTime())/36e5;
  for(const entry of completed){
    const hours=(now.getTime()-new Date(entry.completedAt).getTime())/36e5; if(hours<0||hours>48)continue;
    const sets=entry.exercises.reduce((sum,e)=>sum+e.logs.length,0);
    if(entry.session.startsWith('lower')){lowerSets+=sets;if(hoursSinceLower===null||hours<hoursSinceLower)hoursSinceLower=hours}else upperSets+=sets;
  }
  for(const dose of activity.filter(a=>a.domain==='cardio'&&a.effort==='hard')){
    const hours=(now.getTime()-new Date(dose.completedAt).getTime())/36e5; if(hours<0||hours>36)continue;
    hardCardioMinutes+=dose.minutes||0; if(hoursSinceHardCardio===null||hours<hoursSinceHardCardio)hoursSinceHardCardio=hours;
  }
  const lowerBodyRecent=hoursSinceLower!==null&&hoursSinceLower<36;
  const context:string[]=[];
  if(lowerBodyRecent)context.push(`Lower-body training was about ${Math.round(hoursSinceLower!)} hours ago (${lowerSets} logged sets).`);
  if(hoursSinceHardCardio!==null)context.push(`Hard cardio was about ${Math.round(hoursSinceHardCardio)} hours ago (${hardCardioMinutes} min in the last 36 hours).`);
  if(!context.length)context.push('No recent demanding lower-body or hard-cardio load is recorded.');
  return {lowerSets,upperSets,lowerBodySets:lowerSets,lowerBodyRecent,hoursSinceLower,hoursSinceAny,hardCardioMinutes,hoursSinceHardCardio,message:context.join(' ')};
}

export function coordinateCardio(options:CardioOption[],load:RecentTrainingLoad,readiness:'normal'|'reduced'|'recovery'){
  if(readiness==='recovery')return options.filter(o=>o.type==='recovery');
  const demandingLower=load.lowerBodyRecent&&load.lowerSets>=6;
  if(demandingLower)return options.filter(o=>o.type!=='intervals').map(o=>o.type==='steady'?{...o,description:`${o.description} Recent lower-body training is being protected, so hard intervals are deferred.`}:o);
  return options;
}

export function powerAllowed(load:RecentTrainingLoad,readiness:'normal'|'reduced'|'recovery'){
  if(readiness!=='normal')return {allowed:false,reason:'Recovery/readiness is not normal, so explosive work stays low impact.'};
  if(load.lowerBodyRecent&&load.lowerSets>=6)return {allowed:false,reason:`${load.lowerSets} lower-body sets were logged within the last 36 hours; avoid stacking extra jump fatigue.`};
  if(load.hoursSinceHardCardio!==null&&load.hoursSinceHardCardio<24&&load.hardCardioMinutes>=15)return {allowed:false,reason:`${load.hardCardioMinutes} hard cardio minutes were logged within the last 24 hours; keep athletic work low impact today.`};
  return {allowed:true,reason:'No recent lower-body or hard-cardio load currently requires power work to be deferred.'};
}

export function strengthLoadAdjustment(session:SessionId,load:RecentTrainingLoad,readiness:'normal'|'reduced'|'recovery'){
  if(readiness==='recovery')return {reduce:true,pauseProgression:true,reason:'Recovery-first readiness overrides normal strength progression.'};
  if(session.startsWith('lower')&&load.hoursSinceHardCardio!==null&&load.hoursSinceHardCardio<24&&load.hardCardioMinutes>=20)return {reduce:true,pauseProgression:true,reason:`Recent hard cardio (${load.hardCardioMinutes} min) may add lower-body fatigue. Keep the lower session conservative and do not force progression.`};
  if(readiness==='reduced')return {reduce:true,pauseProgression:true,reason:'Readiness is reduced; trim optional volume and hold load progression.'};
  return {reduce:false,pauseProgression:false,reason:'Current recent workload does not require an automatic strength reduction.'};
}
