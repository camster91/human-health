import { ActivityDose, CapabilityDomain, ReadinessDecision, SkillTree, minimumEffectiveOptions, skillTrees, weeklyTargets } from './whole-person';

export type SkillAssessment={treeId:string;stepId:string;passed:boolean;clean:boolean;pain:boolean;recordedAt:string};
export type SkillRecommendation={action:'hold'|'advance'|'regress';stepId:string;message:string};

export function recommendSkillProgression(treeId:string,currentStepId:string,assessments:SkillAssessment[]):SkillRecommendation{
  const tree=skillTrees.find(t=>t.id===treeId);
  if(!tree)return {action:'hold',stepId:currentStepId,message:'Skill tree not found.'};
  const index=Math.max(0,tree.steps.findIndex(s=>s.id===currentStepId));
  const recent=assessments.filter(a=>a.treeId===treeId&&a.stepId===currentStepId).sort((a,b)=>new Date(b.recordedAt).getTime()-new Date(a.recordedAt).getTime()).slice(0,3);
  if(recent.some(a=>a.pain))return {action:'hold',stepId:currentStepId,message:'Discomfort was reported. Hold progression and reassess rather than advancing.'};
  if(recent.length>=2&&recent.slice(0,2).every(a=>a.passed&&a.clean)){
    const next=tree.steps[Math.min(index+1,tree.steps.length-1)];
    return next.id===currentStepId?{action:'hold',stepId:currentStepId,message:'Top progression reached; improve quality or difficulty gradually.'}:{action:'advance',stepId:next.id,message:`Two clean assessments met the target. ${next.name} is the next progression.`};
  }
  if(recent.length>=2&&recent.slice(0,2).every(a=>!a.passed)&&index>0){
    const previous=tree.steps[index-1];
    return {action:'regress',stepId:previous.id,message:`The current target was missed twice. Use ${previous.name} temporarily and rebuild clean reps.`};
  }
  return {action:'hold',stepId:currentStepId,message:'Keep the current step until the target is repeatable across two clean assessments.'};
}

export type AthleticSession={id:string;name:string;domain:'power'|'balance'|'movement';minutes:number;items:string[];impact:'low'|'moderate'};
export const athleticSessions:AthleticSession[]=[
  {id:'balance-base',name:'Balance base',domain:'balance',minutes:8,impact:'low',items:['Single-leg balance 3×20–40 sec/side','Heel-to-toe walk 2×10 steps','Controlled step-down 2×6/side']},
  {id:'power-base',name:'Low-volume power',domain:'power',minutes:10,impact:'moderate',items:['Low pogo or snap-down practice 3×5','Countermovement jump 3×3 with full rest','Fast bodyweight squat 2×5']},
  {id:'movement-carry',name:'Carry + locomotion',domain:'movement',minutes:10,impact:'low',items:['Suitcase carry 3×30 sec/side','Farmer carry 3×30 sec','Backward walk or controlled march 3×30 sec']},
];

export function athleticRecommendation(options:{pain?:boolean;lowEnergy?:boolean;highImpactOkay?:boolean}){
  if(options.pain)return athleticSessions.find(s=>s.id==='balance-base')!;
  if(options.lowEnergy)return athleticSessions.find(s=>s.id==='movement-carry')!;
  if(options.highImpactOkay===false)return athleticSessions.find(s=>s.id==='balance-base')!;
  return athleticSessions.find(s=>s.id==='power-base')!;
}

export type LifeMode='normal'|'travel'|'return'|'maintenance';
export type DailyPlan={mode:LifeMode;minutes:number;domains:CapabilityDomain[];message:string;sessionIds:string[]};

export function domainDeficits(activity:ActivityDose[],now=new Date()):CapabilityDomain[]{
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-6);
  return weeklyTargets.map(target=>{
    const recent=activity.filter(a=>a.domain===target.domain&&new Date(a.completedAt)>=start);
    const minutes=recent.reduce((sum,a)=>sum+(a.minutes||0),0);
    const sessions=recent.length;
    const behind=target.minutes!==undefined?minutes<target.minutes:target.sessions!==undefined?sessions<target.sessions:false;
    return behind?target.domain:null;
  }).filter(Boolean) as CapabilityDomain[];
}

export function minimumEffectiveDay(options:{availableMinutes:number;activity:ActivityDose[];readiness:ReadinessDecision;mode?:LifeMode}):DailyPlan{
  const mode=options.mode||'normal';
  const deficits=domainDeficits(options.activity);
  if(options.readiness.level==='recovery'){
    const sessions=minimumEffectiveOptions(options.availableMinutes,['mobility']);
    return {mode,minutes:Math.min(options.availableMinutes,10),domains:['mobility'],message:'Recovery signals take priority. Keep today easy and avoid chasing missed training volume.',sessionIds:sessions.slice(0,1).map(s=>s.id)};
  }
  const modeDomains:CapabilityDomain[]=mode==='travel'?['bodyweight','cardio','mobility']:mode==='return'?['mobility','cardio','strength']:mode==='maintenance'?['strength','cardio']:deficits;
  const needs=modeDomains.filter((d,i,a)=>a.indexOf(d)===i);
  const sessions=minimumEffectiveOptions(options.availableMinutes,needs);
  const selected=sessions.slice(0,Math.max(1,Math.floor(options.availableMinutes/8)));
  return {mode,minutes:selected.reduce((sum,s)=>sum+s.minutes,0),domains:selected.map(s=>s.domain),message:mode==='return'?'Return mode: rebuild consistency and tolerance before normal progression.':mode==='travel'?'Travel mode: preserve the important patterns with the equipment and time available.':mode==='maintenance'?'Maintenance mode: preserve strength and aerobic fitness with a lower training burden.':'Use today to cover the most important current fitness gaps without trying to make up everything at once.',sessionIds:selected.map(s=>s.id)};
}

export function findSkillTree(id:string):SkillTree|undefined{return skillTrees.find(t=>t.id===id)}
