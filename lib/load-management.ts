import { HistoryEntry } from './domain';
import { CardioOption } from './whole-person';

export type RecentTrainingLoad={lowerSets:number;upperSets:number;hoursSinceLower:number|null;hoursSinceAny:number|null};

export function recentTrainingLoad(history:HistoryEntry[],now=new Date()):RecentTrainingLoad{
  const result:RecentTrainingLoad={lowerSets:0,upperSets:0,hoursSinceLower:null,hoursSinceAny:null};
  const completed=[...history].filter(h=>(h.status||'completed')==='completed').sort((a,b)=>new Date(b.completedAt).getTime()-new Date(a.completedAt).getTime());
  if(!completed.length)return result;
  result.hoursSinceAny=(now.getTime()-new Date(completed[0].completedAt).getTime())/36e5;
  for(const entry of completed){
    const hours=(now.getTime()-new Date(entry.completedAt).getTime())/36e5;
    if(hours>48)continue;
    const sets=entry.exercises.reduce((sum,e)=>sum+e.logs.length,0);
    if(entry.session.startsWith('lower')){
      result.lowerSets+=sets;
      if(result.hoursSinceLower===null||hours<result.hoursSinceLower)result.hoursSinceLower=hours;
    }else result.upperSets+=sets;
  }
  return result;
}

export function coordinateCardio(options:CardioOption[],load:RecentTrainingLoad,readiness:'normal'|'reduced'|'recovery'){
  if(readiness==='recovery')return options.filter(o=>o.type==='recovery');
  const demandingLower=load.hoursSinceLower!==null&&load.hoursSinceLower<36&&load.lowerSets>=6;
  if(demandingLower)return options.filter(o=>o.type!=='intervals').map(o=>o.type==='steady'?{...o,description:`${o.description} Recent lower-body training is being protected, so hard intervals are deferred.`}:o);
  return options;
}

export function powerAllowed(load:RecentTrainingLoad,readiness:'normal'|'reduced'|'recovery'){
  if(readiness!=='normal')return {allowed:false,reason:'Recovery/readiness is not normal, so explosive work stays low impact.'};
  if(load.hoursSinceLower!==null&&load.hoursSinceLower<36&&load.lowerSets>=6)return {allowed:false,reason:`${load.lowerSets} lower-body sets were logged within the last 36 hours; avoid stacking extra jump fatigue.`};
  return {allowed:true,reason:'No recent lower-body load or recovery signal currently requires power work to be deferred.'};
}
