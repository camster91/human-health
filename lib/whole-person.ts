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
  sessionId?:string;
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
  {id:'carry',domain:'movement',name:'Loaded carry',unit:'distance/load',direction:'higher',description:'Practical work-capacity benchmark when equipment and user capability allow.'},
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
  {id:'mobility-upper-8',domain:'mobility',name:'Shoulder + thoracic mobility',minutes:8,items:['Wall slide','Thoracic rotation','Controlled shoulder circles']},
  {id:'cardio-20',domain:'cardio',name:'Easy aerobic session',minutes:20,items:['Brisk walk, cycle, row, or incline treadmill at conversational effort']},
  {id:'bodyweight-10',domain:'bodyweight',name:'Pull + push skill practice',minutes:10,items:['Current pull-up progression','Current push-up progression']},
  {id:'balance-power-10',domain:'power',name:'Power + balance primer',minutes:10,items:['Low-volume jump or fast concentric drill','Single-leg balance','Carry or locomotion drill']},
];

export type ProgressionLevel={id:string;name:string;items:string[];target:string};
export type ProgressionTrack={id:string;domain:'core'|'mobility';name:string;levels:ProgressionLevel[]};
export const progressionTracks:ProgressionTrack[]=[
  {id:'core-control',domain:'core',name:'Core control',levels:[
    {id:'base',name:'Base control',items:['Dead bug 3×6/side','Side plank 3×20–30 sec/side','Pallof press 3×8/side'],target:'Complete with steady breathing and no loss of trunk position.'},
    {id:'intermediate',name:'Anti-movement strength',items:['Dead bug 3×10/side','Long-lever side plank 3×20 sec/side','Tall-kneeling Pallof press 3×10/side'],target:'Repeat cleanly for two sessions before advancing.'},
    {id:'advanced',name:'Loaded control',items:['Ab-wheel or long-lever rollout 3×6–10','Suitcase carry 3×30–45 sec/side','Cable anti-rotation 3×10/side'],target:'Progress difficulty only while control remains consistent.'},
  ]},
  {id:'lower-mobility',domain:'mobility',name:'Hip + ankle mobility',levels:[
    {id:'base',name:'Restore range',items:['Ankle rocks 2×10/side','90/90 hip switches 2×8','Hip-flexor mobility 2×30 sec/side'],target:'Move through a comfortable, repeatable range.'},
    {id:'control',name:'Control the range',items:['Knee-over-toe ankle pulses 2×10','90/90 lift-offs 2×6/side','Cossack squat supported 2×6/side'],target:'Own the available range without forcing end positions.'},
    {id:'integrate',name:'Integrate range',items:['Deep squat hold 2×30 sec','Cossack squat 2×8/side','Split-squat mobility 2×8/side'],target:'Use mobility in loaded or athletic movement without pain.'},
  ]},
  {id:'upper-mobility',domain:'mobility',name:'Shoulder + thoracic mobility',levels:[
    {id:'base',name:'Restore motion',items:['Wall slide 2×8','Thoracic rotation 2×8/side','Controlled shoulder circles 2×5/side'],target:'Smooth motion without forcing range.'},
    {id:'control',name:'Control overhead range',items:['Wall slide lift-off 2×6','Open-book rotation 2×8/side','Light cable external rotation 2×12'],target:'Repeat overhead motion without compensating through the low back.'},
  ]},
];

export type ReadinessInput={sleep?:'poor'|'okay'|'good';fatigue?:'low'|'moderate'|'high';soreness?:'low'|'moderate'|'high';stress?:'low'|'moderate'|'high';illness?:boolean;pain?:boolean};
export type ReadinessDecision={level:'normal'|'reduced'|'recovery';volumeMultiplier:number;allowProgression:boolean;reasons:string[]};
export type ReadinessRecord={recordedAt:string;input:ReadinessInput};

export function readinessDecision(input:ReadinessInput):ReadinessDecision{
  const reasons:string[]=[];
  if(input.pain) reasons.push('Pain or unusual discomfort was reported.');
  if(input.illness) reasons.push('Illness was reported.');
  if(input.sleep==='poor') reasons.push('Sleep was poor.');
  if(input.fatigue==='high') reasons.push('Fatigue is high.');
  if(input.soreness==='high') reasons.push('Soreness is high.');
  if(input.stress==='high') reasons.push('Stress is high.');
  if(input.pain||input.illness) return {level:'recovery',volumeMultiplier:.5,allowProgression:false,reasons};
  const strain=[input.sleep==='poor',input.fatigue==='high',input.soreness==='high',input.stress==='high'].filter(Boolean).length;
  if(strain>=2) return {level:'reduced',volumeMultiplier:.7,allowProgression:false,reasons};
  if(strain===1) return {level:'reduced',volumeMultiplier:.85,allowProgression:false,reasons};
  return {level:'normal',volumeMultiplier:1,allowProgression:true,reasons};
}

export function readinessTrend(records:ReadinessRecord[],now=new Date()){
  const cutoff=now.getTime()-7*24*60*60*1000;
  const recent=records.filter(r=>new Date(r.recordedAt).getTime()>=cutoff);
  if(!recent.length)return {normal:0,reduced:0,recovery:0,message:'No readiness trend yet.'};
  const counts={normal:0,reduced:0,recovery:0};
  recent.forEach(r=>counts[readinessDecision(r.input).level]++);
  const constrained=counts.reduced+counts.recovery;
  const message=constrained>=Math.ceil(recent.length/2)
    ?'Recovery constraints have been common this week. Keep progression conservative and prioritize consistency over catching up.'
    :'Recovery has been mostly supportive of normal training this week.';
  return {...counts,message};
}

export function cardioEquivalentMinutes(minutes:number,effort:'easy'|'moderate'|'hard'){
  if(minutes<=0)return 0;
  if(effort==='hard')return minutes*2;
  if(effort==='easy')return minutes*.75;
  return minutes;
}

export type CardioSessionType='recovery'|'steady'|'intervals';
export type CardioOption={type:CardioSessionType;name:string;minutes:number;effort:'easy'|'moderate'|'hard';description:string};
export function cardioOptions(equivalentMinutes:number,target=150,readiness:'normal'|'reduced'|'recovery'='normal',availableMinutes=30):CardioOption[]{
  const remaining=Math.max(0,target-equivalentMinutes);
  if(readiness==='recovery')return [{type:'recovery',name:'Recovery aerobic',minutes:Math.min(20,availableMinutes),effort:'easy',description:'Easy conversational movement only. Stop if symptoms or unusual discomfort worsen.'}];
  const options:CardioOption[]=[
    {type:'recovery',name:'Easy aerobic',minutes:Math.min(25,availableMinutes),effort:'easy',description:'Low-fatigue walking, cycling, rowing, or incline treadmill.'},
    {type:'steady',name:'Steady aerobic',minutes:Math.min(Math.max(20,Math.min(40,remaining||30)),availableMinutes),effort:'moderate',description:'Conversational-to-moderate continuous work that builds weekly aerobic volume.'},
  ];
  if(readiness==='normal'&&availableMinutes>=15)options.push({type:'intervals',name:'Short intervals',minutes:Math.min(20,availableMinutes),effort:'hard',description:'Brief harder efforts with generous recovery. Use sparingly and avoid stacking beside unusually demanding lower-body work.'});
  return options;
}

export function cardioPrescription(equivalentMinutes:number,target=150,availableMinutes=30){
  const remaining=Math.max(0,target-equivalentMinutes);
  if(remaining===0)return {minutes:0,effort:'easy' as const,message:'Weekly aerobic target is covered. Optional easy cardio can be used for enjoyment or recovery.'};
  if(availableMinutes<=15)return {minutes:Math.min(15,availableMinutes),effort:'moderate' as const,message:`About ${Math.round(remaining)} equivalent minutes remain this week. Use a short moderate session today.`};
  const minutes=Math.min(availableMinutes,Math.max(20,Math.min(40,remaining)));
  return {minutes,effort:'moderate' as const,message:`About ${Math.round(remaining)} equivalent minutes remain this week. ${minutes} moderate minutes is a useful next dose.`};
}

export function nextSkillStep(treeId:string,currentStepId?:string){
  const tree=skillTrees.find(t=>t.id===treeId);
  if(!tree)return null;
  if(!currentStepId)return tree.steps[0];
  const index=tree.steps.findIndex(s=>s.id===currentStepId);
  if(index<0)return tree.steps[0];
  return tree.steps[Math.min(index+1,tree.steps.length-1)];
}

export type Assessment={metricId:string;value:number;recordedAt:string;note?:string};
export function latestAssessment(assessments:Assessment[],metricId:string){
  return assessments.filter(a=>a.metricId===metricId).sort((a,b)=>new Date(b.recordedAt).getTime()-new Date(a.recordedAt).getTime())[0]||null;
}
export function assessmentTrend(assessments:Assessment[],metricId:string){
  const values=assessments.filter(a=>a.metricId===metricId).sort((a,b)=>new Date(a.recordedAt).getTime()-new Date(b.recordedAt).getTime());
  if(values.length<2)return null;
  return values[values.length-1].value-values[0].value;
}

export type AthleticPlan={domain:'power'|'balance'|'movement';name:string;items:string[];reason:string};
export function athleticPlan(assessments:Assessment[],readiness:'normal'|'reduced'|'recovery'):AthleticPlan[]{
  if(readiness==='recovery')return [{domain:'balance',name:'Low-risk balance practice',items:['Supported single-leg balance 2×20–30 sec/side','Easy gait or carry pattern if comfortable'],reason:'Recovery-first mode avoids high-impact power work.'}];
  const balance=latestAssessment(assessments,'single-leg-balance')?.value||0;
  const jumpTrend=assessmentTrend(assessments,'jump');
  const plans:AthleticPlan[]=[];
  if(balance<30)plans.push({domain:'balance',name:'Balance foundation',items:['Single-leg balance 3×20–30 sec/side','Step-down control 2×6/side'],reason:'Build repeatable single-leg control before harder agility work.'});
  if(readiness==='normal')plans.push({domain:'power',name:'Low-volume power',items:['3–5 sets of 2–3 crisp jumps or explosive concentric reps','Full recovery between sets'],reason:jumpTrend!==null&&jumpTrend<0?'Recent jump benchmark is down; keep volume low and focus on quality.':'Use low fatigue and full recovery to train power without turning it into conditioning.'});
  plans.push({domain:'movement',name:'Carry + locomotion',items:['Suitcase or farmer carry 3×20–40 m','Optional controlled lateral/forward locomotion drill'],reason:'Build practical work capacity and trunk control.'});
  return plans;
}

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
