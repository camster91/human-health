export type CapabilityDomain = 'strength'|'cardio'|'mobility'|'core'|'bodyweight'|'balance'|'power'|'movement'|'recovery'|'consistency';

export type CapabilityMetric = {
  id:string;
  domain:CapabilityDomain;
  name:string;
  unit:string;
  direction:'higher'|'lower'|'range';
  description:string;
};

export type ActivityDose = {
  domain:CapabilityDomain;
  minutes?:number;
  sets?:number;
  effort?:'easy'|'moderate'|'hard';
  completedAt:string;
};

export type WeeklyTarget = {
  domain:CapabilityDomain;
  minutes?:number;
  sessions?:number;
  note:string;
};

export const weeklyTargets:WeeklyTarget[] = [
  {domain:'strength',sessions:4,note:'Upper/lower strength backbone; adapt frequency when recovery or life requires it.'},
  {domain:'cardio',minutes:150,note:'Default moderate-equivalent target; user goals and clinical guidance can override.'},
  {domain:'mobility',sessions:3,note:'Short targeted sessions around current movement needs.'},
  {domain:'core',sessions:2,note:'Trunk training embedded in strength or short standalone work.'},
  {domain:'bodyweight',sessions:2,note:'Relative-strength skills such as pull-ups, push-ups and hangs.'},
];

export const capabilityMetrics:CapabilityMetric[] = [
  {id:'strength-primary',domain:'strength',name:'Primary lift trend',unit:'relative trend',direction:'higher',description:'Progress across selected compound lifts without combining unlike equipment loads.'},
  {id:'cardio-duration',domain:'cardio',name:'Weekly aerobic minutes',unit:'min/week',direction:'higher',description:'Moderate/vigorous-equivalent planned aerobic work.'},
  {id:'pullups',domain:'bodyweight',name:'Strict pull-ups',unit:'reps',direction:'higher',description:'Best controlled set or assisted progression when strict reps are not yet available.'},
  {id:'dead-hang',domain:'bodyweight',name:'Dead hang',unit:'seconds',direction:'higher',description:'Grip and shoulder-tolerance benchmark where appropriate.'},
  {id:'plank-quality',domain:'core',name:'Core progression',unit:'level',direction:'higher',description:'Progress through trunk-control variations rather than duration alone.'},
  {id:'ankle-mobility',domain:'mobility',name:'Ankle mobility',unit:'cm/quality',direction:'higher',description:'User-selected repeatable ankle benchmark.'},
  {id:'single-leg-balance',domain:'balance',name:'Single-leg balance',unit:'seconds/level',direction:'higher',description:'Repeatable balance benchmark with explicit test conditions.'},
  {id:'jump',domain:'power',name:'Jump benchmark',unit:'cm',direction:'higher',description:'Optional power benchmark; high-impact testing can be disabled.'},
];

export type SkillStep={id:string;name:string;target:string};
export type SkillTree={id:string;name:string;domain:'bodyweight';steps:SkillStep[]};

export const skillTrees:SkillTree[]=[
  {id:'pull-up',name:'Pull-up',domain:'bodyweight',steps:[
    {id:'hang',name:'Dead hang',target:'30–60 sec comfortable hold'},
    {id:'scap',name:'Scapular pull-up',target:'8–12 controlled reps'},
    {id:'assisted',name:'Assisted pull-up',target:'3 × 6–10'},
    {id:'strict',name:'Strict pull-up',target:'3 × 5–10'},
    {id:'weighted',name:'Weighted pull-up',target:'Progress load while preserving clean reps'},
  ]},
  {id:'push-up',name:'Push-up',domain:'bodyweight',steps:[
    {id:'incline',name:'Incline push-up',target:'3 × 10–15'},
    {id:'floor',name:'Floor push-up',target:'3 × 10–20'},
    {id:'tempo',name:'Tempo push-up',target:'3 × 8–15 controlled'},
    {id:'weighted',name:'Weighted/advanced push-up',target:'Progress variation safely'},
  ]},
];

export type MicroSession={id:string;domain:CapabilityDomain;name:string;minutes:number;items:string[]};
export const microSessions:MicroSession[]=[
  {id:'core-8',domain:'core',name:'Core control',minutes:8,items:['Dead bug','Side plank','Pallof press']},
  {id:'mobility-hips-8',domain:'mobility',name:'Hip + ankle mobility',minutes:8,items:['Ankle rocks','90/90 hip switches','Hip-flexor mobility']},
  {id:'cardio-20',domain:'cardio',name:'Easy aerobic session',minutes:20,items:['Brisk walk, cycle, row, or incline treadmill at conversational effort']},
  {id:'bodyweight-10',domain:'bodyweight',name:'Pull + push skill practice',minutes:10,items:['Current pull-up progression','Current push-up progression']},
];

export function weeklyMinutes(doses:ActivityDose[],domain:CapabilityDomain,now=new Date()){
  const start=new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate()-6);
  return doses.filter(d=>d.domain===domain && new Date(d.completedAt)>=start).reduce((sum,d)=>sum+(d.minutes||0),0);
}

export function targetProgress(value:number,target:number){
  if(target<=0)return 0;
  return Math.max(0,Math.min(1,value/target));
}

export function minimumEffectiveOptions(availableMinutes:number,needs:CapabilityDomain[]):MicroSession[]{
  return microSessions
    .filter(s=>s.minutes<=availableMinutes && needs.includes(s.domain))
    .sort((a,b)=>needs.indexOf(a.domain)-needs.indexOf(b.domain) || a.minutes-b.minutes);
}
